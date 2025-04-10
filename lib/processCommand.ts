import { MatchStatus, ProcessStatus,NotificationType,Roles, TransferAccountTypes} from "@constants/enums";  
import { eventEmitter } from "@/lib/eventemitter";
import { prisma } from '@/lib/prisma';
import {Bonus, TurnoverData, ExchangeRates, BonusResult} from '@/types/bonus.type' 
import {TransferAccount, Account, ResumeResult, Match, Transfer,Wallet } from '@/types/resume-data.type' 
import {functionGenerator} from "@/lib/convertStringToFunction"

const filter = async(authId: string, bonus: Bonus): Promise<BonusResult[] | null>  => {
   try{  
     const turnoverData: TurnoverData = await getTurnoverData()
     const exchangeRateData: ExchangeRates = await getExchangeRates(); 
     console.log("turnover from filter command: ", turnoverData)
     if(!turnoverData ||
        !exchangeRateData
     ) {  
        console.log("turnover data or exchange range data could not be papered"); 
        notifyAll(authId, "turnover data or exchange rate not found",NotificationType.ERROR);
        return null;

    }
    const newFunction = functionGenerator(bonus.function)
    const data = newFunction(turnoverData, exchangeRateData, bonus.baseline);  
    notifyAll(authId, "data filtering done successfully",NotificationType.SUCCESS);
    return data; 

   }catch(error) {  
    console.log("something want wrong while preparing the filtered data")
    notifyAll(authId, "turnover data or exchange rate not found",NotificationType.ERROR);
    return null; 
   }

  };

// Command to match the users 
const match = async (authId: string, collectedUsers: BonusResult[],bonusId: string, processId: string) => {  
    try {
        const createList = [];
        const players = await prisma.player.findMany();  

        const playerMap = new Map(players.map(player => [player.account_username, player.transfer_account_id]));

        for (const user of collectedUsers) {
            createList.push({  
                process_id: processId,  
                currency: user.currency,  
                amount: user.amount,
                username: user.username,  
                bonus_id:  bonusId,
                transfer_account_id: playerMap.get(user.username) || null
            });
        }

        // Batch processing
        const batchSize = 100;
        const batches = Math.ceil(createList.length / batchSize);
        
        for (let i = 0; i < batches; i++) {  
            const batchStart = i * batchSize;  
            const collectedUsersBatch = createList.slice(batchStart, batchStart + batchSize);
            console.log(`${i}-collected users for the batch: `, collectedUsersBatch);
            await prisma.$transaction(async (tx) => {  
                await tx.match.createMany({ data: collectedUsersBatch });
            });
        }

        await notifyAll(authId, "Matching process completed", NotificationType.SUCCESS);
        return true;
    } catch (error) {
        console.error("Error in match process:", error);
        await notifyAll(authId, `Error in matching process: ${error instanceof Error ? error.message : 'Unknown error'}`, NotificationType.ERROR);
        return false;
    }
}; 

