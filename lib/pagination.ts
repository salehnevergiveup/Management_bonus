import { PaginationData } from "@/types/pagination-data.type";
import { PaginatedResponse } from "@/types/paginated-response.type";

export async function Pagination<T>(
  model: any,
  url: URL,
  total: number,
  queryOptions: any
): Promise<PaginatedResponse<T>> {
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const page = parseInt(url.searchParams.get("page") || "1");
  const fetchAll = url.searchParams.get("all") === "true";
  const skip = (page - 1) * limit;

  if (!fetchAll) {
    queryOptions.skip = skip;
    queryOptions.take = limit;
  }

  const data: T[] = await model.findMany(queryOptions);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const pagination: PaginationData = {
    total,
    page: fetchAll ? 1 : page,
    limit: fetchAll ? total : limit,
    totalPages: fetchAll ? 1 : totalPages,
    hasNextPage: fetchAll ? false : hasNextPage,
    hasPreviousPage: fetchAll ? false : hasPreviousPage,
  };

  return {
    data,
    pagination,
  };
}
