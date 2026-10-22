/** Metadata for paginated collection responses. */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Standard envelope for paginated collection endpoints. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Standard envelope for non-paginated collection endpoints (e.g. select options). */
export interface CollectionResponse<T> {
  data: T[];
}

/** Common query parameters accepted by collection endpoints. */
export interface BaseListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}