// // Command to match single user
const rematchSinglePlayer = async (authId: string, matchId: string) => { 
    try {
        const match = await prisma.match.findUnique({ where: { id: matchId } });  

        if (!match || !match.username) {  
            await notifyAll(authId, `Match not found or has no username`, NotificationType.ERROR);
            return false;
        }

        const player = await prisma.player.findFirst({ where: { account_username: match.username } });

        if (!player) {
            await notifyAll(authId, `Player not found for username: ${match.username}`, NotificationType.ERROR);
            return false;
        }

        const updatedMatch = await prisma.match.update({
            where: { id: matchId },  
            data: { transfer_account_id: player.transfer_account_id }  
        });
        
        await notifyAll(
            authId, 
            `Rematching ${match.username} completed successfully`, 
            NotificationType.SUCCESS
        );
        return true;
    } catch (error) {
        console.error(`Error in rematchSinglePlayer for match ${matchId}:`, error);
        await notifyAll(
            authId, 
            `Error rematching ${matchId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            NotificationType.ERROR
        );
        return false;
    }
};

// // Command to rematch all the users 
const rematch = async (authId: string) => {  
    try {
        const matches = await prisma.match.findMany({ where: { transfer_account: null } });  
        const players = await prisma.player.findMany();  
        
        let successCount = 0;
        let failCount = 0;
        
        for (const match of matches) {

            const player = players.find((player) => player.account_username === match.username);  
            console.log(match.username); 
            if (player) {  
                try {
                    await prisma.match.update({
                        where: { id: match.id },  
                        data: { transfer_account_id: player.transfer_account_id}  
                    });
                    successCount++;
                } catch (updateError) {
                    failCount++;
                    console.error(`Failed to update match ${match.id}:`, updateError);
                }
            } else {
                failCount++;
            }
        }
        
        await notifyAll(
            authId, 
            `Rematching process completed. Updated: ${successCount}, Failed: ${failCount}`, 
            NotificationType.INFO
        );
        return { successCount, failCount };
    } catch (error) {
        console.error("Error in rematch process:", error);
        await notifyAll(authId, `Error in rematching process: ${error instanceof Error ? error.message : 'Unknown error'}`, NotificationType.ERROR);
        return { successCount: 0, failCount: 0, error };
    }
};

  // The resume function with proper TypeScript typing and enhanced debugging
const resume = async (authId: string, processId: string, matchesList: any[]): Promise<ResumeResult | null> => {
    try {
      
      // Get unique transfer account IDs
      const uniqueTransferAccountIds = [
        ...new Set(matchesList.map((match) => match.transfer_account_id))
      ].filter(Boolean) as string[];
      
      console.log("Unique transfer account IDs:", uniqueTransferAccountIds);
      console.log("Transfer account IDs in matches:", uniqueTransferAccountIds.join(", "));
      
      // Fetch ALL transfer accounts (not just the ones in the matches)
      const transferAccounts = await prisma.transferAccount.findMany({
        include: {
          parent: true
        }
      }) as TransferAccount[];
      
      console.log("Total transfer accounts fetched:", transferAccounts.length);
      
      // Create a map for quick lookup
      const accountMap = new Map<string, TransferAccount>();
      transferAccounts.forEach(account => {
        accountMap.set(account.id, account);
      });
      
      // Let's specifically log the accounts matching the ones in the image
      console.log("Looking for specific accounts:");
      ["salehtransfer01", "salehtransfer02", "salehtransfer03"].forEach(username => {
        const matchingAccount = transferAccounts.find(acc => acc.username === username);
        if (matchingAccount) {
          console.log(`Found ${username} with ID ${matchingAccount.id}, type: ${matchingAccount.type}, parent_id: ${matchingAccount.parent_id || 'None'}`);
        } else {
          console.log(`${username} NOT FOUND in database`);
        }
      });
      
      // Separate main and sub accounts
      const mainAccounts = transferAccounts.filter(account => account.type === "main_account");
      const subAccounts = transferAccounts.filter(account => 
        account.type === "sub_account" && uniqueTransferAccountIds.includes(account.id)
      );
      
      console.log("Main accounts count:", mainAccounts.length);
      console.log("Sub accounts in matches:", subAccounts.length);
      console.log("Sub account IDs:", subAccounts.map(a => a.id).join(", "));
      
      // Group matches by transfer account ID
      const matchesByAccount: Record<string, Match[]> = {};
      matchesList.forEach(match => {
        if (!match.transfer_account_id) return;
        
        if (!matchesByAccount[match.transfer_account_id]) {
          matchesByAccount[match.transfer_account_id] = [];
        }
        matchesByAccount[match.transfer_account_id].push(match as Match);
      });
      
      // Debug: Check which accounts have matches and how many
      console.log("Accounts with matches:");
      Object.keys(matchesByAccount).forEach(accountId => {
        const accountObj = accountMap.get(accountId);
        console.log(`Account ${accountObj ? accountObj.username : 'UNKNOWN'} (ID: ${accountId}) has ${matchesByAccount[accountId].length} matches`);
      });
      
      // This recursive function will find the main account parent
      const findMainAccountParent = (accountId: string, visitedIds = new Set<string>()): TransferAccount | null => {
        if (visitedIds.has(accountId)) {
          console.log(`Circular reference detected for account ${accountId}!`);
          return null; // Avoid circular references
        }
        
        const accountObj = accountMap.get(accountId);
        if (!accountObj) return null;
        
        visitedIds.add(accountId);
        
        if (accountObj.type === "main_account") {
          return accountObj;
        }
        
        if (!accountObj.parent_id) return null;
        
        return findMainAccountParent(accountObj.parent_id, visitedIds);
      };
      
      // Identify parent accounts for each sub account
      const subAccountParents = new Map<string, TransferAccount>();
      for (const subAccount of subAccounts) {
        console.log(`Finding main parent for sub-account: ${subAccount.username} (ID: ${subAccount.id})`);
        
        // Find the parent chain up to a main account using recursive function
        const mainParent = findMainAccountParent(subAccount.id);
        
        if (mainParent) {
          console.log(`  Found main parent: ${mainParent.username} (ID: ${mainParent.id})`);
          subAccountParents.set(subAccount.id, mainParent);
        } else {
          console.log(`  No main parent found for ${subAccount.username}`);
        }
      }
      
      console.log("Sub accounts with identified parents:", subAccountParents.size);
      console.log("Sub account parent relationships:");
      subAccounts.forEach(subAccount => {
        const parent = subAccountParents.get(subAccount.id);
        console.log(`  ${subAccount.username} -> Parent: ${parent ? parent.username : 'NONE'}`);
      });
      
      // Build the main accounts result structure
      const mainAccountsResult: Account[] = mainAccounts
        .map(mainAccount => {
          // Find all sub-accounts that have this main account as parent
          const childSubAccounts = subAccounts.filter(subAccount => {
            const parent = subAccountParents.get(subAccount.id);
            return parent && parent.id === mainAccount.id;
          });
          
          console.log(`Main account ${mainAccount.username} has ${childSubAccounts.length} child sub-accounts`);
          
          if (childSubAccounts.length === 0) {
            console.log(`  Skipping main account ${mainAccount.username} - no child sub-accounts`);
            return null;
          }
          
          // Group transfers by currency
          const walletsByCurrency: Record<string, Transfer[]> = {};
          
          // For each sub account, identify transfers from the main account
          childSubAccounts.forEach(subAccount => {
            const subAccountMatches = matchesByAccount[subAccount.id] || [];
            
            console.log(`  Sub-account ${subAccount.username} has ${subAccountMatches.length} matches`);
            
            subAccountMatches.forEach(match => {
              const currency = match.currency;
              
              if (!walletsByCurrency[currency]) {
                walletsByCurrency[currency] = [];
              }
              
              // Check if we already have a transfer to this sub-account for this currency
              const existingTransfer = walletsByCurrency[currency].find(
                t => t.account === subAccount.username
              );
              
              if (existingTransfer) {
                // Sum up amounts for the same account
                console.log(`    Adding ${match.amount} ${currency} to existing transfer for ${subAccount.username}`);
                existingTransfer.amount += match.amount;
              } else {
                // Add new transfer
                console.log(`    Creating new transfer of ${match.amount} ${currency} to ${subAccount.username}`);
                walletsByCurrency[currency].push({
                  account: subAccount.username,
                  amount: match.amount
                });
              }
            });
          });
          
          // Convert wallets object to array format
          const wallets: Wallet[] = Object.keys(walletsByCurrency).map(currency => ({
            currency,
            transfers: walletsByCurrency[currency]
          }));
          
          if (wallets.length === 0) {
            console.log(`  Skipping main account ${mainAccount.username} - no wallets`);
            return null;
          }
          
          console.log(`Main account ${mainAccount.username} wallets:`, JSON.stringify(wallets, null, 2));
  
          return {
            username: mainAccount.username,
            password: mainAccount.password,
            pin_code: mainAccount.pin_code,
            wallets
          };
        })
        .filter((account): account is Account => account !== null); // Type guard to filter out null values
      
      // Build the sub accounts result structure
      const subAccountsResult: Account[] = subAccounts
        .map(subAccount => {
          const subAccountMatches = matchesByAccount[subAccount.id] || [];
          
          console.log(`Processing sub-account ${subAccount.username} with ${subAccountMatches.length} matches`);
          
          if (subAccountMatches.length === 0) {
            console.log(`  Skipping sub-account ${subAccount.username} - no matches`);
            return null;
          }
          
          // Group transfers by currency and username
          const walletsByCurrency: Record<string, Transfer[]> = {};
          
          subAccountMatches.forEach(match => {
            const currency = match.currency;
            
            if (!walletsByCurrency[currency]) {
              walletsByCurrency[currency] = [];
            }
            
            // Check if we already have a transfer to this player for this currency
            const existingTransfer = walletsByCurrency[currency].find(
              t => t.account === match.username
            );
            
            if (existingTransfer) {
              // Sum up amounts for the same player
              console.log(`  Adding ${match.amount} ${currency} to existing transfer for ${match.username}`);
              existingTransfer.amount += match.amount;
            } else {
              // Add new transfer
              console.log(`  Creating new transfer of ${match.amount} ${currency} to ${match.username}`);
              walletsByCurrency[currency].push({
                account: match.username,
                amount: match.amount
              });
            }
          });
          
          // Convert wallets object to array format
          const wallets: Wallet[] = Object.keys(walletsByCurrency).map(currency => ({
            currency,
            transfers: walletsByCurrency[currency]
          }));
          
          if (wallets.length === 0) {
            console.log(`  Skipping sub-account ${subAccount.username} - no wallets`);
            return null;
          }
          
          console.log(`Sub-account ${subAccount.username} wallets:`, JSON.stringify(wallets, null, 2));
          
          return {
            username: subAccount.username,
            password: subAccount.password,
            pin_code: subAccount.pin_code,
            wallets
          };
        })
        .filter((account): account is Account => account !== null); // Type guard to filter out null values
      
      // Verify accounts in result
      console.log(`FINAL RESULTS - Main accounts: ${mainAccountsResult.length}, Sub accounts: ${subAccountsResult.length}`);
      console.log("Main account usernames:", mainAccountsResult.map(acc => acc.username).join(", "));
      console.log("Sub account usernames:", subAccountsResult.map(acc => acc.username).join(", "));
      
      // Check for missing accounts
      if (subAccountsResult.length !== Object.keys(matchesByAccount).length) {
        console.log("WARNING: Number of sub-accounts in result doesn't match the number of accounts with matches!");
        
        // Find which accounts are missing
        const accountsWithMatches = new Set(Object.keys(matchesByAccount));
        const accountsInResult = new Set(subAccountsResult.map(acc => {
          const matchingAccount = subAccounts.find(sa => sa.username === acc.username);
          return matchingAccount ? matchingAccount.id : null;
        }).filter(Boolean));
        
        console.log("Accounts with matches but missing from result:");
        for (const accountId of accountsWithMatches) {
          if (!accountsInResult.has(accountId)) {
            const matchingAccount = accountMap.get(accountId);
            console.log(`  - ${matchingAccount ? matchingAccount.username : 'UNKNOWN'} (ID: ${accountId})`);
            console.log(`    Matches: ${matchesByAccount[accountId].length}`);
            
            // Debug why this account was skipped
            console.log("    Debugging why this account was skipped:");
            
            // Check if it was found in subAccounts
            const inSubAccounts = subAccounts.some(a => a.id === accountId);
            console.log(`    In subAccounts list: ${inSubAccounts}`);
            
            // Check if it has a parent (which might affect main account grouping)
            const accountObj = accountMap.get(accountId);
            if (accountObj) {
              console.log(`    Has parent_id: ${accountObj.parent_id ? 'Yes' : 'No'}`);
              
              // Check if it has matches
              const hasMatches = matchesByAccount[accountId] && matchesByAccount[accountId].length > 0;
              console.log(`    Has matches: ${hasMatches ? 'Yes' : 'No'}`);
              
              if (hasMatches) {
                // Check if wallets were created correctly
                const matches = matchesByAccount[accountId];
                const currencies = [...new Set(matches.map(m => m.currency))];
                console.log(`    Currencies in matches: ${currencies.join(', ')}`);
              }
            }
          }
        }
      }
      
      // Construct final result
      const result: ResumeResult = {
        process_id: processId,
        main_accounts: mainAccountsResult,
        sub_accounts: subAccountsResult
      };
      
      return result;
      
    } catch (error) {
      console.error("Error in resume process:", error);
      await notifyAll(
        authId,
        `Error resuming process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        NotificationType.ERROR
      );
      return null;
    }
  };

