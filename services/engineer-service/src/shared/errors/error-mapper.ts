import { ConflictApiError } from './server-conflict.error.js';
import { DomainError } from './domain.error.js';
import { ItemAlreadyExistsError } from '../../domains/items/errors/item-already-exist.error.js';
import { ItemNotFoundError } from '../../domains/items/errors/item-not-found.error.js';
import { NotFoundError } from './not-found.error.js';
import { InternalServerError } from './server.error.js';
import { ApiError } from './api.error.js';
import { BomRevisionAlreadyExistsError } from '../../domains/boms/errors/bom-revision-already-exists.error.js';
import { BomDraftAlreadyExistsError } from '../../domains/boms/errors/bom-draft-already-exists.error.js';
import { BomRevisionNotDraftError } from '../../domains/boms/errors/bom-revision-not-draft.error.js';
import { BomRevisionNotFoundError } from '../../domains/boms/errors/bom-revision-not-found.error.js';
import { BomSelfReferenceError } from '../../domains/boms/errors/bom-self-reference.error.js';
import { ComponentItemInactiveError } from '../../domains/boms/errors/component-item-inactive.error.js';
import { ComponentItemNotFoundError } from '../../domains/boms/errors/component-item-not-found.error.js';
import { BadRequestError } from './bad-request.error.js';
import { ItemNotActiveError } from '../../domains/items/errors/item-not-active.error.js';
import { BomParentItemNotEligibleError } from '../../domains/boms/errors/bom-parent-item-not-eligible.error.js';
import { BomRevisionAlreadyInUseError } from '../../domains/boms/errors/bom-revision-already-in-use.error.js';
import { ItemAlreadyInactivatedError } from '../../domains/items/errors/item-already-in-activated.error.js';
import { ItemCodeAlreadyExistError } from '../../domains/items/errors/item-code-already-exist.error.js';
import { ItemVersionConflictError } from '../../domains/items/errors/item-version-conflict.error.js';
import { InactivateBomConflictError } from '../../domains/boms/errors/inactivate-bom-conflict.error.js';
import { SubBomNotActiveError } from '../../domains/boms/errors/sub-bom-not-active.error.js';
import { BomComponentItemTypeNotAllowedError } from '../../domains/boms/errors/bom-component-item-type-not-allowed.error.js';
import { ReferencedBomRevisionNotFoundError } from '../../domains/boms/errors/referenced-bom-revision-not-found.error.js';
import { ReferencedBomRevisionNotActiveError } from '../../domains/boms/errors/referenced-bom-revision-not-active.error.js';
import { BomRevisionHasNoComponentsError } from '../../domains/boms/errors/bom-revision-has-no-components.error.js';
import { BomCircularReferenceError } from '../../domains/boms/errors/bom-circular-reference.error.js';
import { BomRevisionVersionConflictError } from '../../domains/boms/errors/bom-revision-version-conflict.error.js';
import { BomRevisionCopyNotAllowedError } from '../../domains/boms/errors/bom-revision-copy-not-allowed.error.js';
import { MultipleActiveBomRevisionsError } from '../../domains/boms/errors/multiple-active-bom-revisions.error.js';
import { BomActivationConflictError } from '../../domains/boms/errors/bom-activation-conflict.error.js';
import { BomRevisionActivationConflictError } from '../../domains/boms/errors/bom-revision-activation-conflict.error.js';

type DomainErrorMapper = (error: DomainError) => ApiError;
type MappedDomainErrorConstructor =
  | typeof ItemNotFoundError
  | typeof ItemAlreadyExistsError
  | typeof BomRevisionAlreadyExistsError
  | typeof BomDraftAlreadyExistsError
  | typeof BomRevisionNotDraftError
  | typeof BomRevisionNotFoundError
  | typeof BomSelfReferenceError
  | typeof ComponentItemInactiveError
  | typeof ComponentItemNotFoundError
  | typeof ItemNotActiveError
  | typeof BomParentItemNotEligibleError
  | typeof ItemAlreadyInactivatedError
  | typeof ItemCodeAlreadyExistError
  | typeof ItemVersionConflictError
  | typeof InactivateBomConflictError
  | typeof SubBomNotActiveError
  | typeof BomComponentItemTypeNotAllowedError
  | typeof ReferencedBomRevisionNotFoundError
  | typeof ReferencedBomRevisionNotActiveError
  | typeof BomRevisionHasNoComponentsError
  | typeof BomCircularReferenceError
  | typeof BomRevisionVersionConflictError
  | typeof BomRevisionCopyNotAllowedError
  | typeof MultipleActiveBomRevisionsError
  | typeof BomActivationConflictError
  | typeof BomRevisionActivationConflictError;

