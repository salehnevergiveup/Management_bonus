import { prisma } from "@/lib/prisma";
import { TransferAccountTypes } from "@constants/enums";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

export const SeedPlayers = async () => {
  console.log('Starting Player seeding...');
  
  try {
    // Path to your Excel file
    const filePath = path.join(process.cwd(), 'prisma/seeders/data/players.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found at: ${filePath}`);
    }

    console.log(`Reading Excel file from: ${filePath}`);

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const playersData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${playersData.length} players in Excel file`);

    // Clean and process the data
    const processedPlayers = playersData.map((player: any) => {
      const keys = Object.keys(player);
      
      // Try to find username column with multiple strategies
      let usernameValue = null;
      let transferAccountValue = null;
      
      // Strategy 1: Exact match
      if (player.username) usernameValue = player.username;
      if (player.transfer_account_username) transferAccountValue = player.transfer_account_username;
      
      // Strategy 2: Case insensitive search
      if (!usernameValue) {
        const usernameKey = keys.find(key => key.toLowerCase() === 'username');
        if (usernameKey) usernameValue = player[usernameKey];
      }
      
      if (!transferAccountValue) {
        const transferKey = keys.find(key => key.toLowerCase() === 'transfer_account_username');
        if (transferKey) transferAccountValue = player[transferKey];
      }
      
      // Strategy 3: Partial match
      if (!usernameValue) {
        const usernameKey = keys.find(key => key.toLowerCase().includes('username'));
        if (usernameKey) usernameValue = player[usernameKey];
      }
      
      if (!transferAccountValue) {
        const transferKey = keys.find(key => 
          key.toLowerCase().includes('transfer') && key.toLowerCase().includes('account')
        );
        if (transferKey) transferAccountValue = player[transferKey];
      }
      
      // Strategy 4: Try first two columns if nothing found
      if (!usernameValue && keys.length >= 1) {
        usernameValue = player[keys[0]];
      }
      
      if (!transferAccountValue && keys.length >= 2) {
        transferAccountValue = player[keys[1]];
      }
      
      return {
        username: usernameValue?.toString().trim(),
        transfer_account_username: transferAccountValue?.toString().trim()
      };
    }).filter(player => player && player.username && player.transfer_account_username);

    console.log(`Processed ${processedPlayers.length} valid players out of ${playersData.length} total records`);

    if (processedPlayers.length === 0) {
      console.log('No valid players found! Please check your Excel file format.');
      return {
        created: 0,
        skipped: 0,
        errors: 0,
        totalProcessed: 0
      };
    }

    // Get all transfer accounts to create a lookup map
    const transferAccounts = await prisma.transferAccount.findMany({
      select: {
        id: true,
        username: true
      }
    });

    if (transferAccounts.length === 0) {
      throw new Error('No transfer accounts found. Please seed transfer accounts first.');
    }

    // Create a map for quick lookup of transfer account IDs by username
    const transferAccountMap = new Map(
      transferAccounts.map(account => [account.username, account.id])
    );

    console.log(`Found ${transferAccounts.length} transfer accounts for mapping`);

    // Track statistics
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process players in batches for better performance
    const batchSize = 100;
    const totalBatches = Math.ceil(processedPlayers.length / batchSize);

    console.log(`Processing ${processedPlayers.length} players in ${totalBatches} batches...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, processedPlayers.length);
      const batch = processedPlayers.slice(startIndex, endIndex);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${startIndex + 1}-${endIndex})`);

      // Prepare batch data for insertion
      const batchData: any[] = [];

      for (const playerData of batch) {
        const transferAccountId = transferAccountMap.get(playerData.transfer_account_username);

        if (!transferAccountId) {
          skippedCount++;
          errors.push(`Transfer account not found: "${playerData.transfer_account_username}" for player: "${playerData.username}"`);
          continue;
        }

        batchData.push({
          account_username: playerData.username,
          transfer_account_id: transferAccountId
        });
      }

      // Insert batch using createMany for better performance
      if (batchData.length > 0) {
        try {
          const result = await prisma.player.createMany({
            data: batchData,
            skipDuplicates: true // Skip if username already exists
          });
          
          createdCount += result.count;
          console.log(`✓ Batch ${batchIndex + 1}: Created ${result.count} players`);
        } catch (error) {
          errorCount += batchData.length;
          console.error(`✗ Batch ${batchIndex + 1} failed:`, error);
          
          // Fallback: try creating players one by one
          console.log(`Attempting individual creation for batch ${batchIndex + 1}...`);
          for (const playerData of batchData) {
            try {
              await prisma.player.create({ data: playerData });
              createdCount++;
            } catch (individualError) {
              errorCount++;
              errors.push(`Failed to create player ${playerData.account_username}: ${individualError}`);
            }
          }
        }
      }
    }

    console.log(`\n🎉 Player seeding completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total records in Excel: ${playersData.length}`);
    console.log(`   - Valid records processed: ${processedPlayers.length}`);
    console.log(`   - Players created: ${createdCount}`);
    console.log(`   - Players skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log(`\n⚠️  First few errors:`);
      errors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
    } else if (errors.length > 10) {
      console.log(`\n⚠️  ${errors.length} errors occurred. First 10:`);
      errors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
    }

    // Verify creation
    const playerCount = await prisma.player.count();
    console.log(`\n✅ Database verification: ${playerCount} total players in database`);

    return { 
      created: createdCount, 
      skipped: skippedCount, 
      errors: errorCount,
      totalProcessed: processedPlayers.length 
    };

  } catch (error) {
    console.error('❌ Error during Player seeding:', error);
    throw error;
  }
};

export default SeedPlayers;