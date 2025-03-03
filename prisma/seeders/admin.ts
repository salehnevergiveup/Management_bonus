import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UserStatus } from "@/constants/userStatus";


const prisma = new PrismaClient();

export const SeedAdminUser = async () => {
  console.log("Seeding admin user...");

  const hashedPassword = await bcrypt.hash("password", 10);

  const adminRole = await prisma.role.findUnique({
    where: { name: "admin" },
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
      status:  UserStatus.ACTIVE, 
      password: hashedPassword,
      role_id: adminRole.id, 
    },
  });

  console.log("Admin user created:", adminUser.email);
};

export default SeedAdminUser;
