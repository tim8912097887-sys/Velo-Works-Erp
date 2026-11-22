import { DomainError } from '../../../shared/errors/domain.error.js';

export class SubBomNotActiveError extends DomainError {
  constructor() {
    super('Referenced sub-BOM revision is not active.');
  }
}
