import { DomainError } from '../../../shared/errors/domain.error.js';

export class InvalidBomComponentTypeError extends DomainError {
  constructor(componentItemId: string) {
    super(`Finished good item ${componentItemId} cannot be a BOM component`);
  }
}
