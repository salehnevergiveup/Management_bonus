import {prisma} from "@/lib/prisma"

class AuthUser {  

id: string;
name: string;
email: string;
username: string;
role: string;
permissions: string[]; 
picture: string;
status: string;

constructor(userdata: any) {
  this.id = userdata?.id;
  this.name = userdata?.name;
  this.email = userdata?.email;
  this.username = userdata?.username;
  this.status = userdata?.status; 
  this.role = userdata?.role.name;
  this.picture = userdata?.profile_img; 
  this.permissions = userdata?.role.permissions.map(
    (perm: any) => perm.permission?.name
  );
}



static async findByIdentifier(identifier: string): Promise<AuthUser | null> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { id: identifier },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        profile_img: true,
        status: true,
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