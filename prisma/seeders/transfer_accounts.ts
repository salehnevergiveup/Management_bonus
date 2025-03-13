import {prisma} from "@/lib/prisma"

export const SeedTransferAccounts = async () => {
    
  console.log('Starting Transfer Account seeding...');
  const transferAccounts = [];

  try {
    for (let i = 1; i <= 5; i++) {
      const transferAccount = await prisma.transferAccount.create({
        data: {
          transfer_account: `account name ${i}`,
          account_username: `transfer_account_${i}`,
          password: `password${i}`,
        }
      });
      transferAccounts.push(transferAccount);
      console.log(`Created transfer account: ${transferAccount.account_username}`);
    }

    console.log(`Transfer Account seeding completed successfully! Created ${transferAccounts.length} accounts.`);
    return transferAccounts;
  } catch (error) {
    console.error('Error during Transfer Account seeding:', error);
    throw error;
  }
}

export default SeedTransferAccounts;