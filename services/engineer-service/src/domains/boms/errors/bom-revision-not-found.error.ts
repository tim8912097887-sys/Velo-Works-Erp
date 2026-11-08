import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionNotFoundError extends DomainError {
  constructor(bomHeaderId: string) {
    super(`BOM revision with ID ${bomHeaderId} not found`);
  }
}
