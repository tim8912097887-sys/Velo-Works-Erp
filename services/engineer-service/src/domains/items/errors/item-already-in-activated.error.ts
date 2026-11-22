import { DomainError } from '../../../shared/errors/domain.error.js';

export class ItemAlreadyInactivatedError extends DomainError {
  constructor(itemId: string) {
    super(`Item with ID ${itemId} is already inactive`);
  }
}
