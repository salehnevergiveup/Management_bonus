import { MatchStatus, ProcessStatus,NotificationType,Roles, TransferAccountStatus} from "@constants/enums";  
import { eventEmitter } from "@/lib/eventemitter";
import { prisma } from '@/lib/prisma';
import {Bonus, TurnoverData, ExchangeRates, BonusResult} from '@/types/bonus.type' 
import {TransferAccount, Account, ResumeResult, Match, Transfer,Wallet } from '@/types/resume-data.type' 
import {functionGenerator} from "@/lib/convertStringToFunction"


const filter = async(authId: string, bonus: Bonus): Promise<BonusResult[] | null>  => {
   try{  
      const turnoverData: TurnoverData = await getTurnoverData()
      const exchangeRateData: ExchangeRates = await getExchangeRates(); 
      if(!turnoverData ||
          !exchangeRateData
      ) {  
          notifyAll(authId, "turnover data or exchange rate not found",NotificationType.ERROR);
          return null;

      }
      const newFunction = functionGenerator(bonus.function)
      const data = newFunction(turnoverData, exchangeRateData, bonus.baseline);  

      notifyAll(authId, "data filtering done successfully",NotificationType.SUCCESS);
      return data; 
   }catch(error) {  
    notifyAll(authId, "turnover data or exchange rate not found",NotificationType.ERROR);
    return null; 
   }

  };

  export const refilter = async (
    authId: string,
    bonus: Bonus
  )=>
  {
    try {
      await prisma.$transaction(async (tx) => {
        const matches = await tx.match.findMany({
          where: {
            bonus_id: bonus.id,
            status: {
              not: MatchStatus.SUCCESS
            }
          },
        });
        if (matches.length === 0) {
          throw new Error("No eligible matches found for refiltering");
        }
        const turnoverIds = matches.map(match => match.turnover_id);
        const processId = matches[0].process_id;  
        const turnoverData: TurnoverData = await getTurnoverData({
          id: { in: turnoverIds },  
          process_id: processId

        });
        const exchangeRates: ExchangeRates = await getExchangeRates() 
        const newFunction = functionGenerator(bonus.function);
        const bonusResults = newFunction(turnoverData, exchangeRates, bonus.baseline);

        for (const result of bonusResults) {
          const match = matches.find(m => m.turnover_id === result.turnover_id);
          if (match) {
            await tx.match.update({
              where: { id: match.id },
              data: {
                amount: result.amount,
                updated_at: new Date()
              }
            });
          }
        }
      });
      notifyAll(authId, "Refiltering completed successfully", NotificationType.SUCCESS);
    } catch (error) {
      console.error("Error in refilterMatches:", error);
      notifyAll(authId, "Error while executing the refilter function", NotificationType.ERROR);
    }
  };

  const refilterSinglePlayer = async(authId: string,bonus: Bonus, match: any ) => { 
    try {  
      await prisma.$transaction(async (tx) => {
           const turnoverId = match.turnover_id;  
           const processId = match.process_id;  

           const turnoverData: TurnoverData = await getTurnoverData({
            id: turnoverId,  
            process_id: processId
  
          });

          const exchangeRates: ExchangeRates = await getExchangeRates();

          if(!turnoverData) {  
            throw new Error("unable to find the turnover data")
          }

          const newFunction = functionGenerator(bonus.function);
          const bonusResults = newFunction(turnoverData, exchangeRates, bonus.baseline);

          if(!bonusResults) {  
            throw new Error(`unable to refilter ${match.username} match`)
          }

          await tx.match.update({ 
            where: { id: match.id },
                data: {
                  amount: bonusResults[0].amount,
                  updated_at: new Date()
                }
          })

        notifyAll(authId, "Refiltering completed successfully", NotificationType.SUCCESS);

      })
    }catch(error) {  
        notifyAll(authId, "Error while executing the refilter function", NotificationType.ERROR);
    }
  }

  const match = async (authId: string, collectedUsers: BonusResult[], bonusId: string, processId: string) => {
    try {
      // Fetch all relevant players in one query to avoid N+1 problems
      const players = await prisma.player.findMany({
        where: {
          account_username: {
            in: collectedUsers.map(user => user.username)
          }
        },
        select: {
          account_username: true,
          transfer_account_id: true
        }
      });
      
      //between the player and the transfer account 
      const playerMap = new Map(players.map(player => [player.account_username, player.transfer_account_id]));
      
      const createList = [];
      // Store transfer_account_id and currency pairs
      const transferAccountCurrencyPairs = [];
      
      for (const user of collectedUsers) {
        const transferAccountId = playerMap.get(user.username) || null;
        
        createList.push({
          process_id: processId,
          currency: user.currency,
          amount: user.amount,
          turnover_id: user.turnover_id,
          game: user.game,
          username: user.username,
          bonus_id: bonusId,
          transfer_account_id: transferAccountId,
          status: TransferAccountStatus.PENDING
        });
        
        if (transferAccountId) {
          // Store each unique combination of transfer account and currency
          transferAccountCurrencyPairs.push({
            transferAccountId: transferAccountId,
            currency: user.currency
          });
        }
      }
      
      // Remove duplicates by creating a Map with a composite key
      const uniquePairs = new Map();
      for (const pair of transferAccountCurrencyPairs) {
        const key = `${pair.transferAccountId}-${pair.currency}`;
        uniquePairs.set(key, pair);
      }
      const uniquePairsArray = Array.from(uniquePairs.values());
      
      
      // Batch processing for matches
      const batchSize = 100;
      const batches = Math.ceil(createList.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const collectedUsersBatch = createList.slice(batchStart, batchStart + batchSize);
        
        await prisma.$transaction(async (tx) => {
          await tx.match.createMany({ data: collectedUsersBatch });
        });
      }
      
      // Create entries in the pivot table with currency
      if (uniquePairsArray.length > 0) {
        
        const pivotBatchSize = 100;
        const pivotBatches = Math.ceil(uniquePairsArray.length / pivotBatchSize);
        
        for (let i = 0; i < pivotBatches; i++) {
          const batchStart = i * pivotBatchSize;
          const pairsBatch = uniquePairsArray.slice(batchStart, batchStart + pivotBatchSize);
          
          
          await prisma.$transaction(async (tx) => {
            // Create pivot table entries with progress field and currency
            const pivotData = pairsBatch.map(pair => ({
              user_process_id: processId,
              transfer_account_id: pair.transferAccountId,
              currency: pair.currency, // Include currency in the composite key
              transfer_status: TransferAccountStatus.PENDING,
              progress: 0 // Set initial progress
            }));
            
            // Use createMany to batch insert pivot entries
            await tx.userProcess_TransferAccount.createMany({
              data: pivotData,
              skipDuplicates: true
            });
          });
        }
      }
      
      await notifyAll(authId, "Matching process completed", NotificationType.SUCCESS);
      return true;
    } catch (error) {
      console.error("Error in match process:", error);
      await notifyAll(authId, `Error in matching process: ${error instanceof Error ? error.message : 'Unknown error'}`, NotificationType.ERROR);
      return false;
    }
  };
 
  const rematchSinglePlayer = async (authId: string, matchId: string) => {
    try {
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });
      
      if (!match || !match.username || !match.process_id || !match.currency) {
        await notifyAll(authId, `Match not found or has incomplete information`, NotificationType.ERROR);
        return false;
      }
      
      const player = await prisma.player.findFirst({
        where: { account_username: match.username }
      });
      
      if (!player) {
        await notifyAll(authId, `Player not found for username: ${match.username}`, NotificationType.ERROR);
        return false;
      }
      
      const processId = match.process_id;
      const currency = match.currency; // Get the currency from the match
      
      const transferAccount = await prisma.transferAccount.findUnique({
        where: { id: player.transfer_account_id }
      });
      
      if (!transferAccount) {
        await notifyAll(authId, `Transfer account not found for player: ${match.username}`, NotificationType.ERROR);
        return false;
      }
      
      await prisma.$transaction(async (tx) => {
        // Update the match with the transfer account ID
        await tx.match.update({
          where: { id: matchId },
          data: { transfer_account_id: player.transfer_account_id }
        });
        
        // Check if pivot relationship already exists - using the new composite key
        const existingRelation = await tx.userProcess_TransferAccount.findUnique({
          where: {
            // Using the updated composite primary key structure
            user_process_id_transfer_account_id_currency: {
              user_process_id: processId,
              transfer_account_id: player.transfer_account_id,
              currency: currency
            }
          }
        });
        
        if (!existingRelation) {
          // Create pivot relationship if it doesn't exist - including currency
          await tx.userProcess_TransferAccount.create({
            data: {
              user_process_id: processId,
              transfer_account_id: player.transfer_account_id,
              currency: currency, // Include currency in the creation
              transfer_status: TransferAccountStatus.PENDING,
              progress: 0
            }
          });
          
        }
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

  const rematch = async (authId: string) => {
    try {
      const matches = await prisma.match.findMany({ 
        where: { transfer_account_id: null,  status: { not: MatchStatus.SUCCESS} },
        select: {
          id: true,
          username: true,
          process_id: true,
          currency: true  // Include currency in the selection
        }
      });
      
      if (matches.length === 0) {
        await notifyAll(authId, "No matches found that require rematching", NotificationType.INFO);
        return { successCount: 0, failCount: 0 };
      }
      
      const players = await prisma.player.findMany({
        where: {
          account_username: {
            in: matches.map(match => match.username)
          }
        },
        select: {
          account_username: true,
          transfer_account_id: true
        }
      });
      
      const playerMap = new Map(
        players.map(player => [player.account_username, player.transfer_account_id])
      );
      
      // Track process-transfer account-currency relationships to create
      // Use composite key of processId-transferAccountId-currency to ensure uniqueness
      const processTransferAccountCurrencies = new Map<string, Set<string>>();
      const relationshipDetails = new Map<string, {processId: string, transferAccountId: string, currency: string}>();
      
      let successCount = 0;
      let failCount = 0;
      
      for (const match of matches) {
        const transferAccountId = playerMap.get(match.username);
        
        if (transferAccountId && match.currency) {  // Ensure match has currency
          try {
            await prisma.match.update({
              where: { id: match.id },
              data: { transfer_account_id: transferAccountId }
            });
            successCount++;
            
            // Create a composite key to track unique combinations
            const compositeKey = `${match.process_id}-${transferAccountId}-${match.currency}`;
            processTransferAccountCurrencies.set(compositeKey, new Set());
            
            // Store the details for later use
            relationshipDetails.set(compositeKey, {
              processId: match.process_id,
              transferAccountId: transferAccountId,
              currency: match.currency
            });
            
          } catch (updateError) {
            failCount++;
            console.error(`Failed to update match ${match.id}:`, updateError);
          }
        } else {
          failCount++;
        }
      }
  
      let transferAccountsUpdated = 0;
      
      // Convert the unique combinations to an array for processing
      const uniqueRelationships = Array.from(relationshipDetails.values());
      
      if (uniqueRelationships.length > 0) {
        
        // Check which combinations don't already exist
        const existingRelationships = await Promise.all(
          uniqueRelationships.map(async (rel) => {
            const exists = await prisma.userProcess_TransferAccount.findUnique({
              where: {
                user_process_id_transfer_account_id_currency: {
                  user_process_id: rel.processId,
                  transfer_account_id: rel.transferAccountId,
                  currency: rel.currency
                }
              }
            });
            return { 
              ...rel, 
              exists: !!exists 
            };
          })
        );
        
        const relationshipsToCreate = existingRelationships.filter(rel => !rel.exists);
        
        if (relationshipsToCreate.length > 0) {
          const batchSize = 100;
          const batches = Math.ceil(relationshipsToCreate.length / batchSize);
          
          for (let i = 0; i < batches; i++) {
            const batchStart = i * batchSize;
            const relationshipBatch = relationshipsToCreate.slice(batchStart, batchStart + batchSize);
            
            await prisma.$transaction(async (tx) => {
              await tx.userProcess_TransferAccount.createMany({
                data: relationshipBatch.map(rel => ({
                  user_process_id: rel.processId,
                  transfer_account_id: rel.transferAccountId,
                  currency: rel.currency,  // Include currency in the creation
                  transfer_status: TransferAccountStatus.PENDING,
                  progress: 0
                })),
                skipDuplicates: true
              });
            });
            
            transferAccountsUpdated += relationshipBatch.length;
          }
        }
      }
      
      await notifyAll(
        authId,
        `Rematching process completed. Updated matches: ${successCount}, Failed: ${failCount}, Transfer accounts updated: ${transferAccountsUpdated}`,
        NotificationType.INFO
      );
      
      return { 
        successCount, 
        failCount,
        transferAccountsUpdated
      };
    } catch (error) {
      console.error("Error in rematch process:", error);
      await notifyAll(
        authId, 
        `Error in rematching process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        NotificationType.ERROR
      );
      return { 
        successCount: 0, 
        failCount: 0, 
        transferAccountsUpdated: 0,
        error 
      };
    }
  };

  const resume = async (authId: string, processId: string, matchesList: any[]): Promise<ResumeResult | null> => {
    try {
      // Get unique transfer account IDs
      const uniqueTransferAccountIds = [
        ...new Set(matchesList.map((match) => match.transfer_account_id))
      ].filter(Boolean) as string[];
      
      // Fetch ALL transfer accounts 
      const transferAccounts = await prisma.transferAccount.findMany({
        include: {
          parent: true
        }
      }) as TransferAccount[];
      
      // Fetch all transfer account statuses from the bridge table
      const transferAccountStatuses = await prisma.userProcess_TransferAccount.findMany({
        where: {
          user_process_id: processId
        },
        select: {
          transfer_account_id: true,
          currency: true,
          transfer_status: true
        }
      });
      
      // Create status map for quick lookup
      const statusMap = new Map<string, Map<string, string>>();
      transferAccountStatuses.forEach(status => {
        if (!statusMap.has(status.transfer_account_id)) {
          statusMap.set(status.transfer_account_id, new Map<string, string>());
        }
        statusMap.get(status.transfer_account_id)?.set(status.currency, status.transfer_status);
      });
      
      // Create account map for quick lookup
      const accountMap = new Map<string, TransferAccount>();
      transferAccounts.forEach(account => {
        accountMap.set(account.id, account);
      });
      
      // Separate main and sub accounts
      const mainAccounts = transferAccounts.filter(account => account.type === "main_account");
      const subAccounts = transferAccounts.filter(account => 
        account.type === "sub_account" && uniqueTransferAccountIds.includes(account.id)
      );
      
      // Group matches by transfer account ID
      const matchesByAccount: Record<string, Match[]> = {};
      matchesList.forEach(match => {
        if (!match.transfer_account_id) return;
        
        if (!matchesByAccount[match.transfer_account_id]) {
          matchesByAccount[match.transfer_account_id] = [];
        }
        matchesByAccount[match.transfer_account_id].push(match as Match);
      });
      
      // Find main account parent function
      const findMainAccountParent = (accountId: string, visitedIds = new Set<string>()): TransferAccount | null => {
        if (visitedIds.has(accountId)) return null;
        
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
        const mainParent = findMainAccountParent(subAccount.id);
        
        if (mainParent) {
          subAccountParents.set(subAccount.id, mainParent);
        }
      }
      
      // Build the main accounts result structure
      const mainAccountsResult: Account[] = mainAccounts
        .map(mainAccount => {
          // Find all sub-accounts that have this main account as parent
          const childSubAccounts = subAccounts.filter(subAccount => {
            const parent = subAccountParents.get(subAccount.id);
            return parent && parent.id === mainAccount.id;
          });
          
          if (childSubAccounts.length === 0) {
            return null;
          }
          
          // Group transfers by currency
          const walletsByCurrency: Record<string, Transfer[]> = {};
          
          // For each sub account, identify transfers from the main account
          childSubAccounts.forEach(subAccount => {
            const subAccountMatches = matchesByAccount[subAccount.id] || [];
            
            // Get unique currencies for this sub account
            const currencies = [...new Set(subAccountMatches.map(match => match.currency))];
            
            currencies.forEach(currency => {
              // Calculate total amount for this currency
              const totalAmount = parseFloat(
                                    subAccountMatches
                                      .filter(match => match.currency === currency)
                                      .reduce((sum, match) => sum + match.amount, 0)
                                      .toFixed(2)
                                  );
              
              if (!walletsByCurrency[currency]) {
                walletsByCurrency[currency] = [];
              }
              
              // Get the transfer status from the bridge table
              const accountStatus = statusMap.get(subAccount.id)?.get(currency) || "pending";
              
              // Add new transfer with status
              walletsByCurrency[currency].push({
                account: subAccount.username,
                amount: totalAmount,
                status: accountStatus,
                username: subAccount.username, // Added this line
                password: subAccount.password 
              });
            });
          });
          
          // Convert wallets object to array format
          const wallets: Wallet[] = Object.keys(walletsByCurrency).map(currency => ({
            currency,
            transfers: walletsByCurrency[currency]
          }));
          
          if (wallets.length === 0) {
            return null;
          }
          
          return {
            username: mainAccount.username,
            password: mainAccount.password,
            pin_code: mainAccount.pin_code,
            wallets
          };
        })
        .filter((account): account is Account => account !== null);
      
      // Build the sub accounts result structure
      const subAccountsResult: Account[] = subAccounts
        .map(subAccount => {
          const subAccountMatches = matchesByAccount[subAccount.id] || [];
          
          if (subAccountMatches.length === 0) {
            return null;
          }
          
          // Group transfers by currency
          const walletsByCurrency: Record<string, Transfer[]> = {};
          
          // Get unique currencies for this sub account
          const currencies = [...new Set(subAccountMatches.map(match => match.currency))];
          
          currencies.forEach(currency => {
            if (!walletsByCurrency[currency]) {
              walletsByCurrency[currency] = [];
            }
            
            // CHANGED: Process each match individually instead of grouping by username
            subAccountMatches
              .filter(match => match.currency === currency && match.username)
              .forEach(match => {
                // Each match becomes its own transfer with its own ID
                walletsByCurrency[currency].push({
                  account: match.username,
                  amount:  parseFloat(match.amount.toFixed(2)),
                  id: match.id 
                });
              });
          });
          
          // Convert wallets object to array format
          const wallets: Wallet[] = Object.keys(walletsByCurrency).map(currency => ({
            currency,
            transfers: walletsByCurrency[currency]
          }));
          
          if (wallets.length === 0) {
            return null;
          }
          
          return {
            username: subAccount.username,
            password: subAccount.password,
            pin_code: subAccount.pin_code,
            wallets
          };
        })
        .filter((account): account is Account => account !== null);
      
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
  
  // async function update(updateProcessMatches: ProcessPayload): Promise<void> {
  //   try {
  //     const processId = updateProcessMatches.process_id;
      
  //     const accountUsernames = Object.keys(updateProcessMatches).filter(
  //       key => key !== 'process_id'
  //     );
      
  //     await prisma.$transaction(async (tx) => {
  //       for (const username of accountUsernames) {
  //         const accountData = updateProcessMatches[username];
          
  //         // Get the transfer account ID for this username
  //         const transferAccount = await tx.transferAccount.findUnique({
  //           where: { username },
  //           select: { id: true }
  //         });
          
  //         if (!transferAccount) {
  //           console.log(`Transfer account not found for username: ${username}`);
  //           continue;
  //         }
          
  //         const matchKeys = Object.keys(accountData.transfer_report);
          
  //         for (const matchKey of matchKeys) {
  //           const transferData = accountData.transfer_report[matchKey];
  //           const [playerUsername, currency] = matchKey.split('-');
            
  //           // Update the bridge table entry instead of the transfer account directly
  //           await tx.userProcess_TransferAccount.updateMany({
  //             where: {
  //               user_process_id: processId,
  //               transfer_account_id: transferAccount.id,
  //               currency: currency
  //             },
  //             data: {
  //               transfer_status: TransferAccountStatus.NO_PROCESS,
  //               progress: accountData.progress,
  //             }
  //           });
            
  //           // Note filter based on the amount and the game as well 
  //           const matches = await tx.match.findMany({
  //             where: {
  //               username: playerUsername,
  //               currency: currency,
  //               process_id: processId,
  //               transfer_account_id: transferAccount.id
  //             }
  //           });
            
  //           if (matches.length > 0) {
  //             const matchUpdatePromises = matches.map(match => {
  //               const status = accountData.transfer_report[match.username+"-"+match.currency].status; 
  //               return tx.match.update({
  //                 where: { id: match.id },
  //                 data: {
  //                   status,
  //                   updated_at: new Date()
  //                 }
  //               });
  //             });
  //             await Promise.all(matchUpdatePromises);
  //           }
  //         }
  //       }
  //     });
      
  //     console.log(`Successfully updated accounts and matches for process ${processId}`);
  //   } catch (error) {
  //     console.error(`Error updating process ${updateProcessMatches.process_id}:`, error);
  //     throw error; 
  //   }
  // }

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

export const  getTurnoverData = async (filter : any  = {} ): Promise<TurnoverData> => {
    const turnoverRecords = await prisma.accountTurnover.findMany({
      where:  filter,
      select: {
        id: true, 
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
      const { id,username, game, currency, turnover, createdAt } = record;
  
      if (!turnoverData[username]) {
        turnoverData[username] = {
          username,
          games: [],
        };
      }
  
      turnoverData[username].games.push({
        id,
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
    "refilter": (authId: string, bonus: Bonus) => refilter(authId, bonus), 
    "refilter player": (authId: string,bonus: Bonus, match: any) =>  refilterSinglePlayer(authId,bonus,  match),
    "match": (authId: string, collectedUsers: BonusResult[],bonusId:string, process_id: string) => match(authId, collectedUsers,bonusId, process_id),
    "rematch player": (authId: string, matchId: string) => rematchSinglePlayer(authId, matchId),  
    "rematch": (authId: string) => rematch(authId),  
    "resume": (authId: string, processId: string, matches: any[]) => resume(authId, processId, matches),  
    // "update": (updateProcessPayload: ProcessPayload) => update(updateProcessPayload), 
    "notify all":  (authId: string, message: string, type: string) => notifyAll(authId, message, type)
};

export default ProcessCommand;