import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AuthUser from "./authUser";
import bcrypt from "bcryptjs";
import { UserStatus } from "@/constants/enums";
import {CustomJWT} from  "@/types/custom-jwt.type"
import {prisma} from "@/lib/prisma"


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await AuthUser.findByIdentifier(credentials.identifier);
        if (!user) {
          throw new Error("User not found");
        }

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { password: true },
        });

        if (!dbUser || !(await bcrypt.compare(credentials.password, dbUser.password))) {
          throw new Error("Incorrect password");
        }

        if(user.status !== UserStatus.ACTIVE ) {  
          throw new Error(`Account is ${user.status}`);
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
          picture: user.picture,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.name = user.name;
        token.picture = "";
        token.status = user.status;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },
    
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.picture = user?.picture as string || "";/// i can't store based 64 media in the session is to larage  we have to use file server or colud service 
        session.user.status = token.status as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, 
  },

  secret: process.env.NEXTAUTH_SECRET,
  
  jwt: {
  },
};