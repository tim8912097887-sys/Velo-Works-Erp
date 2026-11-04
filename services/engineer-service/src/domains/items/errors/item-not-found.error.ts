import { DomainError } from '../../../shared/errors/domain.error.js';

export class ItemNotFoundError extends DomainError {
  constructor(itemId: string) {
    super(`Item with ID ${itemId} not found`);
  }
}
