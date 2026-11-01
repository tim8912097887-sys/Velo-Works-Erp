import type { ResponseMeta, SuccessResponse } from "./response.types.js";

export const successResponse = <T>(
  data: T,
  meta: Partial<ResponseMeta> = {},
): SuccessResponse<T> => {
  return {
    state: "success",
    error: null,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
};
