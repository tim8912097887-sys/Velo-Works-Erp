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
];
