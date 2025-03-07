import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const actions = ["view", "create", "delete", "edit"];
const models = ["players", "users", "profiles", "matches", "bonus", "processes", "requests", "transfer accounts", "notifications"];

const permissionsList = models.flatMap((model) => 
  actions.map((action) => `${model}:${action}`)
);

export const SeedPermissions = async () => {
  console.log("🌱 Seeding permissions...");

  await Promise.all(
    permissionsList.map(async (permission) => {
      await prisma.permission.upsert({
        where: { name: permission },
        update: {},
        create: { name: permission },
      });
    })
  );

  console.log("Permissions seeded.");
};

export default SeedPermissions;
