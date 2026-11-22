import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionActivationConflictError extends DomainError {
  constructor(params: { bomHeaderId: string }) {
    super(`Failed to activate BOM revision ${params.bomHeaderId}.`, params);
  }
}