// // Command to clear matches after process terminate 
// const terminate = async (authId: string, processId: string) => {  
//     try {
//         const deleteResult = await prisma.match.deleteMany({ 
//             where: { process_id: processId }
//         });

//         await prisma.userProcess.update({
//             where: { id: processId },
//             data: { status: ProcessStatus.FAILED }
//           });

//         await notifyAll(
//             authId, 
//             `Process shutdown complete. Deleted ${deleteResult.count} match records.`, 
//             NotificationType.INFO
//         );
//         return deleteResult.count;
//     } catch (error) {
//         console.error("Error in shutdown process:", error);
//         await notifyAll(
//             authId, 
//             `Error shutting down process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
//             NotificationType.ERROR
//         );
//         return 0;
//     }
// };

// interface UpdateList {  
//     user_name: string,
//     status: string  
// }

// // Command to update the matches and process status once the process finished 
// const update = async(authId: string, processId: string, updateList: UpdateList[]) => {
//     try {
//         const updateMap = new Map<string, string>();
//         updateList.forEach((ele) => {
//             updateMap.set(ele.user_name, ele.status);
//         });
        
//         const usernames = Array.from(updateMap.keys());
//         const batchSize = 100;
//         const batches = Math.ceil(usernames.length / batchSize);
        

        
//         for(let i = 0; i < batches; i++) {  
//             const batchStart = i * batchSize;  
//             let batchUsernames = usernames.slice(batchStart, batchStart + batchSize);
            
