import { z } from 'zod';
import { ItemTypeEnum, MakeBuyEnum } from './enum.dto.js';

export const CreateItemSchema = z
  .object({
    itemCode: z.string().trim().min(1, 'itemCode is required').max(50),
    name: z.string().trim().min(1, 'name is required').max(200),
    itemType: ItemTypeEnum,
    unitOfMeasure: z.string().trim().min(1, 'unitOfMeasure is required').max(20),
    makeBuy: MakeBuyEnum,
    leadTimeDays: z.number().int().min(1, 'leadTimeDays must be >= 1'),
    safetyStock: z.number().min(0, 'safetyStock must be >= 0'),
  })
  .strict() // Rejects unexpected/unsupported fields
  .refine(
    (data) => {
      // Rule: RAW_MATERIAL only allows BUY; SUBASSEMBLY and FINISHED_GOOD allow MAKE, BUY, BOTH
      if (data.itemType === 'RAW_MATERIAL') {
        return data.makeBuy === 'BUY';
      }
      return true;
    },
    {
      message: 'RAW_MATERIAL must have makeBuy set to BUY',
      path: ['makeBuy'],
    },
  );

export type CreateItemDto = z.infer<typeof CreateItemSchema>;
