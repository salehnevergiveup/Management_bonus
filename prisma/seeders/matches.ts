import {prisma} from "@/lib/prisma";

const MATCH_STATUSES = ['success', 'fail', ''];
const CURRENCIES = ['USD', 'MYR'];

function getRandomFloat(min: number, max: number, decimals: number = 2): number {
  const random = Math.random() * (max - min) + min;
  return parseFloat(random.toFixed(decimals));
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export const SeedMatches = async () => {
  console.log('Starting Match seeding...');
  
  try {
    const players = await prisma.player.findMany({
      orderBy: { account_username: 'asc' },
      take: 5,
      include: {
        transferAccount: true
      }
    });
    
    if (players.length === 0) {
      throw new Error('No players found. Please seed players first.');
    }
    
    const playersWithTransferAccounts = players.filter(player => player.transferAccount);
    
    if (playersWithTransferAccounts.length === 0) {
      throw new Error('No players with transfer accounts found. Please ensure players have transfer accounts.');
    }
    
    console.log(`Found ${playersWithTransferAccounts.length} players with transfer accounts`);

    // Get any process, not specifically a pending one
    const process = await prisma.userProcess.findFirst();
    
    if (!process) {
      throw new Error('No process found. Please seed processes first.');
    }
    
    console.log(`Found process (ID: ${process.id}) to attach matches to`);

    console.log('Creating matched users...');
    let matchedCount = 0;
    
    for (let i = 1; i <= 70; i++) {
      const playerIndex = (i - 1) % playersWithTransferAccounts.length; 
      const player = playersWithTransferAccounts[playerIndex];
      
      const transferAccount = player.transferAccount;
      const amount = getRandomFloat(100, 10000);
      
      await prisma.match.create({
        data: {
          username: player.account_username,
          transfer_account_id: transferAccount?.id,
          process_id: process.id,
          amount,
          currency: getRandomElement(CURRENCIES)
        }
      });
      
      matchedCount++;
      if (matchedCount % 10 === 0) {
        console.log(`Created ${matchedCount} matched matches`);
      }
    }
    
    console.log('Creating unmatched users...');
    let unmatchedCount = 0;
    
    for (let i = 1; i <= 30; i++) {
      const amount = getRandomFloat(100, 10000);
      
      await prisma.match.create({
        data: {
          username: `unmatched_user_${i}`,
          transfer_account_id: null,
          process_id: process.id,
          amount,
          currency: getRandomElement(CURRENCIES)
        }
      });
      
      unmatchedCount++;
      if (unmatchedCount % 10 === 0) {
        console.log(`Created ${unmatchedCount} unmatched matches`);
      }
    }

    console.log(`Match seeding completed successfully! Created ${matchedCount} matched and ${unmatchedCount} unmatched matches.`);
    return { matchedCount, unmatchedCount };
  } catch (error) {
    console.error('Error during Match seeding:', error);
    throw error;
  }
}

export default SeedMatches;