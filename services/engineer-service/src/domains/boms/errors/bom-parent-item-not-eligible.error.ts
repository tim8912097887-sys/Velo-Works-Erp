import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomParentItemNotEligibleError extends DomainError {
  constructor(params: { parentItemId: string; itemType?: string; makeBuy?: string }) {
    super(
      `Item ${params.parentItemId} is not eligible to be a BOM parent. RAW_MATERIAL items and BUY-only items cannot own a BOM.`,
      params,
    );
  }
}
