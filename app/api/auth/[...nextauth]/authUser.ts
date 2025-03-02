import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class AuthUser {  

id: string;
name: string;
email: string;
username: string;
role: string;
permissions: string[]; 
models: string[]; 

constructor(userdata: any) {
  this.id = userdata?.id;
  this.name = userdata?.name;
  this.email = userdata?.email;
  this.username = userdata?.username;
  this.role = userdata?.role.name;
  this.permissions = userdata?.role.permissions.map(
    (perm: any) => perm.permission?.name
  );
  this.models = [...new Set(this.permissions?.map((per) => per.split(":")[1].toLocaleLowerCase()))];
}


 isA(): string  { 
    return  this.role;  
 }

 getPermissions():string[]  {  
    return this.permissions;  
 }

 getId(): string {  
    return this.id;  
 }
 
 can(permission: string):boolean
 {  
    return this.permissions.includes(permission)
 }

 canAccess(model: string): boolean   {  
   return this.models.includes(model.toLocaleLowerCase());  
 }

 //fetch the user by username or email function generate an object of the user and fetch 
 static async findByIdentifier(identifier: string): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
        {id: identifier}
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              permission: { 
                select: {
                  name: true, 
                },
              },
            },
          },
        },
      },
    },
  });

    return user ? new AuthUser(user) : null;
  }

}


export default AuthUser;  