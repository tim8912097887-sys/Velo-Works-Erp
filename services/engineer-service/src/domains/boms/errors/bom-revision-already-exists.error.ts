import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionAlreadyExistsError extends DomainError {
  constructor(itemId: string, revision: string) {
    super(`BOM revision ${revision} already exists for item ${itemId}`);
  }
}
