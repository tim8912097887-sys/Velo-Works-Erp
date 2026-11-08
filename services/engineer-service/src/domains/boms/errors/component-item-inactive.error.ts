import { DomainError } from '../../../shared/errors/domain.error.js';

export class ComponentItemInactiveError extends DomainError {
  constructor(componentItemId: string) {
    super(`Component item with ID ${componentItemId} is inactive`);
  }
}
