import { DomainError } from '../../../shared/errors/domain.error.js';

export class BomCircularReferenceError extends DomainError {
  constructor(cycleItemIds: string[]) {
    super(`A circular BOM reference was detected: ${cycleItemIds.join(' -> ')}.`, { cycleItemIds });
  }
}
