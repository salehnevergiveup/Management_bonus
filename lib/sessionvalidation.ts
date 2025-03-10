import { authOptions } from "@app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";

export async function SessionValidation() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return null;
  }
  
  const auth = session.user;
  
  if (!auth) {
    return null;
  }
  
  return auth;
}