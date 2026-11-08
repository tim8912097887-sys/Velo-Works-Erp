import { DomainError } from '../../../shared/errors/domain.error.js';

export class InvalidBomHeaderError extends DomainError {
  constructor(itemId: string) {
    super(`Raw material item ${itemId} cannot have a BOM`);
  }
}