//             try {
//                 await prisma.$transaction(async(tx) => {
//                     const matches = await tx.match.findMany({
//                         where: {
//                             username: { in: batchUsernames },
//                             process_id: processId 
//                         },
//                         include: {
//                             player: true
//                         }
//                     });
                    
//                     for(const match of matches) {
//                         const updateStatus = updateMap.get(match.username);
                        
//                         if(!updateStatus) {
//                             continue;
//                         }
                        
//                         await tx.match.update({
//                             where: { id: match.id },
//                             data: { status: updateStatus }
//                         });
                        
//                         if(updateStatus === MatchStatus.SUCCESS && match.player_id) {
//                             await tx.player.update({  // FIXED: Added await
//                                 where: { id: match.player_id },
//                                 data: { updated_at: new Date() }
//                             });
//                         }
//                     }
//                 });
//             } catch(batchError) {
//                 // Log batch error but continue processing other batches
//                 console.error(`Error processing batch ${i+1}/${batches}:`, batchError);
                
//                 await notifyAll(
//                     authId, 
//                     `Error in batch ${i+1}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`, 
//                     NotificationType.WARNING
//                 );
//             }
//         }
        
//         const values = Array.from(updateMap.values());
//         const hasSuccess = values.includes(MatchStatus.SUCCESS);
//         const hasFailed = values.includes(MatchStatus.FAILED);
        
