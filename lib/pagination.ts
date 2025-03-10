export async function Pagination<T>(
  model: any, 
  url: URL, 
  total: number,
  queryOptions: any,
): Promise<{
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  data: T[],
  limit: number,
  page: number,
  total: number,
  skip: number
}> {
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const page = parseInt(url.searchParams.get("page") || "1");
  const fetchAll = url.searchParams.get("all") === "true";
  const skip = (page - 1) * limit;

  if (!fetchAll) {
    queryOptions.skip = skip;
    queryOptions.take = limit;
  }

  const data = await model.findMany(queryOptions);
  
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  
  return { 
    totalPages: fetchAll ? 1 : totalPages, 
    hasNextPage: fetchAll ? false : hasNextPage, 
    hasPreviousPage: fetchAll ? false : hasPreviousPage, 
    data, 
    limit: fetchAll ? total : limit, 
    page: fetchAll ? 1 : page, 
    total, 
    skip: fetchAll ? 0 : skip 
  };
}