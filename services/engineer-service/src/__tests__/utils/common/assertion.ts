import { expect } from 'vitest';

interface ApiErrorResponse {
  status: number;
  body: {
    state: string;
    data: unknown;
    error: {
      code: string;
      message: string;
      details?: Array<{
        code: string;
        field?: string;
      }>;
    };
  };
}

export function assertServerError(response: ApiErrorResponse): void {
  expect(response.status).toBe(500);
  expect(response.body.state).toBe('error');
  expect(response.body.data).toBeNull();
  expect(response.body.error).toEqual({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  });
}

export function assertValidationError(response: ApiErrorResponse, field?: string): void {
  expect(response.status).toBe(400);
  expect(response.body.state).toBe('error');
  expect(response.body.data).toBeNull();
  expect(response.body.error.code).toBe('VALIDATION_ERROR');
  expect(response.body.error.message).toBe('Validation failed');
  expect(response.body.error.details).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        ...(field ? { field } : {}),
      }),
    ]),
  );
}
