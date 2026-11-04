import { DomainError } from '../../../shared/errors/domain.error.js';

export class ItemAlreadyExistsError extends DomainError {
  constructor(itemCode: string) {
    super(`Item with code ${itemCode} already exists`);
  }
}
