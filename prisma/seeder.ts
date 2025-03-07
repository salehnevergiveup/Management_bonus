import { PrismaClient } from "@prisma/client";
import SeedPermissions from "./seeders/permissions";
import SeedRoles from "./seeders/roles";
import {SeedAdminUser, SeedManagementUsers} from "./seeders/users";
import {SeedNotifications} from "./seeders/notifications";


const prisma = new PrismaClient();

const main = async () => {
  console.log("Running Seeders...");
  
  try {
    await SeedPermissions(); 
    await SeedRoles(); 
    await SeedAdminUser(); 
    await SeedManagementUsers(); 
    await SeedNotifications(); 


    console.log("✅ All seeders executed successfully.");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
