import { z } from 'zod';
import { uuidSchema } from './bom-common.schema.js';

export const updateBomParamsSchema = z.strictObject({
  itemId: uuidSchema,
  bomHeaderId: uuidSchema,
});
