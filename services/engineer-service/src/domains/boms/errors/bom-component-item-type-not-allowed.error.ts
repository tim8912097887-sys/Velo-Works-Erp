import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomComponentItemTypeNotAllowedError extends DomainError {
  constructor(params: { componentItemId: string; itemType: string }) {
    super(
      `Component item ${params.componentItemId} has type ${params.itemType}, which is not allowed as a BOM component.`,
      params,
    );
  }
}
