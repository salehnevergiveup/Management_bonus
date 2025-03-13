import { JWT } from "next-auth/jwt";

export interface CustomJWT extends JWT {
  id?: string;
  name?: string;
  email?: string;
  picture?: string;
  status?: string;
  username?: string;
  role?: string;
  permissions?: string[];
}
