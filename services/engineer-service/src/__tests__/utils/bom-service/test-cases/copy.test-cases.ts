import { copyBomBody } from '../test-data.js';

export interface CopyBomValidationTestCase {
  description: string;
  itemId: string;
  bomHeaderId: string;
  body: Record<string, unknown>;
  field: string;
}

export const copyBomValidationTestCases: CopyBomValidationTestCase[] = [
  {
    description: 'when item ID is not a valid UUID should return a validation error',
    itemId: 'not-a-uuid',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: copyBomBody,
    field: 'itemId',
  },
  {
    description: 'when BOM revision ID is not a valid UUID should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: 'not-a-uuid',
    body: copyBomBody,
    field: 'bomHeaderId',
  },
  {
    description: 'when new revision is blank should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    body: { ...copyBomBody, newRevision: '' },
    field: 'newRevision',
  },
];
