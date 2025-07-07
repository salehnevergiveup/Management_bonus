import { prisma } from "@/lib/prisma";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

export const SeedUserMatch = async () => {
  console.log('Starting User Match seeding...');
  
  try {
    // Path to your Excel file (assuming same structure as players.xlsx but different data)
    const filePath = path.join(process.cwd(), 'prisma/seeders/data/user_matches.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found at: ${filePath}`);
    }

    console.log(`Reading Excel file from: ${filePath}`);

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const matchData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${matchData.length} match records in Excel file`);

    // DEBUG: Show actual column names in the Excel file
    if (matchData.length > 0) {
      const firstRow = matchData[0] as any;
      console.log('\n🔍 DEBUG - Column names found in Excel:');
      Object.keys(firstRow).forEach((key, index) => {
        console.log(`   ${index + 1}. "${key}"`);
      });
      
      console.log('\n🔍 DEBUG - First row data:');
      console.log(JSON.stringify(firstRow, null, 2));
    }

    // Get the first process and update its status to pending
    const firstProcess = await prisma.userProcess.findFirst();
    if (!firstProcess) {
      throw new Error('No user process found. Please seed user processes first.');
    }

    // Update the process status to pending
    const updatedProcess = await prisma.userProcess.update({
      where: { id: firstProcess.id },
      data: { status: 'pending' }
    });

    console.log(`✅ Updated process ${updatedProcess.id} status to: ${updatedProcess.status}`);

    // Get the first bonus for all matches
    const firstBonus = await prisma.bonus.findFirst();
    if (!firstBonus) {
      console.log('⚠️  No bonus found. Matches will be created without bonus_id.');
    }

    // Get all transfer accounts for mapping
    const transferAccounts = await prisma.transferAccount.findMany({
      select: {
        id: true,
        username: true
      }
    });

    const transferAccountMap = new Map(
      transferAccounts.map(account => [account.username, account.id])
    );

    console.log(`Found ${transferAccounts.length} transfer accounts for mapping`);
    console.log(`Using process: ${updatedProcess.id} (status: ${updatedProcess.status})`);
    console.log(`Using bonus: ${firstBonus ? firstBonus.id : 'None available'}`);

    // Clean and process the match data
    const processedMatches = matchData.map((match: any) => {
      const keys = Object.keys(match);
      
      // Extract data using flexible column matching (amount is fixed to 0.01)
      let username = null;
      let transferAccountUsername = null;
      let status = null;
      let game = null;
      let currency = null;
      const amount = 0.01; // Fixed amount

      // Find columns (no need for amount since it's fixed)
      const usernameKey = keys.find(key => key.toLowerCase().includes('username') && !key.toLowerCase().includes('transfer'));
      const transferKey = keys.find(key => key.toLowerCase().includes('transfer') && key.toLowerCase().includes('username'));
      const statusKey = keys.find(key => key.toLowerCase().includes('status'));
      const gameKey = keys.find(key => key.toLowerCase().includes('game'));
      const currencyKey = keys.find(key => key.toLowerCase().includes('currency'));

      // DEBUG: Show what columns were found for first few rows
      if (keys.length > 0 && matchData.indexOf(match) < 3) {
        console.log(`\n🔍 DEBUG Row ${matchData.indexOf(match) + 1} - Column matching:`);
        console.log(`   Available keys: ${keys.join(', ')}`);
        console.log(`   Username key found: "${usernameKey}"`);
        console.log(`   Transfer key found: "${transferKey}"`);
        console.log(`   Status key found: "${statusKey}"`);
        console.log(`   Game key found: "${gameKey}"`);
        console.log(`   Currency key found: "${currencyKey}"`);
        console.log(`   Amount: Fixed to 0.01`);
      }

      if (usernameKey) username = match[usernameKey]?.toString().trim();
      if (transferKey) transferAccountUsername = match[transferKey]?.toString().trim();
      if (statusKey) status = match[statusKey]?.toString().trim() || 'pending';
      if (gameKey) game = match[gameKey]?.toString().trim();
      if (currencyKey) currency = match[currencyKey]?.toString().trim();

      return {
        username,
        transfer_account_username: transferAccountUsername,
        status,
        game,
        currency,
        amount
      };
    }).filter(match => match.username && match.transfer_account_username && match.game && match.currency);

    console.log(`Processed ${processedMatches.length} valid match records`);

    if (processedMatches.length === 0) {
      console.log('No valid match records found!');
      return { matchesCreated: 0 };
    }

    // Track statistics
    let matchesCreated = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process matches in batches
    const batchSize = 50;
    const totalBatches = Math.ceil(processedMatches.length / batchSize);

    console.log(`Processing ${processedMatches.length} matches in ${totalBatches} batches...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, processedMatches.length);
      const batch = processedMatches.slice(startIndex, endIndex);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${startIndex + 1}-${endIndex})`);

      for (const matchData of batch) {
        try {
          // Get transfer account ID
          const transferAccountId = transferAccountMap.get(matchData.transfer_account_username);
          
          if (!transferAccountId) {
            skippedCount++;
            errors.push(`Transfer account not found: ${matchData.transfer_account_username}`);
            continue;
          }

          // Create user match with all the important fields populated
          const userMatch = await prisma.match.create({
            data: {
              username: matchData.username,
              game: matchData.game,
              turnover_id: null, // nullable field
              transfer_account_id: transferAccountId, // from Excel mapping
              process_id: updatedProcess.id, // first process record (updated to pending)
              bonus_id: firstBonus?.id || null, // first bonus record (if available)
              status: matchData.status,
              amount: matchData.amount,
              currency: matchData.currency
            }
          });

          matchesCreated++;

        } catch (error) {
          errors.push(`Failed to create match for ${matchData.username}: ${error}`);
          console.error(`Error creating match for ${matchData.username}:`, error);
        }
      }

      console.log(`✓ Batch ${batchIndex + 1}: Processed ${batch.length} records`);
    }

    console.log(`\n🎉 User Match seeding completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total records in Excel: ${matchData.length}`);
    console.log(`   - Valid records processed: ${processedMatches.length}`);
    console.log(`   - Matches created: ${matchesCreated}`);
    console.log(`   - Records skipped: ${skippedCount}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors (showing first 10):`);
      errors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
    }

    // Verification
    const totalMatches = await prisma.match.count();
    console.log(`\n✅ Database verification:`);
    console.log(`   - Total matches in database: ${totalMatches}`);

    return { 
      matchesCreated, 
      skipped: skippedCount,
      errors: errors.length 
    };

  } catch (error) {
    console.error('❌ Error during User Match seeding:', error);
    throw error;
  }
};

export default SeedUserMatch;