import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SeedRequests = async () => {
  console.log('Starting Request seeding...');
  
  try {
    // Get users for seeding
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: ['User1', 'User2', 'User3']
        }
      }
    });
    
    if (users.length === 0) {
      throw new Error('No users found with usernames user1, user2, or user3. Please seed users first.');
    }
    
    console.log(`Found ${users.length} users for request creation`);

    // Get admin user for marking some requests
    const admin = await prisma.user.findFirst({
      where: {
        role: {
          name: 'admin'
        }
      }
    });

    if (!admin) {
      console.warn('No admin user found. Some requests will not have marked_admin_id.');
    }

    // Get some players to use as model references
    const players = await prisma.player.findMany({
      take: 10
    });
    
    if (players.length === 0) {
      throw new Error('No players found. Please seed players first.');
    }

    // Different request actions
    const requestActions = [
      'create',
      'update',
      'delete',
      'approve',
      'reject'
    ];

    // Model types for polymorphic relations
    const modelTypes = [
      'Player',
      'TransferAccount',
      'Match'
    ];

    // Status options
    const statuses = ['pending', 'accepted', 'rejected'];

    const requests = [];
    let count = 0;

    // Create 5 requests for each user with different statuses
    for (const user of users) {
      for (let i = 0; i < 5; i++) {
        // Pick a status based on the index to ensure distribution
        const status = statuses[i % statuses.length];
        
        // Generate random details
        const player = players[Math.floor(Math.random() * players.length)];
        const action = requestActions[Math.floor(Math.random() * requestActions.length)];
        const modelName = modelTypes[Math.floor(Math.random() * modelTypes.length)];
        const modelId = player.id; // Using player ID as a sample model ID
        
        // Create request data
        const requestData: any = {
          sender_id: user.id,
          status: status,
          message: `This is a ${status} request from ${user.username} to ${action} a ${modelName} with ID ${modelId.substring(0, 8)}...`,
          action: action,
          model_name: modelName,
          model_id: modelId
        };
        
        // Add admin ID for non-pending requests
        if (status !== 'pending' && admin) {
          requestData.marked_admin_id = admin.id;
        }
        
        const request = await prisma.request.create({
          data: requestData
        });
        
        requests.push(request);
        count++;
        
        if (count % 5 === 0) {
          console.log(`Created ${count} requests`);
        }
      }
    }

    console.log(`Request seeding completed successfully! Created ${requests.length} requests.`);
    return requests;
  } catch (error) {
    console.error('Error during Request seeding:', error);
    throw error;
  }
}

export default SeedRequests;