export interface RequestData {
  id: string;
  model_name: string;
  model_id: string;
  action: string;
  status: string;
  message: string;
  sender_id: string;
  marked_admin_id: string | null;
  created_at: string;
  updated_at: string;
}