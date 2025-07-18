import NextAuth from "next-auth";
import { authOptions } from "./provider";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };