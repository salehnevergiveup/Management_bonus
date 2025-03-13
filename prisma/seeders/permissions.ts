import {prisma} from "@/lib/prisma";

const actions = ["view", "create", "delete", "edit"];
const models = ["players", "users", "profiles", "bonus", "processes", "requests", "transfer-accounts", "notifications"];

let permissionsList = models.flatMap((model) => 
  actions.map((action) => `${model}:${action}`)
);

permissionsList = permissionsList.concat([
  "matches:view", 
  "process:resume",  
  "matches:match"
]);

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
