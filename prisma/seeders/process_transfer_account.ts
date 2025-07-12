import { prisma } from "@/lib/prisma";
import { TransferAccountTypes } from "@constants/enums";

export const SeedTransferProcesses = async () => {
  console.log('Starting Transfer Process seeding...');
  const seededProcesses = [];
  
  try {
    // First, get the admin user ID
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { 
          name: "admin"
        } 
      },
      select: {
        id: true,
        email: true
      }
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please run the admin user seeder first.');
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.email}`);

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

    // Get all existing user processes with pending status (prioritize admin's processes)
    const pendingProcesses = await prisma.userProcess.findMany({
      where: {
        status: "pending"
      },
      select: {
        id: true,
        user_id: true,
        process_name: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Sort to prioritize admin's processes first
    pendingProcesses.sort((a, b) => {
      if (a.user_id === adminUser.id && b.user_id !== adminUser.id) return -1;
      if (a.user_id !== adminUser.id && b.user_id === adminUser.id) return 1;
      return 0;
    });

    console.log(`Found ${pendingProcesses.length} pending user processes`);

    let processesToUse = pendingProcesses;

    if (pendingProcesses.length === 0) {
      console.log('⚠️  No pending user processes found.');
      console.log('🔄 Looking for any existing processes to convert to pending...');
      
      // Find any existing process to convert to pending
      const anyProcess = await prisma.userProcess.findFirst({
        select: {
          id: true,
          user_id: true,
          process_name: true,
          status: true
        }
      });

      if (!anyProcess) {
        console.log('❌ No user processes found in the database at all.');
        console.log('Please create at least one user process before running this seeder.');
        return;
      }

      console.log(`✅ Found process "${anyProcess.process_name || anyProcess.id}" with status "${anyProcess.status}"`);
      console.log('🔄 Converting this process to PENDING status and assigning to admin...');

      // Update the process to pending status and assign to admin user
      const updatedProcess = await prisma.userProcess.update({
        where: { id: anyProcess.id },
        data: { 
          status: "pending",
          user_id: adminUser.id  // Assign to admin user
        },
        select: {
          id: true,
          user_id: true,
          process_name: true
        }
      });

      processesToUse = [updatedProcess];
      console.log(`✅ Successfully converted process "${updatedProcess.process_name || updatedProcess.id}" to PENDING and assigned to admin user`);
    }

    // Currency types to create connections for
    const currencies = ['USD', 'MYR'];
    
    let totalConnections = 0;

    // Create connections for each process
    for (const process of processesToUse) {
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
            await prisma.userProcess_TransferAccount.create({
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
    console.log(`   - Total processes used: ${processesToUse.length}`);
    console.log(`   - Total transfer accounts: ${transferAccounts.length}`);
    console.log(`   - Total connections created: ${totalConnections}`);
    console.log(`   - Currencies: ${currencies.join(', ')}`);
    console.log(`   - Expected connections: ${processesToUse.length * transferAccounts.length * currencies.length}`);

  } catch (error) {
    console.error('❌ Error during Transfer Process seeding:', error);
    throw error;
  }
};

export default SeedTransferProcesses;