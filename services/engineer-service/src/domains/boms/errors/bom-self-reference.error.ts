import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomSelfReferenceError extends DomainError {
  constructor(itemId: string) {
    super(`Item ${itemId} cannot be a component of its own BOM revision`);
  }
}
