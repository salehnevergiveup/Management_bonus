// src/types/user.ts
import { UserStatus } from "@/constants/userStatus";
import { Roles } from "@/constants/roles";


interface Role {
  id: string
  name: string
}

export interface User {
  id: string
  name: string
  username: string
  email: string
  status: string
  phone: string | null
  profile_img: string | null
  created_at: Date
  updated_at: Date
  role_id: string
  role: Role
}