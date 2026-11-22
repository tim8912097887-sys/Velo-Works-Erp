import { DomainError } from '../../../shared/errors/domain.error.js';

export class ComponentItemNotFoundError extends DomainError {
  constructor(componentItemId: string) {
    super(`Component item ${componentItemId} does not exist.`, { componentItemId });
  }
}
