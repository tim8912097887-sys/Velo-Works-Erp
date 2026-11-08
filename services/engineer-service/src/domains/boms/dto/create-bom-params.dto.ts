import { z } from 'zod';
import { uuidSchema } from './bom-common.schema.js';

export const createBomParamsSchema = z.strictObject({
  itemId: uuidSchema,
});
