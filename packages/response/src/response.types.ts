export type ResponseMeta = {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SuccessResponse<T> = {
  state: "success";
  error: null;
  data: T;
  meta: ResponseMeta;
};

export type ErrorDetail = {
  field?: string;
  code: string;
  message: string;
};

export type ErrorObject = {
  code: string;
  message: string;
  details?: ErrorDetail[];
};

export type ErrorResponse = {
  state: "error";
  error: ErrorObject;
  data: null;
  meta: ResponseMeta;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
