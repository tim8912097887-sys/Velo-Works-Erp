import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionHasNoComponentsError extends DomainError {
  constructor(bomHeaderId: string) {
    super(`BOM revision ${bomHeaderId} has no components.`, { bomHeaderId });
  }
}
