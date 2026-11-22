import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { BomsRepository } from '../../../domains/boms/boms.repository.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import {
  seedBicycleBom,
  seedBomComponent,
  seedBomHeader,
} from '../../utils/bom-service/seed/bom.seed.js';
import { getBomExplosionUrl } from '../../utils/bom-service/test-data.js';
import { getBomExplosionValidationTestCases } from '../../utils/bom-service/test-cases/explode.test-cases.js';

describe('GET /api/v1/items/:itemId/bom-revisions/:bomHeaderId/explode', () => {
  let seededItems: Item[];
  let singleLevelBomHeaderId: string;
  let bicycleBom: Awaited<ReturnType<typeof seedBicycleBom>>;

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];

    const singleLevelBom = await seedBomHeader(
      seededItems[2].id,
      new Date('2026-01-01T00:00:00.000Z'),
      null,
      'OBSOLETE',
    );
    singleLevelBomHeaderId = singleLevelBom.id;
    await getApp()
      .get(DbService)
      .bomComponent.createMany({
        data: [
          {
            bomHeaderId: singleLevelBom.id,
            componentItemId: seededItems[0].id,
            quantityPer: 5,
            scrapRate: 0,
          },
          {
            bomHeaderId: singleLevelBom.id,
            componentItemId: seededItems[1].id,
            quantityPer: 4,
            scrapRate: 0,
          },
        ],
      });

    bicycleBom = await seedBicycleBom({ codePrefix: 'EXP-' });
  });

  describe('success', () => {
    it('when a single-level BOM exists should return the summed component requirements', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomExplosionUrl(seededItems[2].id, singleLevelBomHeaderId),
      );

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data.root.id).toBe(singleLevelBomHeaderId);
      expect(response.body.data.requirementSummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            componentItemId: seededItems[0].id,
            totalQuantity: 5,
          }),
          expect.objectContaining({
            componentItemId: seededItems[1].id,
            totalQuantity: 4,
          }),
        ]),
      );
      expect(response.body.data.tree).toHaveLength(2);
    });

    it('when a multi-level BOM exists should return the correct requirements at each level', async () => {
      const query = new URLSearchParams({ rootQuantity: '2' });
      const response = await request(getApp().getHttpServer()).get(
        `${getBomExplosionUrl(bicycleBom.rootItem.id, bicycleBom.rootBomHeader.id)}?${query.toString()}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data.root.id).toBe(bicycleBom.rootBomHeader.id);
      expect(response.body.data.tree).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 1,
            parentItemId: bicycleBom.items.BIKE_ROAD.id,
            componentItemId: bicycleBom.items.FRAME_ASSY.id,
          }),
          expect.objectContaining({
            level: 2,
            parentItemId: bicycleBom.items.FRAME_ASSY.id,
            componentItemId: bicycleBom.items.FRAME_WELD.id,
          }),
          expect.objectContaining({
            level: 3,
            parentItemId: bicycleBom.items.FRAME_WELD.id,
            componentItemId: bicycleBom.items.TUBE_AL6061.id,
          }),
        ]),
      );
      expect(response.body.data.requirementSummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            componentItemId: bicycleBom.items.FRAME_ASSY.id,
            totalQuantity: 2,
          }),
          expect.objectContaining({
            componentItemId: bicycleBom.items.FRAME_WELD.id,
            totalQuantity: 2,
          }),
          expect.objectContaining({
            componentItemId: bicycleBom.items.TUBE_AL6061.id,
            totalQuantity: 6.7368,
          }),
        ]),
      );
    });

    it('when a diamond BOM exists should accumulate requirements across branches', async () => {
      const db = getApp().get(DbService);
      const root = seededItems[38];
      const left = seededItems[39];
      const right = seededItems[40];
      const shared = seededItems[41];
      await db.item.updateMany({
        where: { id: { in: [root.id, left.id, right.id, shared.id] } },
        data: { makeBuy: 'MAKE' },
      });

      const sharedBom = await seedBomHeader(shared.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
      await seedBomComponent(sharedBom.id, seededItems[0].id);
      const leftBom = await seedBomHeader(left.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
      await db.bomComponent.create({
        data: { bomHeaderId: leftBom.id, componentItemId: shared.id, componentRevision: sharedBom.revision, quantityPer: 2, scrapRate: 0 },
      });
      const rightBom = await seedBomHeader(right.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
      await db.bomComponent.create({
        data: { bomHeaderId: rightBom.id, componentItemId: shared.id, componentRevision: sharedBom.revision, quantityPer: 3, scrapRate: 0 },
      });
      const rootBom = await seedBomHeader(root.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
      await db.bomComponent.createMany({
        data: [
          { bomHeaderId: rootBom.id, componentItemId: left.id, componentRevision: leftBom.revision, quantityPer: 1, scrapRate: 0 },
          { bomHeaderId: rootBom.id, componentItemId: right.id, componentRevision: rightBom.revision, quantityPer: 1, scrapRate: 0 },
        ],
      });

      const response = await request(getApp().getHttpServer()).get(
        getBomExplosionUrl(root.id, rootBom.id),
      );

      expect(response.status).toBe(200);
      expect(response.body.data.requirementSummary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ componentItemId: shared.id, totalQuantity: 5 }),
          expect.objectContaining({ componentItemId: seededItems[0].id, totalQuantity: 5 }),
        ]),
      );
    });
  });

  describe('validation', () => {
    it.each(getBomExplosionValidationTestCases)(
      '$description',
      async ({ itemId, bomHeaderId, query, field }) => {
        const queryString = query ? `?${new URLSearchParams(query).toString()}` : '';
        const response = await request(getApp().getHttpServer()).get(
          `${getBomExplosionUrl(itemId, bomHeaderId)}${queryString}`,
        );

        assertValidationError(response, field);
      },
    );
  });

  describe('business logic', () => {
    it('when the root BOM revision does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomExplosionUrl(
          seededItems[2].id,
          '00000000-0000-4000-8000-000000000088',
        ),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_FOUND');
    });

    it('when a referenced component points to an ancestor should return a circular reference error', async () => {
      const dbService = getApp().get(DbService);
      const cycleComponent = await dbService.bomComponent.create({
        data: {
          bomHeaderId: bicycleBom.bomHeaders.FRAME_WELD.id,
          componentItemId: bicycleBom.rootItem.id,
          componentRevision: bicycleBom.rootBomHeader.revision,
          quantityPer: 1,
          scrapRate: 0,
        },
      });

      try {
        const response = await request(getApp().getHttpServer()).get(
          getBomExplosionUrl(bicycleBom.rootItem.id, bicycleBom.rootBomHeader.id),
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('BOM_CIRCULAR_REFERENCE');
      } finally {
        await dbService.bomComponent.delete({ where: { id: cycleComponent.id } });
      }
    });

    it('when a referenced sub-BOM has been deleted should return a not found error', async () => {
      const dbService = getApp().get(DbService);
      const saddleComponent = bicycleBom.components.find(
        (component) =>
          component.bomHeaderId === bicycleBom.rootBomHeader.id &&
          component.componentItemId === bicycleBom.items.SADDLE_PRO.id,
      );
      if (!saddleComponent) {
        throw new Error('Expected the seeded root BOM to contain a saddle component');
      }

      const subBom = await seedBomHeader(
        bicycleBom.items.SADDLE_PRO.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'OBSOLETE',
      );
      await dbService.bomComponent.update({
        where: { id: saddleComponent.id },
        data: { componentRevision: subBom.revision },
      });
      await dbService.bomHeader.delete({ where: { id: subBom.id } });

      try {
        const response = await request(getApp().getHttpServer()).get(
          getBomExplosionUrl(bicycleBom.rootItem.id, bicycleBom.rootBomHeader.id),
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('REFERENCED_BOM_REVISION_NOT_FOUND');
      } finally {
        await dbService.bomComponent.update({
          where: { id: saddleComponent.id },
          data: { componentRevision: null },
        });
      }
    });
  });

  describe('server error', () => {
    it('when the repository throws an unexpected error should return a masked server error', async () => {
      const findBomHeader = vi
        .spyOn(getApp().get(BomsRepository), 'findBomHeader')
        .mockRejectedValue(new Error('Unexpected database failure'));

      const response = await request(getApp().getHttpServer()).get(
        getBomExplosionUrl(bicycleBom.rootItem.id, bicycleBom.rootBomHeader.id),
      );

      assertServerError(response);
      expect(findBomHeader).toHaveBeenCalled();
    });
  });
});
