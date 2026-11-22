import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionCopyNotAllowedError extends DomainError {
  constructor(params: { bomHeaderId: string; status: string }) {
    super(
      `BOM revision ${params.bomHeaderId} cannot be copied because its status is ${params.status}.`,
      params,
    );
  }
}
