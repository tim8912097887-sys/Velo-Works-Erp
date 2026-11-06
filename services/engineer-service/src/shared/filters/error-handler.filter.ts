import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { errorResponse, ErrorObject } from '@app/response';
import { ApiError, DomainError, mapDomainErrorToApiError } from '../errors/index.js';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract request details for logging context
    const ip = request.ip || request.socket.remoteAddress;
    const method = request.method;
    const path = request.url;
    const requestId = request.id || 'N/A';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorObj: ErrorObject = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
    let stack: string | undefined;

    // Resolve error type and extract error object / status code
    if (exception instanceof DomainError) {
      const apiError = mapDomainErrorToApiError(exception);
      statusCode = apiError.statusCode;
      errorObj = apiError.errorObject;
      stack = exception.stack;
    } else if (exception instanceof ApiError) {
      statusCode = exception.statusCode;
      errorObj = exception.errorObject;
      stack = exception.stack;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      stack = exception.stack;
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null && 'message' in res) {
        const msg = (res as any).message;
        errorObj = {
          code: 'HTTP_EXCEPTION',
          message: Array.isArray(msg) ? msg.join(', ') : msg,
        };
      } else {
        errorObj = {
          code: 'HTTP_EXCEPTION',
          message: exception.message,
        };
      }
    } else {
      // Unexpected / Unknown errors (e.g., TypeError, database connection loss, etc.)
      const err = exception instanceof Error ? exception : new Error(String(exception));
      stack = err.stack;
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorObj = {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message, // Kept internally for logging, but masked for client
      };
    }

    // Strict Logging Rule: Only log 500 or above errors with rich context
    if (statusCode >= 500) {
      this.logger.error({
        message: exception instanceof Error ? exception.message : 'Unknown server error',
        ip,
        errorCode: errorObj.code,
        method,
        path,
        statusCode,
        stack,
        requestId,
      });

      // Security Rule: Mask 5XX / unexpected error messages sent to the client
      errorObj = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      };
    }

    const responseBody = errorResponse(errorObj);
    response.status(statusCode).json(responseBody);
  }
}
