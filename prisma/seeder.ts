import SeedPermissions from "./seeders/permissions";
import SeedRoles from "./seeders/roles";
import {SeedAdminUser, SeedManagementUsers} from "./seeders/users";
import {SeedNotifications} from "./seeders/notifications";
import {SeedProcesses} from "./seeders/processes";
import {SeedTransferAccounts} from "./seeders/transfer_accounts";
import {SeedPlayers} from "./seeders/players";
import SeedRequests from "./seeders/request";
import { AutomationApiKey } from "./seeders/api_key";
import SeedAgentAccounts from "./seeders/agent_accounts";
import TruncateSeeder from "./seeders/truncate";
import SeedBonuses from "./seeders/bonuses";


const main = async () => {
  console.log("Running Seeders...");
  
  try {
        // await TruncateSeeder(); 
        await SeedPermissions(); 
        await SeedRoles(); 
        // await AutomationApiKey();
        await SeedAdminUser(); 
        // await SeedManagementUsers(); 
        // await SeedNotifications(); 
        // await SeedProcesses();
        // await SeedAgentAccounts(); 
        // await SeedTransferAccounts();
        // await SeedPlayers(); 
        // await SeedRequests(); 
        await SeedBonuses();

    console.log("✅ All seeders executed successfully.");
  } catch (error) {
    console.error("Seeding error:", error);
  } 
};

main();
