export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  total?: number;
  has_more?: boolean;
  page?: number;
  limit?: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: any;
  status?: number;
}

export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SortParams {
  order_by?: string;
  order_direction?: 'ASC' | 'DESC';
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}