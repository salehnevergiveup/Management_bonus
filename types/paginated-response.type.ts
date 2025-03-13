import { PaginationData } from "./pagination-data.type";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationData;
}