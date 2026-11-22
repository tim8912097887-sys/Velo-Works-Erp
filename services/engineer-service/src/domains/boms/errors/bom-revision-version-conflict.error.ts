import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomRevisionVersionConflictError extends DomainError {
  constructor(params: { bomHeaderId: string; expectedVersion: number; actualVersion: number }) {
    super(
      `BOM revision ${params.bomHeaderId} has been modified by another request. Expected version ${params.expectedVersion}, but the current version is ${params.actualVersion}.`,
      params,
    );
  }
}
