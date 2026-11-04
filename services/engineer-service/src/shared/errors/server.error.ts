import { ErrorObject } from '@app/response';
import { ApiError } from './api.error.js';

export class InternalServerError extends ApiError {
  readonly statusCode = 500;
  readonly errorObject: ErrorObject;

  constructor(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.errorObject = { code, message };
  }
}
