import { createBomBody } from '../test-data.js';

export interface CreateBomValidationTestCase {
  description: string;
  itemId: string;
  body: Record<string, unknown>;
  field: string;
}

export const createBomValidationTestCases: CreateBomValidationTestCase[] = [
  {
    description: 'when item ID is not a valid UUID should return a validation error',
    itemId: 'not-a-uuid',
    body: createBomBody,
    field: 'itemId',
  },
  {
    description: 'when revision is blank should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, revision: '' },
    field: 'revision',
  },
  {
    description: 'when effectiveFrom is not a calendar date should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, effectiveFrom: '2026-02-30' },
    field: 'effectiveFrom',
  },
  {
    description: 'when effectiveTo is not a calendar date should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, effectiveTo: '2026-02-30' },
    field: 'effectiveTo',
  },
  {
    description: 'when effectiveTo is before effectiveFrom should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, effectiveFrom: '2026-01-10', effectiveTo: '2026-01-09' },
    field: 'effectiveTo',
  },
  {
    description: 'when components is empty should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, components: [] },
    field: 'components',
  },
  {
    description: 'when component item ID is not a UUID should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, components: [{ ...createBomBody.components[0], componentItemId: 'bad-id' }] },
    field: 'components.0.componentItemId',
  },
  {
    description: 'when duplicate components are provided should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, components: [createBomBody.components[0], createBomBody.components[0]] },
    field: 'components.1.componentItemId',
  },
  {
    description: 'when component quantity is not positive should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    body: { ...createBomBody, components: [{ ...createBomBody.components[0], quantityPer: 0 }] },
    field: 'components.0.quantityPer',
  },
];
