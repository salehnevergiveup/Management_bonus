import { PrismaClient } from "@prisma/client";
import SeedPermissions from "./seeders/permission";
import SeedRoles from "./seeders/role";
import SeedAdminUser from "./seeders/admin";

const prisma = new PrismaClient();

const main = async () => {
  console.log("Running Seeders...");
  
  try {
    await SeedPermissions(); 
    await SeedRoles(); 
    await SeedAdminUser(); 

    console.log("✅ All seeders executed successfully.");
  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
