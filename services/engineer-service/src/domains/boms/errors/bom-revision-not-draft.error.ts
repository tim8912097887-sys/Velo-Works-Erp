import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionNotDraftError extends DomainError {
  constructor(bomHeaderId: string) {
    super(`BOM revision ${bomHeaderId} is not in DRAFT status`);
  }
}
