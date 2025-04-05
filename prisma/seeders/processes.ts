import {prisma} from "@/lib/prisma";
import { ProcessStatus } from "@constants/enums";

const processStatusList =  Object.values(ProcessStatus).filter((process) => process !== ProcessStatus.PENDING && process !== ProcessStatus.PROCESSING)

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const SeedProcesses = async () => {
  console.log('Starting Process seeding...');
  const seededProcesses  = []; 
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
    
    const usersList =  [  
      user1,  
      user2,  
      user3
    ]
    
    const processCount = 10;  

    for(let i =1;  i  <= processCount; i++) {  

      const randomUser  = getRandomInt(0, usersList.length-1);
      const randomProcess = getRandomInt(0, processStatusList.length-1);  

      const status =  processStatusList[randomProcess];  
      const user = usersList[randomUser];  

      const process = await prisma.userProcess.create({  
        data: {  
          user_id: user.id,  
          status: status, 
          end_time: new Date() 
        }
      })
      seededProcesses.push(process)
      console.log(`Process seeding completed successfully! Created ${seededProcesses.length} processes.`);
    }
    
  } catch (error) {
    console.error('Error during Process seeding:', error);
    throw error;
  }
}

export default SeedProcesses;