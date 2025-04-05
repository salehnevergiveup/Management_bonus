import {prisma} from "@/lib/prisma"
import { AgentAccountStatus } from "@constants/enums"

const agentsAccounts =  [
    {username:  "wglobal5sub1",  
     password: "abc123"   
    },  

    {username: "wglobal6sub1",  
     password: "abc123"   
    } 
]

const SeedAgentAccounts = async () =>  { 

    console.log('Starting Agent Account seeding...');
    const seededAgentAccounts = []

    for(const account of agentsAccounts) {  
        const agentAccount = await prisma.agentAccount.create({  
            data:  { 
                username: account.username,  
                password: account.password,  
                status: AgentAccountStatus.NO_PROCESS
            }
           })   
        seededAgentAccounts.push(agentAccount);      
    }
     
    console.log(`Agent Account seeding completed successfully! Created ${seededAgentAccounts.length} accounts.`);

    return this; 
}


export default SeedAgentAccounts;