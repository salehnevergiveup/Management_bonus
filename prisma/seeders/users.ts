import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UserStatus } from "@/constants/userStatus";
import { Roles } from "@/constants/roles";

const prisma = new PrismaClient();

export const SeedAdminUser = async () => {
  console.log("Seeding admin user...");

  const hashedPassword = await bcrypt.hash("password", 10);

  const adminRole = await prisma.role.findUnique({
    where: { name: Roles.Admin },
  });

  if (!adminRole) {
    console.error("Admin role not found! Run the roles seeder first.");
    return;
  }

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mail.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@mail.com",
      username: "admin123",
      status: UserStatus.ACTIVE,
      password: hashedPassword,
      role_id: adminRole.id,
    },
  });

  console.log("Admin user created:", adminUser.email);
};

export const SeedManagementUsers = async () => {
  console.log("Seeding management users...");

  const hashedPassword = await bcrypt.hash("password", 10);

  const managementRole = await prisma.role.findUnique({
    where: { name: Roles.Management },
  });

  if (!managementRole) {
    console.error("Management role not found! Run the roles seeder first.");
    return;
  }

  // Loop to create 50 unique management users
  for (let i = 1; i <= 50; i++) {
    const email = `user${i}@mail.com`;
    const name = `User ${i}`;
    const username = `user${i}`;

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name,
        email,
        username,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
        role_id: managementRole.id,
      },
    });
  }

  console.log("All management users have been created.");
};
