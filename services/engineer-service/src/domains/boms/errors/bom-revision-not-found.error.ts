import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionNotFoundError extends DomainError {
  constructor(bomHeaderId: string) {
    super(`BOM revision ${bomHeaderId} does not exist.`, { bomHeaderId });
  }
}
