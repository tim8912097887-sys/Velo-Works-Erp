import { ConflictApiError } from './server-conflict.error.js';
import { DomainError } from './domain.error.js';
import { ItemAlreadyExistsError } from '../../domains/items/errors/item-already-exist.error.js';
import { ItemNotFoundError } from '../../domains/items/errors/item-not-found.error.js';
import { NotFoundError } from './not-found.error.js';
import { InternalServerError } from './server.error.js';
import { ApiError } from './api.error.js';
import { BomRevisionAlreadyExistsError } from '../../domains/boms/errors/bom-revision-already-exists.error.js';
import { BomRevisionNotDraftError } from '../../domains/boms/errors/bom-revision-not-draft.error.js';
import { BomRevisionNotFoundError } from '../../domains/boms/errors/bom-revision-not-found.error.js';
import { BomSelfReferenceError } from '../../domains/boms/errors/bom-self-reference.error.js';
import { ComponentItemInactiveError } from '../../domains/boms/errors/component-item-inactive.error.js';
import { ComponentItemNotFoundError } from '../../domains/boms/errors/component-item-not-found.error.js';
import { InvalidBomComponentTypeError } from '../../domains/boms/errors/invalid-bom-component-type.error.js';
import { BadRequestError } from './bad-request.error.js';
import { ItemNotActiveError } from '../../domains/items/errors/item-not-active.error.js';
import { InvalidBomHeaderError } from '../../domains/boms/errors/invalid-bom-header.error.js';
import { BomRevisionAlreadyInUseError } from '../../domains/boms/errors/bom-revision-already-in-use.error.js';
import { ItemAlreadyActivateError } from '../../domains/items/errors/item-already-activate.error.js';
import { ItemAlreadyInActivateError } from '../../domains/items/errors/item-already-in-activate.error.js';
import { ItemCodeAlreadyExistError } from '../../domains/items/errors/item-code-already-exist.error.js';
import { ItemAlreadyInUseError } from '../../domains/items/errors/item-already-in-use.error.js';

type DomainErrorMapper = (error: DomainError) => ApiError;
type MappedDomainErrorConstructor =
  | typeof ItemNotFoundError
  | typeof ItemAlreadyExistsError
  | typeof BomRevisionAlreadyExistsError
  | typeof BomRevisionNotDraftError
  | typeof BomRevisionNotFoundError
  | typeof BomSelfReferenceError
  | typeof ComponentItemInactiveError
  | typeof ComponentItemNotFoundError
  | typeof InvalidBomComponentTypeError
  | typeof ItemNotActiveError
  | typeof InvalidBomHeaderError
  | typeof BomRevisionAlreadyInUseError
  | typeof ItemAlreadyActivateError
  | typeof ItemAlreadyInActivateError
  | typeof ItemCodeAlreadyExistError
  | typeof ItemAlreadyInUseError;

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
  [
    ItemCodeAlreadyExistError,
    (error) => new ConflictApiError('ITEM_ALREADY_EXISTS', error.message),
  ],
  [
    ItemAlreadyInUseError,
    (error) => new ConflictApiError('ITEM_ALREADY_IN_USE', error.message),
  ],
  [
    ItemAlreadyActivateError,
    (error) => new ConflictApiError('ITEM_ALREADY_ACTIVATED', error.message),
  ],
  [
    ItemAlreadyInActivateError,
    (error) => new ConflictApiError('ITEM_ALREADY_INACTIVATED', error.message),
  ],
  [
    BomRevisionAlreadyExistsError,
    (error) => new ConflictApiError('BOM_REVISION_ALREADY_EXISTS', error.message),
  ],
  [
    BomRevisionAlreadyInUseError,
    (error) => new ConflictApiError('BOM_REVISION_ALREADY_IN_USE', error.message),
  ],
  [
    ItemNotActiveError,
    (error) => new ConflictApiError('ITEM_NOT_ACTIVE', error.message),
  ],
  [
    InvalidBomHeaderError,
    (error) => new ConflictApiError('INVALID_BOM_HEADER', error.message),
  ],
  [
    BomRevisionNotDraftError,
    (error) => new ConflictApiError('BOM_REVISION_NOT_DRAFT', error.message),
  ],
  [
    BomRevisionNotFoundError,
    (error) => new NotFoundError('BOM_REVISION_NOT_FOUND', error.message),
  ],
  [
    BomSelfReferenceError,
    (error) => new BadRequestError('BOM_SELF_REFERENCE', error.message),
  ],
  [
    ComponentItemInactiveError,
    (error) => new BadRequestError('COMPONENT_ITEM_INACTIVE', error.message),
  ],
  [
    ComponentItemNotFoundError,
    (error) => new NotFoundError('COMPONENT_ITEM_NOT_FOUND', error.message),
  ],
  [
    InvalidBomComponentTypeError,
    (error) => new BadRequestError('INVALID_BOM_COMPONENT_TYPE', error.message),
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
