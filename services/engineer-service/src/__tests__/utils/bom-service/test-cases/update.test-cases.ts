import { updateBomBody } from '../test-data.js';

export interface UpdateBomValidationTestCase {
  description: string;
  itemId: string;
  bomHeaderId: string;
  body: Record<string, unknown>;
  field: string;
}

export const updateBomValidationTestCases: UpdateBomValidationTestCase[] = [
  {
    description: 'when item ID is not a valid UUID should return a validation error',
    itemId: 'not-a-uuid',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: updateBomBody,
    field: 'itemId',
  },
  {
    description: 'when BOM revision ID is not a valid UUID should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: 'not-a-uuid',
    body: updateBomBody,
    field: 'bomHeaderId',
  },
  {
    description: 'when version is less than 1 should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...updateBomBody, version: 0 },
    field: 'version',
  },
  {
    description: 'when effectiveFrom is not a calendar date should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...updateBomBody, effectiveFrom: '2026-02-30' },
    field: 'effectiveFrom',
  },
  {
    description: 'when effectiveTo is before effectiveFrom should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...updateBomBody, effectiveFrom: '2026-01-10', effectiveTo: '2026-01-09' },
    field: 'effectiveTo',
  },
  {
    description: 'when components is empty should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...updateBomBody, components: [] },
    field: 'components',
  },
  {
    description: 'when component item ID is not a UUID should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...updateBomBody, components: [{ ...updateBomBody.components[0], componentItemId: 'bad-id' }] },
    field: 'components.0.componentItemId',
  },
  {
    description: 'when duplicate components are provided should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...updateBomBody, components: [updateBomBody.components[0], updateBomBody.components[0]] },
    field: 'components.1.componentItemId',
  },
];
