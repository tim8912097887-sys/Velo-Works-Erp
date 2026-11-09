import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomDraftAlreadyExistsError extends DomainError {
  constructor(itemId: string) {
    super(`A draft BOM already exists for item ${itemId}`);
  }
}
