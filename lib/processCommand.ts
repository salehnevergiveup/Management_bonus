import { PrismaClient } from "@prisma/client"; 
import { MatchStatus, ProcessStatus } from "@constants/processStatus";  
import { CollectedUsers, IncomingUser } from "@/types/collected-users";  
import { NotificationType } from "@constants/notifications";
import { eventEmitter } from "@/lib/eventemitter";
import { Roles } from "@constants/roles";  
import { IncomingMessage } from "http";

const prisma = new PrismaClient();


const filter = async (users: IncomingUser[]): Promise<CollectedUsers[]> => {
    //apply different logic here
    try {
      return users.map(user => ({
        username: user.username,
        amount: user.turnover, 
        currency: user.currency
      }));
    } catch (error) {
      console.error("Error filtering users:", error);
      return [];
    }
  };

// Command to match the users 
const match = async (authId: string, collectedUsers: CollectedUsers[], processId: string) => {  
    try {
        const createList = [];
        const players = await prisma.player.findMany();  

        const playerMap = new Map(players.map(player => [player.account_username, player.id]));

        for (const user of collectedUsers) {
            createList.push({  
                process_id: processId,  
                currency: user.currency,  
                amount: user.amount,
                username: user.username,  
                status: MatchStatus.PENDING,
                player_id: playerMap.get(user.username) || null
            });
        }

        const mapCreate = new Map(createList.map(user => [user.username, user]));
        const uniqueUsers = Array.from(mapCreate.values());

        // Batch processing
        const batchSize = 100;
        const batches = Math.ceil(uniqueUsers.length / batchSize);

        for (let i = 0; i < batches; i++) {  
            const batchStart = i * batchSize;  
            const collectedUsersBatch = uniqueUsers.slice(batchStart, batchStart + batchSize);

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

// Command to rematch all the users 
const rematch = async (authId: string) => {  
    try {
        const matches = await prisma.match.findMany({ where: { player: null } });  
        const players = await prisma.player.findMany();  
        
        let successCount = 0;
        let failCount = 0;
        
        for (const match of matches) {
            const player = players.find((player) => player.account_username === match.username);  

            if (player) {  
                try {
                    await prisma.match.update({
                        where: { id: match.id },  
                        data: { player_id: player.id }  
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

// Command to match single user
const rematchSingleUser = async (matchId: string, authId: string) => { 
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
            data: { player_id: player.id }  
        });
        
        await notifyAll(
            authId, 
            `Rematching ${match.username} completed successfully`, 
            NotificationType.SUCCESS
        );
        return true;
    } catch (error) {
        console.error(`Error in rematchSingleUser for match ${matchId}:`, error);
        await notifyAll(
            authId, 
            `Error rematching ${matchId}: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            NotificationType.ERROR
        );
        return false;
    }
};

// Command to resume paused process
const resume = async (authId: string, processId: string) => {  
    try {
        const databaseData = await prisma.transferAccount.findMany({
            where: {
                players: {
                    some: {
                        matches: { 
                            some: {}
                        }
                    }
                }
            },  
            include: {  
                players: {  
                    include: {  
                        matches: { 
                            where: {
                                status: MatchStatus.PENDING,
                                process_id: processId
                            }
                        }
                    }
                }
            }
        });
        
        const data = databaseData.map((dt) => ({  
            transfer_account: dt?.transfer_account,  
            account_username: dt?.account_username, 
            password: dt?.password,  
            users: dt.players.flatMap((player) => player.matches)
        }));  

        await notifyAll(
            authId, 
            "Data sent to the automater and process started",
            NotificationType.INFO
        );
        return data;  
    } catch (error) {
        console.error("Error in resume process:", error);
        await notifyAll(
            authId, 
            `Error resuming process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            NotificationType.ERROR
        );
        return [];
    }
};

// Command to clear matches after process terminate 
const terminate = async (authId: string, processId: string) => {  
    try {
        const deleteResult = await prisma.match.deleteMany({ 
            where: { process_id: processId }
        });

        await prisma.userProcess.update({
            where: { id: processId },
            data: { status: ProcessStatus.FAILED }
          });

        await notifyAll(
            authId, 
            `Process shutdown complete. Deleted ${deleteResult.count} match records.`, 
            NotificationType.INFO
        );
        return deleteResult.count;
    } catch (error) {
        console.error("Error in shutdown process:", error);
        await notifyAll(
            authId, 
            `Error shutting down process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            NotificationType.ERROR
        );
        return 0;
    }
};

interface UpdateList {  
    user_name: string,
    status: string  
}

// Command to update the matches and process status once the process finished 
const update = async(authId: string, processId: string, updateList: UpdateList[]) => {
    try {
        const updateMap = new Map<string, string>();
        updateList.forEach((ele) => {
            updateMap.set(ele.user_name, ele.status);
        });
        
        const usernames = Array.from(updateMap.keys());
        const batchSize = 100;
        const batches = Math.ceil(usernames.length / batchSize);
        

        
        for(let i = 0; i < batches; i++) {  
            const batchStart = i * batchSize;  
            let batchUsernames = usernames.slice(batchStart, batchStart + batchSize);
            
            try {
                await prisma.$transaction(async(tx) => {
                    const matches = await tx.match.findMany({
                        where: {
                            username: { in: batchUsernames },
                            process_id: processId 
                        },
                        include: {
                            player: true
                        }
                    });
                    
                    for(const match of matches) {
                        const updateStatus = updateMap.get(match.username);
                        
                        if(!updateStatus) {
                            continue;
                        }
                        
                        await tx.match.update({
                            where: { id: match.id },
                            data: { status: updateStatus }
                        });
                        
                        if(updateStatus === MatchStatus.SUCCESS && match.player_id) {
                            await tx.player.update({  // FIXED: Added await
                                where: { id: match.player_id },
                                data: { updated_at: new Date() }
                            });
                        }
                    }
                });
            } catch(batchError) {
                // Log batch error but continue processing other batches
                console.error(`Error processing batch ${i+1}/${batches}:`, batchError);
                
                await notifyAll(
                    authId, 
                    `Error in batch ${i+1}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`, 
                    NotificationType.WARNING
                );
            }
        }
        
        const values = Array.from(updateMap.values());
        const hasSuccess = values.includes(MatchStatus.SUCCESS);
        const hasFailed = values.includes(MatchStatus.FAILED);
        
        let processStatus;
        if (hasSuccess) {
            processStatus = hasFailed ? ProcessStatus.SEM_COMPLETED : ProcessStatus.COMPLETED;
        } else {
            processStatus = ProcessStatus.FAILED;
        }
        
        const updatedProcess = await prisma.userProcess.update({
            where: { id: processId },
            data: { status: processStatus }
        });
        
        if(updatedProcess && updatedProcess.status === ProcessStatus.COMPLETED) {
            await terminate(authId, processId);
        }
        
        await notifyAll(
            authId, 
            `The process has been completed with status of ${updatedProcess.status}`, 
            hasSuccess ? NotificationType.SUCCESS : NotificationType.ERROR
        );
        
    } catch(error) {

        console.error("Critical error in update process:", error);
        
        try {
            await prisma.userProcess.update({
                where: { id: processId },
                data: { status: ProcessStatus.FAILED }
            });
        } catch (statusUpdateError) {
            console.error("Failed to update process status:", statusUpdateError);
        }
        
        await notifyAll(
            authId, 
            `Critical error in update process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            NotificationType.ERROR
        );
        
    }
};


// Command to restart sem-completed process
// later i may use other logic 
const restart = async (authId: string, processId: string) => {  
    try {
        const databaseData = await prisma.transferAccount.findMany({
            where: {
                players: {
                    some: {
                        matches: { 
                            some: {}
                        }
                    }
                }
            },  
            include: {  
                players: {  
                    include: {  
                        matches: { 
                            where: {
                                status: MatchStatus.FAILED,
                                process_id: processId
                            }
                        }
                    }
                }
            }
        });
        
        const data = databaseData.map((dt) => ({  
            transfer_account: dt?.transfer_account,  
            account_username: dt?.account_username, 
            password: dt?.password,  
            users: dt.players.flatMap((player) => player.matches)
        }));  

        await notifyAll(
            authId, 
            "Data sent to the automater and process restart the process",
            NotificationType.INFO
        );
        return data;  
    } catch (error) {
        console.error("Error in restart process:", error);
        await notifyAll(
            authId, 
            `Error restart process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            NotificationType.ERROR
        );
        return [];
    }
};


// Helper functions to trigger the notifications event
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

export const ProcessCommand = {  
    "rematch": (authId: string) => rematch(authId),  
    "match": (authId: string, collectedUsers: CollectedUsers[], process_id: string) => match(authId, collectedUsers, process_id),
    "rematch user": (matchId: string, authId: string) => rematchSingleUser(matchId, authId),  
    "resume": (authId: string, processId: string) => resume(authId, processId),  
    "terminate": (authId: string, processId: string) => terminate(authId, processId),  
    "update":  (authId: string, processId: string, updateList: UpdateList[]) => update(authId, processId, updateList), 
    "restart": (authId: string, processId: string) => restart(authId, processId),   
    "filter": (IncomingUsers: IncomingUser[]) =>  filter(IncomingUsers)
};

export default ProcessCommand;