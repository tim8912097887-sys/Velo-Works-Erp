import { z } from 'zod';
import { componentsSchema, effectiveDateSchema } from './bom-common.schema.js';

export const updateBomBodySchema = z
  .strictObject({
    ...effectiveDateSchema.shape,
    components: componentsSchema,
  })
  .check((ctx) => {
    if (ctx.value.effectiveTo && ctx.value.effectiveTo <= ctx.value.effectiveFrom) {
      ctx.issues.push({
        code: 'custom',
        path: ['effectiveTo'],
        message: 'Must be later than effectiveFrom',
        input: ctx.value,
      });
    }
  });

export type UpdateBomBody = z.infer<typeof updateBomBodySchema>;
