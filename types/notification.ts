import { User } from "./user"

export interface Notification {
  id: string
  user_id: string
  user?: User
  message: string
  type: string
  status: string
  createdAt: Date
  updated_at?: Date
}
