import { z } from 'zod';

export const getBomExplosionQuerySchema = z.strictObject({
  rootQuantity: z.coerce.number().int().min(1, 'root quantity must be an integer >= 1').default(1),
});

export type GetBomExplosionQuery = z.infer<typeof getBomExplosionQuerySchema>;
