import { PaginationData } from "./pagination-data.type";

export interface GetResponse {
  data: any[];
  success: boolean;
  pagination: PaginationData | null;
  message: string;
}