//         let processStatus;
//         if (hasSuccess) {
//             processStatus = hasFailed ? ProcessStatus.SEM_COMPLETED : ProcessStatus.COMPLETED;
//         } else {
//             processStatus = ProcessStatus.FAILED;
//         }
        
//         const updatedProcess = await prisma.userProcess.update({
//             where: { id: processId },
//             data: { status: processStatus }
//         });
        
//         if(updatedProcess && updatedProcess.status === ProcessStatus.COMPLETED) {
//             await terminate(authId, processId);
//         }
        
//         await notifyAll(
//             authId, 
//             `The process has been completed with status of ${updatedProcess.status}`, 
//             hasSuccess ? NotificationType.SUCCESS : NotificationType.ERROR
//         );
        
//     } catch(error) {

//         console.error("Critical error in update process:", error);
        
//         try {
//             await prisma.userProcess.update({
//                 where: { id: processId },
//                 data: { status: ProcessStatus.FAILED }
//             });
//         } catch (statusUpdateError) {
//             console.error("Failed to update process status:", statusUpdateError);
//         }
        
//         await notifyAll(
//             authId, 
//             `Critical error in update process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
//             NotificationType.ERROR
//         );
        
//     }
// };


// // Helper functions to trigger the notifications event
const notifyAll = async (authId: string, message: string, type: string) => {  
    try {
        const notification = await prisma.notification.create({
            data: {
                user_id: authId,
                message: message,
                type: type,
            },
        });

        await Promise.all([
            notifyUser(authId, notification),
            notifyAdmins(notification)
        ]);
        
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        try {
            eventEmitter.emit(authId, 'notification', {
                user_id: authId,
                message,
                type,
                created_at: new Date()
            });
        } catch (emitError) {
            console.error("Error emitting notification:", emitError);
        }
        return null;
    }
};

