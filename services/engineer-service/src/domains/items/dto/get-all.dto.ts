import { z } from 'zod';
import { ItemTypeEnum, MakeBuyEnum, SortByEnum, SortOrderEnum } from './enum.dto.js';

export const GetItemsQuerySchema = z
  .object({
    offset: z.coerce.number().int().min(0, 'offset must be an integer >= 0').default(0),
    limit: z.coerce.number().int().min(1).max(100, 'limit must be between 1 and 100').default(20),
    search: z.string().trim().max(100).optional(),
    itemType: ItemTypeEnum.optional(),
    makeBuy: MakeBuyEnum.optional(),
    sortBy: SortByEnum.optional(),
    sortOrder: SortOrderEnum.optional(),
  })
  .strict();

export type GetItemsQueryDto = z.infer<typeof GetItemsQuerySchema>;
