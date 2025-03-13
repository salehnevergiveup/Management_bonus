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
      take: 5
    });
    
    if (players.length === 0) {
      throw new Error('No players found. Please seed players first.');
    }
    
    console.log(`Found ${players.length} players to use for matched users`);

    const pendingProcess = await prisma.userProcess.findFirst({
      where: { status: 'pending' }
    });
    
    if (!pendingProcess) {
      throw new Error('No pending process found. Please seed processes first.');
    }
    
    console.log(`Found pending process (ID: ${pendingProcess.id}) to attach matches to`);

    console.log('Creating matched users...');
    let matchedCount = 0;
    
    for (let i = 1; i <= 70; i++) {
      const playerIndex = (i - 1) % players.length; 
      const player = players[playerIndex];
      const status = 'pending';
      const amount = getRandomFloat(100, 10000);
      
      await prisma.match.create({
        data: {
          username: player.account_username, 
          player_id: player.id,
          process_id: pendingProcess.id, 
          status,
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
      const status = 'pending';
      const amount = getRandomFloat(100, 10000);
      
      await prisma.match.create({
        data: {
          username: `unmatched_user_${i}`,
          player_id: null,
          process_id: pendingProcess.id, 
          status,
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