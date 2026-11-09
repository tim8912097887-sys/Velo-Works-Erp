import { randomUUID } from 'node:crypto';
import { getApp } from '../../../setup.js';
import { DbService } from '../../../../infrastruture/persistence/db.service.js';

export async function seedBomHeaders(parentItemId: string, count = 2) {
  const dbService = getApp().get(DbService);
  const revisions = Array.from({ length: count }, () => ({
    parentItemId,
    revision: `SEED-${randomUUID().slice(0, 15)}`,
    status: 'OBSOLETE',
    version: 1,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveTo: null,
  }));

  if (revisions.length === 0) {
    return [];
  }

  await dbService.bomHeader.createMany({ data: revisions });
  return dbService.bomHeader.findMany({
    where: {
      parentItemId,
      revision: { in: revisions.map(({ revision }) => revision) },
    },
    orderBy: { revision: 'asc' },
  });
}

export async function seedBomHeader(
  parentItemId: string,
  effectiveFrom: Date,
  effectiveTo: Date | null,
  status: string,
) {
  const dbService = getApp().get(DbService);
  return dbService.bomHeader.create({
    data: {
      parentItemId,
      revision: `SEED-${randomUUID().slice(0, 15)}`,
      status,
      version: 1,
      effectiveFrom,
      effectiveTo,
    },
  });
}

export async function seedBomComponent(bomHeaderId: string, componentItemId: string) {
  const dbService = getApp().get(DbService);
  return dbService.bomComponent.create({
    data: {
      bomHeaderId,
      componentItemId,
      quantityPer: 1,
      scrapRate: 0,
    },
  });
}
