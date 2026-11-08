import { z } from 'zod';
import { MakeBuyEnum } from './enum.dto.js';

export const UpdateItemSchema = z
  .object({
    version: z.number().int().min(1, 'version must be >= 1'),
    name: z.string().trim().min(1, 'name is required').max(200).optional(),
    leadTimeDays: z.number().int().min(1, 'leadTimeDays must be >= 1').optional(),
    safetyStock: z.number().min(0, 'safetyStock must be >= 0').optional(),
    makeBuy: MakeBuyEnum.optional(),
  })
  .strict(); // Rejects unexpected fields (itemCode, itemType, active, etc.)

export type UpdateItemDto = z.infer<typeof UpdateItemSchema>;