const notifyUser = async (authId: string, notification: any) => {  
    try {
        const user = await prisma.user.findUnique({
            where: { id: authId },
            include: { role: true }
        });  

        if (user?.role.name !== Roles.Admin && user?.id) {  
            eventEmitter.emit(user.id, 'notification', notification);
        }
    } catch (error) {
        console.error(`Error notifying user ${authId}:`, error);
    }
};

const notifyAdmins = async (notification: any) => {  
    try {
        const roleId = await prisma.role.findUnique({ where: { name: Roles.Admin } }); 
        
        if (!roleId) {
            console.error("Admin role not found");
            return;
        }

        const admins = await prisma.user.findMany({
            where: { role_id: roleId.id }
        });

        admins.forEach((admin) => {
            eventEmitter.emit(admin.id, "notification", notification);
        });
    } catch (error) {
        console.error("Error notifying admins:", error);
    }
};

export const getTurnoverData = async (): Promise<TurnoverData> => {
    const turnoverRecords = await prisma.accountTurnover.findMany({
      select: {
        username: true,
        game: true,
        currency: true,
        turnover: true,
        createdAt: true,
      },
      orderBy: {
        username: 'asc',
      },
    });
  
    const turnoverData: TurnoverData = {};
  
    for (const record of turnoverRecords) {
      const { username, game, currency, turnover, createdAt } = record;
  
      if (!turnoverData[username]) {
        turnoverData[username] = {
          username,
          games: [],
        };
      }
  
      turnoverData[username].games.push({
        game,
        currency,
        turnover: Number(turnover),
        createdAt: createdAt.toISOString(),
      });
    }
  
    return turnoverData;
};
  

export const getExchangeRates = async (): Promise<ExchangeRates> => {
    const rateRecords = await prisma.exchangeRate.findMany({
      select: {
        fromCurrency: true,
        toCurrency: true,
        rate: true,
      },
    });
  
    const exchangeRates: ExchangeRates = {};
  
    for (const record of rateRecords) {
      const { fromCurrency, toCurrency, rate } = record;
  
      if (!exchangeRates[fromCurrency]) {
        exchangeRates[fromCurrency] = {};
      }
  
      exchangeRates[fromCurrency][toCurrency] = Number(rate); 
    }
  
    return exchangeRates;
};


export const ProcessCommand = {  
    "filter": (authId: string, bonus: Bonus) =>  filter(authId, bonus),
    "match": (authId: string, collectedUsers: BonusResult[],bonusId:string, process_id: string) => match(authId, collectedUsers,bonusId, process_id),
    "rematch player": (authId: string, matchId: string) => rematchSinglePlayer(authId, matchId),  
    "rematch": (authId: string) => rematch(authId),  
    "resume": (authId: string, processId: string, matches: any[]) => resume(authId, processId, matches),  
//     "terminate": (authId: string, processId: string) => terminate(authId, processId),  
//     "update":  (authId: string, processId: string, updateList: UpdateList[]) => update(authId, processId, updateList), 
    "notify all":  (authId: string, message: string, type: string) => notifyAll(authId, message, type)
};

export default ProcessCommand;