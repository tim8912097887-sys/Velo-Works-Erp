import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionAlreadyExistsError extends DomainError {
  constructor(params: { parentItemId: string; revision: string }) {
    super(
      `BOM revision ${params.revision} already exists for item ${params.parentItemId}.`,
      params,
    );
  }
}
