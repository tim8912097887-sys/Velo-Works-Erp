import { z } from 'zod';
import { componentsSchema, effectiveDateSchema, revisionSchema } from './bom-common.schema.js';

export const createBomBodySchema = z
  .strictObject({
    revision: revisionSchema,
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
export type CreateBomBody = z.infer<typeof createBomBodySchema>;
