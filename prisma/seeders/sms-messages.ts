import { prisma } from '@/lib/prisma';

export async function SeedSmsMessages() {
  console.log('🌱 Seeding SMS Messages...');

  const defaultMessages = [
    {
      endpoint: 'unclaim',
      message: `Dear {{playerId??Player}},
Claim WINBOX Extra B O N U S  credit now!

Balance: {{unclaimAmount??0}}

Claim: 
E X T R A B O N U S 8 8. com`,
      is_active: true
    },
    {
      endpoint: 'rewardreach',
      message: `Dear {{playerId??Player}},
Claim WINBOX Extra B O N U S credit now!

Claim: 
E X T R A B O N U S 8 8. com`,
      is_active: true
    }
  ];

  for (const messageData of defaultMessages) {
    try {
      // Check if an active message already exists for this endpoint
      const existingActive = await prisma.smsMessage.findFirst({
        where: {
          endpoint: messageData.endpoint,
          is_active: true
        }
      });

      if (existingActive) {
        console.log(`⏭️ Skipped ${messageData.endpoint} - active message already exists`);
        continue;
      }

      // Deactivate any existing messages for this endpoint
      await prisma.smsMessage.updateMany({
        where: {
          endpoint: messageData.endpoint
        },
        data: {
          is_active: false
        }
      });

      // Create the new active message
      await prisma.smsMessage.create({
        data: {
          endpoint: messageData.endpoint,
          message: messageData.message,
          is_active: messageData.is_active,
          created_by: 'system',
          updated_by: 'system'
        }
      });

      console.log(`✅ Created ${messageData.endpoint} message`);
    } catch (error) {
      console.error(`❌ Error creating ${messageData.endpoint} message:`, error);
    }
  }

  console.log('✅ SMS Messages seeding completed');
} 