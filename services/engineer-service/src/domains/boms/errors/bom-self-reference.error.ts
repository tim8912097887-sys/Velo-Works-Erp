import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomSelfReferenceError extends DomainError {
  constructor(parentItemId: string) {
    super(`Item ${parentItemId} cannot reference itself as a BOM component.`, {
      parentItemId,
      componentItemId: parentItemId,
    });
  }
}
