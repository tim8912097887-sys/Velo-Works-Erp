import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomDraftAlreadyExistsError extends DomainError {
  constructor(params: { parentItemId: string; existingDraftId?: string }) {
    super(`Item ${params.parentItemId} already has a draft BOM revision.`, params);
  }
}
