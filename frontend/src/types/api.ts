export type PaginatedResponse<T> = {
  items: T[];
  limit: number;
  offset: number;
  total: number;
};

