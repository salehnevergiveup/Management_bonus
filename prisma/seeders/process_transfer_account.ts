import { prisma } from "@/lib/prisma";
import { TransferAccountTypes } from "@constants/enums";

export const SeedTransferProcesses = async () => {
  console.log('Starting Transfer Process seeding...');
  const seededProcesses = [];
  
  try {
    // Get all transfer accounts that are not main accounts
    const transferAccounts = await prisma.transferAccount.findMany({
      where: {
        type: {
          not: TransferAccountTypes.MAIN_ACCOUNT
        }
      },
      select: {
        id: true,
        username: true,
        type: true
      }
    });

    console.log(`Found ${transferAccounts.length} non-main transfer accounts`);

    if (transferAccounts.length === 0) {
      console.log('No non-main transfer accounts found. Make sure to run the transfer accounts seeder first.');
      return;
    }

    // Get all existing user processes with pending status
    const pendingProcesses = await prisma.userProcess.findMany({
      where: {
        status: "pending"
      },
      select: {
        id: true,
        user_id: true,
        process_name: true
      }
    });

    console.log(`Found ${pendingProcesses.length} pending user processes`);

    if (pendingProcesses.length === 0) {
      console.log('❌ No pending user processes found.');
      console.log('Please ensure you have pending processes in your database before running this seeder.');
      return;
    }

    // Currency types to create connections for
    const currencies = ['USD', 'MYR'];
    
    let totalConnections = 0;

    // Create connections for each pending process
    for (const process of pendingProcesses) {
      console.log(`\nCreating connections for process: ${process.process_name || process.id}`);
      
      // Create connections for each currency
      for (const currency of currencies) {
        console.log(`  Creating ${currency} connections...`);
        
        // Create connections for each non-main transfer account
        for (const transferAccount of transferAccounts) {
          try {
            // Check if connection already exists
            const existingConnection = await prisma.userProcess_TransferAccount.findUnique({
              where: {
                user_process_id_transfer_account_id_currency: {
                  user_process_id: process.id,
                  transfer_account_id: transferAccount.id,
                  currency: currency
                }
              }
            });

            if (existingConnection) {
              console.log(`    ⚠️  Connection already exists for ${transferAccount.username} (${currency})`);
              continue;
            }

            // Create new connection
            const connection = await prisma.userProcess_TransferAccount.create({
              data: {
                user_process_id: process.id,
                transfer_account_id: transferAccount.id,
                currency: currency,
                transfer_status: "pending",
                progress: 0
              }
            });

            totalConnections++;
            console.log(`    ✓ Created connection: ${transferAccount.username} (${currency})`);
            
          } catch (error) {
            console.error(`    ✗ Failed to create connection for ${transferAccount.username} (${currency}):`, error);
          }
        }
      }
    }

    console.log(`\n🎉 Transfer Process seeding completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total processes: ${pendingProcesses.length}`);
    console.log(`   - Total transfer accounts: ${transferAccounts.length}`);
    console.log(`   - Total connections created: ${totalConnections}`);
    console.log(`   - Currencies: ${currencies.join(', ')}`);
    console.log(`   - Expected connections: ${pendingProcesses.length * transferAccounts.length * currencies.length}`);

  } catch (error) {
    console.error('❌ Error during Transfer Process seeding:', error);
    throw error;
  }
};

export default SeedTransferProcesses;