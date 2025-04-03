import { prisma } from "@/lib/prisma";
import crypto from "crypto";


export const AutomationApiKey = async () => {
  console.log("Seeding automation API key...");

  const automationPermission = await prisma.permission.findFirst({
    where: { name: "automation"}
  });

  const refresh_apikeyPermission = await prisma.permission.findFirst({
    where: {name: "refresh-api-key"}
  })

  if (!automationPermission) {
    console.error("Automation permission not found! Run the permissions seeder first.");
    return;
  }

  if (!refresh_apikeyPermission) {
    console.error("refresh0api-key permission not found! Run the permissions seeder first.");
    return;
  }
  const token = crypto.randomBytes(32).toString("hex");
  
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const automationKey = await prisma.aPIKey.upsert({
    where: { application: "automation" },
    update: {
      expires_at: expiresAt,
      is_revoked: false
    },
    create: {
      application: "automation",
      token: token,
      expires_at: expiresAt,
      is_revoked: false
    }
  });

  await prisma.aPIKeyPermission.deleteMany({
    where: { apikey_id: automationKey.id }
  });

  await prisma.aPIKeyPermission.create({
    data: {
      apikey_id: automationKey.id,
      permission_id: automationPermission.id
    }
  });

  await prisma.aPIKeyPermission.create({
    data: {
      apikey_id: automationKey.id,
      permission_id: refresh_apikeyPermission.id
    }
  });

  if (automationKey) {
    console.log(`Automation API key ${automationKey.id} created/updated successfully.`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    
    if (token === automationKey.token) {
      console.log("------------------------------------------------------");
      console.log("IMPORTANT: SAVE THIS API KEY, IT WON'T BE SHOWN AGAIN!");
      console.log("------------------------------------------------------");
      console.log(`API Key: ${token}`);
      console.log("------------------------------------------------------");
    }
  }
};

export const seedApiKeys = async () => {
  try {
    await AutomationApiKey();
    console.log("API key seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding API keys:", error);
  }
};