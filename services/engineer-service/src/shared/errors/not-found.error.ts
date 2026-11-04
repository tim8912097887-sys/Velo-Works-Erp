import { ErrorObject, ErrorDetail } from '@app/response';
import { ApiError } from './api.error.js';

export class NotFoundError extends ApiError {
  readonly statusCode = 404;
  readonly errorObject: ErrorObject;

  constructor(code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.errorObject = { code, message, details };
  }
}
