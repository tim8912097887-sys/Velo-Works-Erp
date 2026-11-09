import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionNotCopyableError extends DomainError {
  constructor(bomHeaderId: string) {
    super(`BOM revision ${bomHeaderId} must be ACTIVE or OBSOLETE to be copied`);
  }
}
