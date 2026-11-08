import { DomainError } from '../../../shared/errors/domain.error.js';

export class ItemNotActiveError extends DomainError {
  constructor(itemId: string) {
    super(`Item with ID ${itemId} is inactive`);
  }
}
