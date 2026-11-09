import { z } from 'zod';

export const getBomRevisionsQuerySchema = z.strictObject({
  offset: z.coerce.number().int().min(0, 'offset must be an integer >= 0').default(0),
  limit: z.coerce.number().int().min(1).max(100, 'limit must be between 1 and 100').default(20),
  status: z.enum(['DRAFT', 'ACTIVE', 'OBSOLETE']).optional(),
  sortBy: z.enum(['createdAt', 'revision']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetBomRevisionsQuery = z.infer<typeof getBomRevisionsQuerySchema>;
