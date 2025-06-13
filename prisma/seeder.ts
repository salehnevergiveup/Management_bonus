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

const seedProduction = async () => {
  console.log("🏭 Running Production Seeders (minimal data)...");
  
  try {
    await SeedPermissions();
    await SeedRoles();
    await SeedAdminUser();
    await SeedBonuses();
    console.log("✅ Production seeders executed successfully.");
  } catch (error) {
    console.error("❌ Production seeding error:", error);
    throw error;
  }
};

const seedDevelopment = async () => {
  console.log("🧪 Running Development/UAT Seeders (full test data)...");
  
  try {
    await TruncateSeeder();
    
    await SeedPermissions();
    await SeedRoles();
    await AutomationApiKey();
    await SeedAdminUser();
    await SeedManagementUsers();
    await SeedNotifications();
    await SeedProcesses();
    await SeedAgentAccounts();
    await SeedTransferAccounts();
    await SeedPlayers();
    await SeedRequests();
    await SeedBonuses();
    console.log("✅ Development/UAT seeders executed successfully.");
  } catch (error) {
    console.error("❌ Development seeding error:", error);
    throw error;
  }
};

const main = async () => {
  const environment = process.env.NODE_ENV?.toLowerCase() || 'development';
  
  console.log(`🌱 Seeding database for environment: ${environment}`);
  
  try {
    switch (environment) {
      case 'production':
      case 'prod':
        await seedProduction();
        break;
        
      case 'staging':
      case 'uat':
        console.log("🧪 UAT environment detected - using development seeding strategy");
        await seedDevelopment();
        break;
        
      case 'development':
      case 'dev':
      default:
        await seedDevelopment();
        break;
    }
    
    console.log(`🎉 Seeding completed successfully for ${environment} environment!`);
    
  } catch (error) {
    console.error(`💥 Seeding failed for ${environment} environment:`, error);
    process.exit(1);
  }
};

main();