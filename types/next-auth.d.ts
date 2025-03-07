import NextAuth from "next-auth";

declare module "next-auth" {
 
  interface User {
    username?: string;
    role?: string;
    status?: string;
    picture?: string;
    permissions?: string[];
  }


  interface Session {
    user: {
      id: string;
      name: string;
      picture: string;
      email: string;
      status: string;  
      username: string;
      role: string;
      permissions: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: string;
    status?: string;
    permissions?: string[];
  }
}