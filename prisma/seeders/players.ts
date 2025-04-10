import {prisma} from "@/lib/prisma";
import { TransferAccountTypes } from "@constants/enums";

export const SeedPlayers = async () =>  {
  console.log('Starting Player seeding...');
  
  try {
    
    const transferAccounts = await prisma.transferAccount.findMany(
     { 
        where: {
              type: TransferAccountTypes.SUB_ACCOUNT
            
        } 
    } 
    );
    
    if (transferAccounts.length === 0) {
      throw new Error('No transfer accounts found. Please seed transfer accounts first.');
    }
    
    console.log(`Found ${transferAccounts.length} transfer accounts to use for player creation`);

    const players = [];
    for (let i = 1; i <= 100; i++) {
      const transferAccount = transferAccounts[i % transferAccounts.length];
      
      const player = await prisma.player.create({
        data: {
          account_username: `player_${i}`,
          transfer_account_id: transferAccount.id
        }
      });
      players.push(player);
      
      if (i % 10 === 0) {
        console.log(`Created ${i} players`);
      }
    }

    console.log(`Player seeding completed successfully! Created ${players.length} players.`);
    return players;
  } catch (error) {
    console.error('Error during Player seeding:', error);
    throw error;
  }
}


export default SeedPlayers;