export interface GetBomRevisionsValidationTestCase {
  description: string;
  itemId: string;
  query?: Record<string, string>;
  field: string;
}

export const getBomRevisionsValidationTestCases: GetBomRevisionsValidationTestCase[] = [
  {
    description: 'when item ID is not a valid UUID should return a validation error',
    itemId: 'not-a-uuid',
    field: 'itemId',
  },
  {
    description: 'when limit is below the minimum should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    query: { limit: '0' },
    field: 'limit',
  },
];
