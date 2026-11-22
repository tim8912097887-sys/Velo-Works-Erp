import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomActivationConflictError extends DomainError {
  constructor(params: { parentItemId: string; previousActiveBomHeaderId: string }) {
    super(
      `Failed to transition the previous active BOM revision ${params.previousActiveBomHeaderId} to OBSOLETE for item ${params.parentItemId}.`,
      params,
    );
  }
}
