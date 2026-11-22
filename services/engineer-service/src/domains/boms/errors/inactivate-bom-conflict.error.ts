import { DomainError } from '../../../shared/errors/domain.error.js';

export class InactivateBomConflictError extends DomainError {
  constructor(public readonly itemId?: string) {
    super(
      itemId
        ? `Failed to inactivate existing active BOM for item "${itemId}" due to a conflict.`
        : 'Failed to inactivate existing active BOM due to a conflict.',
    );
  }
}
