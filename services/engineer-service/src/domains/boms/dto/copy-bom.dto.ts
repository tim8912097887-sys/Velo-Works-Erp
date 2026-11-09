import { z } from 'zod';
import { effectiveDateSchema, revisionSchema } from './bom-common.schema.js';

export const copyBomBodySchema = z
  .strictObject({
    newRevision: revisionSchema,
    ...effectiveDateSchema.shape,
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

export type CopyBomBody = z.infer<typeof copyBomBodySchema>;
