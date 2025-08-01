import {Roles}  from  "@/constants/enums"
import {prisma} from "@/lib/prisma";


export const SeedRoles = async () => {
  console.log("Seeding roles...");

  const adminRole = await prisma.role.upsert({
    where: { name: Roles.Admin },
    update: {},
    create: { name: Roles.Admin },
  });

  const managementRole = await prisma.role.upsert({
    where: { name:Roles.Management },
    update: {},
    create: { name:Roles.Management },
  });

  const permissions = await prisma.permission.findMany();

  // Attach all permissions to admin role
  const adminRolePermissions = permissions.map((p) => ({
    role_id: adminRole.id,
    permission_id: p.id,
  }));

  // Management Role Permissions
  const notAllowed = [
    "users:view", "users:edit", "users:create", "users:delete",
    "bonus:create", "bonus:delete", 
    "transfer-accounts:delete", "transfer-accounts:edit", "transfer-accounts:create",
    "matches:delete", "matches:edit", "matches:create",  
    "agent-accounts:delete", "agent-accounts:edit", "agent-accounts:create",
    "bonuses:delete", "bonuses:edit", "bonuses:create", 
    "api-keys:delete","api-keys:edit","api-keys:create","api-keys:view",
    "requests:edit",
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
