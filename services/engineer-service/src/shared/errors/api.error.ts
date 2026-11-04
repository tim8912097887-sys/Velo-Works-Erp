import { ErrorObject } from '@app/response';

export abstract class ApiError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorObject: ErrorObject;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
