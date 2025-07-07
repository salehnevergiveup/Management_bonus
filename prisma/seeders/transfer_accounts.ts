import { prisma } from "@/lib/prisma";
import { TransferAccountStatus, TransferAccountTypes } from "@constants/enums";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';

export const SeedTransferAccounts = async () => {
  console.log('Starting Transfer Account seeding...');
  const seededAccounts = [];
  
  try {
    // Path to your ODS file
    const filePath = path.join(process.cwd(), 'prisma/seeders/data/transfer_accounts.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`ODS file not found at: ${filePath}`);
    }

    console.log(`Reading ODS file from: ${filePath}`);

    // Read the ODS file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const accountsData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${accountsData.length} accounts in ODS file`);

    // Clean and process the data
    const processedAccounts = accountsData.map((account: any) => ({
      username: account.username?.toString().trim(),
      password: account.password?.toString().trim(),
      pin_code: account.pincode?.toString().trim(),
      type: account['account type']?.toString().trim().toLowerCase()
    })).filter(account => account.username && account.password && account.pin_code);

    console.log(`Processed ${processedAccounts.length} valid accounts`);

    // Remove duplicates based on username
    const uniqueAccounts = processedAccounts.filter((account, index, arr) => 
      arr.findIndex(a => a.username === account.username) === index
    );

    console.log(`Found ${uniqueAccounts.length} unique accounts after removing duplicates`);

    // Find main account
    const mainAccountData = uniqueAccounts.find(account => 
      account.type === 'main_account'
    );
    
    if (!mainAccountData) {
      throw new Error('Main account not found in ODS file');
    }

    // Create main account
    const mainAccount = await prisma.transferAccount.create({
      data: {
        username: mainAccountData.username,
        password: mainAccountData.password,
        pin_code: mainAccountData.pin_code,
        type: TransferAccountTypes.MAIN_ACCOUNT,
      }
    });
    
    seededAccounts.push(mainAccount);
    console.log(`✓ Created main account: ${mainAccount.username}`);

    // Create sub accounts
    const subAccountsData = uniqueAccounts.filter(account => 
      account.type === 'sub_account'
    );

    console.log(`Creating ${subAccountsData.length} sub accounts...`);
    
    for (const subAccountData of subAccountsData) {
      try {
        const data = {
          username: subAccountData.username,
          password: subAccountData.password,
          pin_code: subAccountData.pin_code,
          type: TransferAccountTypes.SUB_ACCOUNT,
          parent_id: mainAccount.id,
        };

        const seededAccount = await prisma.transferAccount.create({
          data
        });

        seededAccounts.push(seededAccount);
        console.log(`✓ Created sub account: ${seededAccount.username}`);
      } catch (error) {
        console.error(`✗ Failed to create sub account ${subAccountData.username}:`, error);
      }
    }

    console.log(`\n🎉 Transfer Account seeding completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total accounts created: ${seededAccounts.length}`);
    console.log(`   - Main accounts: 1`);
    console.log(`   - Sub accounts: ${seededAccounts.length - 1}`);

  } catch (error) {
    console.error('❌ Error during Transfer Account seeding:', error);
    throw error;
  }
};

export default SeedTransferAccounts;