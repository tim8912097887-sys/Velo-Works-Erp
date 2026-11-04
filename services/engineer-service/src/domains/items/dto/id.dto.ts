import { z } from 'zod';

export const ItemParamSchema = z
  .object({
    id: z.uuid('Invalid UUID format for id'),
  })
  .strict();

export type ItemParamDto = z.infer<typeof ItemParamSchema>;
