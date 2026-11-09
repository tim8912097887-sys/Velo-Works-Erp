import { expect } from 'vitest';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';

export async function getBomData() {
  const headers = await getApp()
    .get(DbService)
    .bomHeader.findMany({
      include: { components: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'asc' },
    });

  return headers.map(({ components, ...header }) => ({
    ...header,
    effectiveFrom: header.effectiveFrom.toISOString(),
    effectiveTo: header.effectiveTo?.toISOString() ?? null,
    components: components.map(({ quantityPer, scrapRate, ...component }) => ({
      ...component,
      quantityPer: Number(quantityPer),
      scrapRate: Number(scrapRate),
    })),
  }));
}

export async function assertBomDataUnchanged<T>(action: () => Promise<T>): Promise<T> {
  const before = await getBomData();
  const result = await action();
  expect(await getBomData()).toEqual(before);
  return result;
}
