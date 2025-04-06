import {prisma} from "@/lib/prisma"
import { TransferAccountStatus, TransferAccountTypes } from "@constants/enums";

export const SeedTransferAccounts = async () => {
    
  console.log('Starting Transfer Account seeding...');
  const seededAccounts = []
  
  try {
    const mainAccount =  await prisma.transferAccount.create({
        data: {
          username: 'salehtesting123',
          password: 'abc123',
          type: TransferAccountTypes.MAIN_ACCOUNT,
          status:  TransferAccountStatus.NO_PROCESS
        }
      });
    seededAccounts.push(mainAccount);  

    const subAccounts  = [  
      {
        username: "salehtransfer01",
        password:  "abc123"

      },   
      {
        username: "salehtransfer02",
        password:  "abc123"
      },   
      {
        username: "salehtransfer03",
        password:  "abc123"
      },   
    ];  

    for(const subAccount of subAccounts)  {  

          const data  =  {         
            type:  TransferAccountTypes.SUB_ACCOUNT,  
            status:  TransferAccountStatus.NO_PROCESS,  
            parent_id: mainAccount.id,
            ...subAccount,
          }

          const seededAccount = await prisma.transferAccount.create( {  
            data 
          })

          seededAccounts.push(seededAccount)
    }

    console.log(`Transfer Account seeding completed successfully! Created ${seededAccounts.length} accounts.`);

  } catch (error) {
    console.error('Error during Transfer Account seeding:', error);
    throw error;
  }
}

export default SeedTransferAccounts;