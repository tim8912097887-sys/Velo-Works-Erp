import { DomainError } from '../../../shared/errors/domain.error.js';

export class ItemCodeAlreadyExistError extends DomainError {
  constructor(itemCode: string) {
    super(`Item with code ${itemCode} already exists`);
  }
}
