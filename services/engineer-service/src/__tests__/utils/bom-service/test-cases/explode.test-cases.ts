export interface GetBomExplosionValidationTestCase {
  description: string;
  itemId: string;
  bomHeaderId: string;
  query?: Record<string, string>;
  field?: string;
}

export const getBomExplosionValidationTestCases: GetBomExplosionValidationTestCase[] = [
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
  {
    description: 'when root quantity is not a number should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    query: { rootQuantity: 'not-a-number' },
    field: 'rootQuantity',
  },
  {
    description: 'when root quantity is not an integer should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    query: { rootQuantity: '1.5' },
    field: 'rootQuantity',
  },
  {
    description: 'when root quantity is less than one should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    query: { rootQuantity: '0' },
    field: 'rootQuantity',
  },
  {
    description: 'when an unsupported query parameter is provided should return a validation error',
    itemId: '00000000-0000-4000-8000-000000000001',
    bomHeaderId: '00000000-0000-4000-8000-000000000002',
    query: { unexpected: 'value' },
  },
];
