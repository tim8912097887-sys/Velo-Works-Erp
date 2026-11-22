import { DomainError } from '../../../shared/errors/domain.error.js';

export class MultipleActiveBomRevisionsError extends DomainError {
  constructor(params: { parentItemId: string; bomHeaderIds: string[] }) {
    super(
      `Item ${params.parentItemId} has multiple active BOM revisions. This violates the BOM activation constraint.`,
      params,
    );
  }
}
