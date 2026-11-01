import type {
  ErrorObject,
  ErrorResponse,
  ResponseMeta,
} from "./response.types.js";

export const errorResponse = (
  error: ErrorObject,
  meta: Partial<ResponseMeta> = {},
): ErrorResponse => {
  return {
    state: "error",
    error,
    data: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
};
