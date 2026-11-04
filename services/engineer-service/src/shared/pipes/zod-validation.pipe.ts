import { Injectable, PipeTransform } from '@nestjs/common';
import { type ZodObject, ZodError } from 'zod';
import { BadRequestError } from '../errors/index.js';
import { ERROR_CODE, ErrorDetail } from '@app/response';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodObject) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestError(
        ERROR_CODE.VALIDATION_ERROR,
        'Validation failed',
        zodErrorFormatter(result.error),
      );
    }

    return result.data;
  }
}

function zodErrorFormatter(errors: ZodError): ErrorDetail[] {
  return errors.issues.map((issue) => ({
    code: ERROR_CODE.VALIDATION_ERROR,
    message: issue.message,
    field: issue.path.join('.'),
  }));
}
