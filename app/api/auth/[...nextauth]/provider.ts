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
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: CustomJWT }) {
      if (!token.id) {
        throw new Error("Token ID is missing");
      }
      const user = await AuthUser.findByIdentifier(token.id);
      if (user) {
        session.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        };
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
};
