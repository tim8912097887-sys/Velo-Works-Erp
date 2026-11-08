import { DomainError } from '../../../shared/errors/domain.error.js';

export class ComponentItemNotFoundError extends DomainError {
  constructor(componentItemId: string) {
    super(`Component item with ID ${componentItemId} not found`);
  }
}
