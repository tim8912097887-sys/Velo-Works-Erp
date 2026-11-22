import { DomainError } from '../../../shared/errors/domain.error.js';

export class ReferencedBomRevisionNotActiveError extends DomainError {
  constructor(params: {
    bomHeaderId: string;
    parentItemId: string;
    revision: string;
    status: string;
  }) {
    super(
      `Referenced BOM revision ${params.revision} for item ${params.parentItemId} is not active. Current status: ${params.status}.`,
      params,
    );
  }
}
