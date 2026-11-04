import { z } from 'zod';

export const ItemTypeEnum = z.enum(['FINISHED_GOOD', 'SUBASSEMBLY', 'RAW_MATERIAL']);
export type ItemType = z.infer<typeof ItemTypeEnum>;

export const MakeBuyEnum = z.enum(['MAKE', 'BUY', 'BOTH']);
export type MakeBuy = z.infer<typeof MakeBuyEnum>;

export const SortByEnum = z.enum(['itemCode', 'name', 'leadTimeDays']);
export const SortOrderEnum = z.enum(['asc', 'desc']);
