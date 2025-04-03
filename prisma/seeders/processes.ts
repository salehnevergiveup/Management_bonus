import {prisma} from "@/lib/prisma";


const PROCESS_STATUSES = ['pending', 'completed', 'completed', 'failed', 'failed'];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const SeedProcesses = async () => {
  console.log('Starting Process seeding...');
  
  try {
    const user1 = await prisma.user.findFirst({
      where: { username: 'user1' }
    });
    
    const user2 = await prisma.user.findFirst({
      where: { username: 'user2' }
    });
    
    const user3 = await prisma.user.findFirst({
      where: { username: 'user3' }
    });

    if (!user1 || !user2 || !user3) {
      console.error('Required users (user1, user2, user3) not found. Please create these users first.');
      throw new Error('Required users not found');
    }

    if (!user1.id || !user2.id || !user3.id) {
        console.error('Required users (user1, user2, user3) not found. Please create these users first.');
        throw new Error('Required users not found');
      }

    const processes = [];
    
    const pendingProcess = await prisma.userProcess.create({
      data: {
        user_id: user1.id,
        status: 'pending',
        progress: 0
      }
    });
    processes.push(pendingProcess);
    console.log(`Created pending process for user1: ${pendingProcess.id}`);
    
    const processingProcess = await prisma.userProcess.create({
      data: {
        user_id: user2.id,
        status: 'processing',
        progress: getRandomInt(20, 80)
      }
    });
    processes.push(processingProcess);
    console.log(`Created processing process for user2: ${processingProcess.id}`);
    
    const completedProcess = await prisma.userProcess.create({
      data: {
        user_id: user2.id,
        status: 'completed',
        progress: 100,
        end_time: new Date()
      }
    });
    processes.push(completedProcess);
    console.log(`Created completed process for user2: ${completedProcess.id}`);
    
    const failedProcess = await prisma.userProcess.create({
      data: {
        user_id: user3.id,
        status: 'failed',
        progress: getRandomInt(10, 50),
        end_time: new Date()
      }
    });
    processes.push(failedProcess);
    console.log(`Created failed process for user3: ${failedProcess.id}`);
    
    console.log(`Process seeding completed successfully! Created ${processes.length} processes.`);
    return processes;
  } catch (error) {
    console.error('Error during Process seeding:', error);
    throw error;
  }
}

export default SeedProcesses;