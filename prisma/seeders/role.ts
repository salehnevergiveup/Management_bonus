import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const SeedRoles = async () => {
  console.log("Seeding roles...");

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  const managementRole = await prisma.role.upsert({
    where: { name: "management" },
    update: {},
    create: { name: "management" },
  });

  const permissions = await prisma.permission.findMany();

  // Attach all permissions to admin role
  const adminRolePermissions = permissions.map((p) => ({
    role_id: adminRole.id,
    permission_id: p.id,
  }));

  // Management Role Permissions
  const notAllowed = [
    "user:view", "user:update", "user:create", "user:delete",
    "bonus:create", "bonus:delete"
  ];

  const managementRolePermissions = permissions
    .filter((p) => !notAllowed.includes(p.name))
    .map((p) => ({
      role_id: managementRole.id,
      permission_id: p.id,
    }));

  // Insert role-permissions into pivot table
  await prisma.rolePermission.createMany({
    data: [...adminRolePermissions, ...managementRolePermissions],
    skipDuplicates: true,
  });

  console.log("Roles and permissions assigned.");
};

export default SeedRoles;
