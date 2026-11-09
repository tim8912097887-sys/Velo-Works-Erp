export interface GetBomRevisionValidationTestCase {
  description: string;
  itemId: string;
  bomHeaderId: string;
  field: string;
}

export const getBomRevisionValidationTestCases: GetBomRevisionValidationTestCase[] = [
  {
    description: 'when item ID is not a valid UUID should return a validation error',
    itemId: 'not-a-uuid',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    field: 'itemId',
  },
  {
    description: 'when BOM revision ID is not a valid UUID should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: 'not-a-uuid',
    field: 'bomHeaderId',
  },
];