const domainErrorMappers = new Map<MappedDomainErrorConstructor, DomainErrorMapper>([
  [ItemNotFoundError, (error) => new NotFoundError('ITEM_NOT_FOUND', error.message)],
  [ItemAlreadyExistsError, (error) => new ConflictApiError('ITEM_ALREADY_EXISTS', error.message)],
  [
    ItemCodeAlreadyExistError,
    (error) => new ConflictApiError('ITEM_ALREADY_EXISTS', error.message),
  ],
  [
    ItemVersionConflictError,
    (error) => new ConflictApiError('ITEM_VERSION_CONFLICT', error.message),
  ],
  [
    ItemAlreadyInactivatedError,
    (error) => new ConflictApiError('ITEM_ALREADY_INACTIVATED', error.message),
  ],
  [
    BomRevisionAlreadyExistsError,
    (error) => new ConflictApiError('BOM_REVISION_ALREADY_EXISTS', error.message),
  ],
  [
    BomDraftAlreadyExistsError,
    (error) => new ConflictApiError('BOM_DRAFT_ALREADY_EXISTS', error.message),
  ],
  [
    BomRevisionAlreadyInUseError,
    (error) => new ConflictApiError('BOM_REVISION_ALREADY_IN_USE', error.message),
  ],
  [
    BomRevisionCopyNotAllowedError,
    (error) => new ConflictApiError('BOM_REVISION_COPY_NOT_ALLOWED', error.message),
  ],
  [ItemNotActiveError, (error) => new ConflictApiError('ITEM_NOT_ACTIVE', error.message)],
  [
    BomParentItemNotEligibleError,
    (error) => new ConflictApiError('INVALID_BOM_HEADER', error.message),
  ],
  [
    BomRevisionNotDraftError,
    (error) => new ConflictApiError('BOM_REVISION_NOT_DRAFT', error.message),
  ],
  [BomRevisionNotFoundError, (error) => new NotFoundError('BOM_REVISION_NOT_FOUND', error.message)],
  [BomSelfReferenceError, (error) => new BadRequestError('BOM_SELF_REFERENCE', error.message)],
  [
    ComponentItemInactiveError,
    (error) => new BadRequestError('COMPONENT_ITEM_INACTIVE', error.message),
  ],
  [
    ComponentItemNotFoundError,
    (error) => new NotFoundError('COMPONENT_ITEM_NOT_FOUND', error.message),
  ],
  [
    BomComponentItemTypeNotAllowedError,
    (error) => new BadRequestError('BOM_COMPONENT_ITEM_TYPE_NOT_ALLOWED', error.message),
  ],
  [
    InactivateBomConflictError,
    (error) => new ConflictApiError('INACTIVATE_BOM_CONFLICT', error.message),
  ],
  [
    ReferencedBomRevisionNotFoundError,
    (error) => new NotFoundError('REFERENCED_BOM_REVISION_NOT_FOUND', error.message),
  ],
  [
    ReferencedBomRevisionNotActiveError,
    (error) => new ConflictApiError('REFERENCED_BOM_REVISION_NOT_ACTIVE', error.message),
  ],
  [
    BomRevisionHasNoComponentsError,
    (error) => new BadRequestError('BOM_REVISION_HAS_NO_COMPONENTS', error.message),
  ],
  [
    BomCircularReferenceError,
    (error) => new BadRequestError('BOM_CIRCULAR_REFERENCE', error.message),
  ],
  [
    BomRevisionVersionConflictError,
    (error) => new ConflictApiError('BOM_REVISION_VERSION_CONFLICT', error.message),
  ],
  [
    MultipleActiveBomRevisionsError,
    (error) => new ConflictApiError('MULTIPLE_ACTIVE_BOM_REVISIONS', error.message),
  ],
  [
    BomActivationConflictError,
    (error) => new ConflictApiError('BOM_ACTIVATION_CONFLICT', error.message),
  ],
  [
    BomRevisionActivationConflictError,
    (error) => new ConflictApiError('BOM_REVISION_ACTIVATION_CONFLICT', error.message),
  ],
  [SubBomNotActiveError, (error) => new ConflictApiError('SUB_BOM_NOT_ACTIVE', error.message)],
]);

export function mapDomainErrorToApiError(error: DomainError): ApiError {
  for (const [ErrorType, mapError] of domainErrorMappers) {
    if (error instanceof ErrorType) {
      return mapError(error);
    }
  }

  return new InternalServerError(error.message, 'DOMAIN_ERROR');
}
