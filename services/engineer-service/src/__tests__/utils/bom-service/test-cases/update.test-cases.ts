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
];
