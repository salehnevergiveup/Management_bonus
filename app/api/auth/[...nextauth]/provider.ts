// provider.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import AuthUser from "./authUser";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

const prisma = new PrismaClient();

interface CustomJWT extends JWT {
  id?: string;
  username?: string; 
  role?: string; 
  permissions?: string[]; 
}

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

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login", 
  },

  callbacks: {
    async jwt({ token, user }: { token: CustomJWT; user?: any }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.username = user.username;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: CustomJWT }) {
      if (token.id) {
        session.user = {
          id: token.id,
          name: token.name || "",
          email: token.email || "",
          username: token.username || "",
          role: token.role || "",
          permissions: token.permissions || [],
        };
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
};
