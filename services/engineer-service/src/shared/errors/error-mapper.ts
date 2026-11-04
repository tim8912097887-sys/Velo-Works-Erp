import { ConflictApiError } from './server-conflict.error.js';
import { DomainError } from './domain.error.js';
import { ItemAlreadyExistsError } from '../../domains/items/errors/item-already-exist.error.js';
import { ItemNotFoundError } from '../../domains/items/errors/item-not-found.error.js';
import { NotFoundError } from './not-found.error.js';
import { InternalServerError } from './server.error.js';
import { ApiError } from './api.error.js';

type DomainErrorMapper = (error: DomainError) => ApiError;
type MappedDomainErrorConstructor =
  | typeof ItemNotFoundError
  | typeof ItemAlreadyExistsError;

const domainErrorMappers = new Map<
  MappedDomainErrorConstructor,
  DomainErrorMapper
>([
  [
    ItemNotFoundError,
    (error) => new NotFoundError('ITEM_NOT_FOUND', error.message),
  ],
  [
    ItemAlreadyExistsError,
    (error) => new ConflictApiError('ITEM_ALREADY_EXISTS', error.message),
  ],
]);

export function mapDomainErrorToApiError(error: DomainError): ApiError {
  for (const [ErrorType, mapError] of domainErrorMappers) {
    if (error instanceof ErrorType) {
      return mapError(error);
    }
  }

  return new InternalServerError(error.message, 'DOMAIN_ERROR');
}
