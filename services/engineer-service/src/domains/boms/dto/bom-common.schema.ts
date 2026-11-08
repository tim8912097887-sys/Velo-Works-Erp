import { z } from 'zod';

export const uuidSchema = z.uuid();

export const revisionSchema = z.string().trim().min(1).max(20);

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid calendar date');

export const effectiveDateSchema = z
  .object({
    effectiveFrom: dateSchema,
    effectiveTo: dateSchema.nullable(),
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

export const bomComponentSchema = z.strictObject({
  componentItemId: uuidSchema,
  quantityPer: z.number().positive(),
  scrapRate: z.number().min(0).lt(1).default(0),
  operationSeq: z.number().int().min(1).nullable().default(null),
});

export const componentsSchema = z
  .array(bomComponentSchema)
  .min(1, 'At least one component is required')
  .check((ctx) => {
    const seen = new Set<string>();

    ctx.value.forEach((component, index) => {
      if (seen.has(component.componentItemId)) {
        ctx.issues.push({
          code: 'custom',
          path: [index, 'componentItemId'],
          message: 'Duplicate component item',
          input: ctx.value,
        });
      }

      seen.add(component.componentItemId);
    });
  });
