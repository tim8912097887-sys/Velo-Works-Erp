import { DomainError } from '../../../shared/errors/domain.error.js';

export class ItemAlreadyInUseError extends DomainError {
  constructor(itemId: string) {
    super(`Item with ID ${itemId} was modified by another request. Please refresh and try again.`);
  }
}
