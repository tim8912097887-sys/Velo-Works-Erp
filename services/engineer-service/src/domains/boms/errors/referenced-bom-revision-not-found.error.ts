import { DomainError } from '../../../shared/errors/domain.error.js';

export class ReferencedBomRevisionNotFoundError extends DomainError {
  constructor(params: { parentItemId: string; revision: string }) {
    super(
      `BOM revision ${params.revision} for component item ${params.parentItemId} does not exist.`,
      params,
    );
  }
}
