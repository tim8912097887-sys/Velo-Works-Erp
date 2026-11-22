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
      if (data.itemType === 'FINISHED_GOOD') {
        return data.makeBuy !== 'BUY';
      }

      if (data.itemType === 'RAW_MATERIAL') {
        return data.makeBuy === 'BUY';
      }

      return true;
    },
    {
      message: 'Invalid makeBuy value for itemType',
      path: ['makeBuy'],
    },
  );

export type CreateItemDto = z.infer<typeof CreateItemSchema>;
