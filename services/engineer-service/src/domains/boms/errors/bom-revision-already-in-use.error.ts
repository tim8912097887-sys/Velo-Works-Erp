import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionAlreadyInUseError extends DomainError {
  constructor(bomHeaderId: string) {
    super(
      `BOM revision ${bomHeaderId} was modified by another request. Please refresh and try again.`,
    );
  }
}
