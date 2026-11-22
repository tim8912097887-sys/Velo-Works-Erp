import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { seedBomComponent, seedBomHeader } from '../../utils/bom-service/seed/bom.seed.js';
import { activateBomRevisionUrl } from '../../utils/bom-service/test-data.js';
import { assertBomDataUnchanged } from '../../utils/bom-service/assertion.js';

describe('POST /api/v1/items/:itemId/bom-revisions/:bomHeaderId/activate', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('success', () => {
    it('when a valid draft BOM is activated should persist the active status', async () => {
      const parent = seededItems[2];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(bom.id, seededItems[0].id);

      const response = await request(getApp().getHttpServer()).post(
        activateBomRevisionUrl(parent.id, bom.id),
      );
      const persistedBom = await getApp().get(DbService).bomHeader.findUnique({
        where: { id: bom.id },
        include: { components: true },
      });

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data.activeBom).toEqual(
        expect.objectContaining({ id: bom.id, status: 'ACTIVE' }),
      );
      expect(persistedBom).toMatchObject({
        id: bom.id,
        parentItemId: parent.id,
        status: 'ACTIVE',
        components: [expect.objectContaining({ componentItemId: seededItems[0].id })],
      });
    });

    it('when an active BOM already exists should obsolete it and activate the draft', async () => {
      const parent = seededItems[5];
      const previousActive = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'ACTIVE',
      );
      await seedBomComponent(previousActive.id, seededItems[0].id);
      const draft = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(draft.id, seededItems[0].id);

      const response = await request(getApp().getHttpServer()).post(
        activateBomRevisionUrl(parent.id, draft.id),
      );
      const persistedBoms = await getApp()
        .get(DbService)
        .bomHeader.findMany({
          where: { parentItemId: parent.id },
          include: { components: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.activeBom).toEqual(
        expect.objectContaining({ id: draft.id, status: 'ACTIVE' }),
      );
      expect(response.body.data.obsoleteBom).toEqual(
        expect.objectContaining({ id: previousActive.id, status: 'ACTIVE' }),
      );
      expect(persistedBoms).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: previousActive.id,
            status: 'OBSOLETE',
            components: [expect.objectContaining({ componentItemId: seededItems[0].id })],
          }),
          expect.objectContaining({
            id: draft.id,
            status: 'ACTIVE',
            components: [expect.objectContaining({ componentItemId: seededItems[0].id })],
          }),
        ]),
      );
      expect(persistedBoms.filter(({ status }) => status === 'ACTIVE')).toHaveLength(1);
    });

    it('when a diamond BOM is activated successfully should activate the draft', async () => {
      const db = getApp().get(DbService);
      const root = seededItems[10];
      const left = seededItems[13];
      const right = seededItems[16];
      const shared = seededItems[19];
      const cycleItems = [root, left, right, shared];
      const originalMakeBuys = cycleItems.map(({ makeBuy }) => makeBuy);

      try {
        await db.item.updateMany({
          where: { id: { in: cycleItems.map(({ id }) => id) } },
          data: { makeBuy: 'MAKE' },
        });

        const sharedBom = await seedBomHeader(shared.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
        await seedBomComponent(sharedBom.id, seededItems[0].id);
        const leftBom = await seedBomHeader(left.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
        await db.bomComponent.create({
          data: {
            bomHeaderId: leftBom.id,
            componentItemId: shared.id,
            componentRevision: sharedBom.revision,
            quantityPer: 2,
            scrapRate: 0,
          },
        });
        const rightBom = await seedBomHeader(right.id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
        await db.bomComponent.create({
          data: {
            bomHeaderId: rightBom.id,
            componentItemId: shared.id,
            componentRevision: sharedBom.revision,
            quantityPer: 3,
            scrapRate: 0,
          },
        });
        const rootBom = await seedBomHeader(root.id, new Date('2026-01-01T00:00:00.000Z'), null, 'DRAFT');
        await db.bomComponent.createMany({
          data: [
            { bomHeaderId: rootBom.id, componentItemId: left.id, componentRevision: leftBom.revision, quantityPer: 1, scrapRate: 0 },
            { bomHeaderId: rootBom.id, componentItemId: right.id, componentRevision: rightBom.revision, quantityPer: 1, scrapRate: 0 },
          ],
        });

        const response = await request(getApp().getHttpServer()).post(
          activateBomRevisionUrl(root.id, rootBom.id),
        );

        expect(response.status).toBe(200);
        expect(response.body.data.activeBom).toEqual(
          expect.objectContaining({ id: rootBom.id, status: 'ACTIVE' }),
        );
      } finally {
        const bomIds = (
          await db.bomHeader.findMany({
            where: { parentItemId: { in: cycleItems.map(({ id }) => id) } },
            select: { id: true },
          })
        ).map(({ id }) => id);
        await db.bomComponent.deleteMany({
          where: { bomHeaderId: { in: bomIds } },
        });
        await db.bomHeader.deleteMany({
          where: { parentItemId: { in: cycleItems.map(({ id }) => id) } },
        });
        await Promise.all(
          cycleItems.map((item, index) =>
            db.item.update({
              where: { id: item.id },
              data: { makeBuy: originalMakeBuys[index] },
            }),
          ),
        );
      }
    });
  });

  describe('validation', () => {
    it.each([
      {
        description: 'when item ID is not a valid UUID should return a validation error',
        itemId: 'not-a-uuid',
        bomHeaderId: '00000000-0000-4000-8000-000000000002',
        field: 'itemId',
      },
      {
        description: 'when BOM revision ID is not a valid UUID should return a validation error',
        itemId: '00000000-0000-4000-8000-000000000001',
        bomHeaderId: 'not-a-uuid',
        field: 'bomHeaderId',
      },
    ])('$description', async ({ itemId, bomHeaderId, field }) => {
      const response = await request(getApp().getHttpServer()).post(
        activateBomRevisionUrl(itemId, bomHeaderId),
      );

      assertValidationError(response, field);
    });
  });

  describe('business logic', () => {
    it('when the parent item does not exist should return not found without changing BOM data', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(
          activateBomRevisionUrl(
            '00000000-0000-4000-8000-000000000088',
            '00000000-0000-4000-8000-000000000002',
          ),
        ),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('when the parent item is inactive should return conflict without changing BOM data', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(
          activateBomRevisionUrl(seededItems[47].id, '00000000-0000-4000-8000-000000000002'),
        ),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ITEM_NOT_ACTIVE');
    });

    it('when the parent item is a raw material should return conflict without changing BOM data', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(
          activateBomRevisionUrl(seededItems[0].id, '00000000-0000-4000-8000-000000000002'),
        ),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_BOM_HEADER');
    });

    it('when the parent item is a BUY item should return conflict without changing BOM data', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(
          activateBomRevisionUrl(seededItems[7].id, '00000000-0000-4000-8000-000000000002'),
        ),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_BOM_HEADER');
    });

    it('when the BOM revision does not exist should return not found without changing BOM data', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(
          activateBomRevisionUrl(seededItems[2].id, '00000000-0000-4000-8000-000000000088'),
        ),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_FOUND');
    });

    it('when the BOM is not a draft should return conflict without changing BOM data', async () => {
      const parent = seededItems[8];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'OBSOLETE',
      );
      await seedBomComponent(bom.id, seededItems[0].id);

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_DRAFT');
    });

    it('when the BOM has no components should return a bad request without changing BOM data', async () => {
      const parent = seededItems[11];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BOM_REVISION_HAS_NO_COMPONENTS');
    });

    it('when a component is inactive should return a bad request without changing BOM data', async () => {
      const parent = seededItems[29];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(bom.id, seededItems[42].id);

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('COMPONENT_ITEM_INACTIVE');
    });

    it('when a component is a finished good should return a bad request without changing BOM data', async () => {
      const parent = seededItems[32];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(bom.id, seededItems[2].id);

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BOM_COMPONENT_ITEM_TYPE_NOT_ALLOWED');
    });

    it('when a referenced BOM revision is missing should return not found without changing BOM data', async () => {
      const parent = seededItems[14];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await getApp()
        .get(DbService)
        .bomComponent.create({
          data: {
            bomHeaderId: bom.id,
            componentItemId: seededItems[1].id,
            componentRevision: 'MISSING-REVISION',
            quantityPer: 1,
            scrapRate: 0,
          },
        });

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('REFERENCED_BOM_REVISION_NOT_FOUND');
    });

    it('when a referenced BOM is not active should return conflict without changing BOM data', async () => {
      const parent = seededItems[26];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      const subBom = await seedBomHeader(
        seededItems[1].id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(subBom.id, seededItems[0].id);
      await getApp()
        .get(DbService)
        .bomComponent.create({
          data: {
            bomHeaderId: bom.id,
            componentItemId: seededItems[1].id,
            componentRevision: subBom.revision,
            quantityPer: 1,
            scrapRate: 0,
          },
        });

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('REFERENCED_BOM_REVISION_NOT_ACTIVE');
    });

    it('when a referenced active BOM is empty should return bad request without changing BOM data', async () => {
      const parent = seededItems[35];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      const subBom = await seedBomHeader(
        seededItems[1].id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'ACTIVE',
      );
      await getApp()
        .get(DbService)
        .bomComponent.create({
          data: {
            bomHeaderId: bom.id,
            componentItemId: seededItems[1].id,
            componentRevision: subBom.revision,
            quantityPer: 1,
            scrapRate: 0,
          },
        });

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BOM_REVISION_HAS_NO_COMPONENTS');
    });

    it.each([
      {
        description: 'when a simple BOM cycle exists should reject activation',
        cycleItemIndices: [10, 13],
      },
      {
        description: 'when a deep BOM cycle exists should reject activation',
        cycleItemIndices: [16, 19, 22],
      },
    ])('$description without changing BOM data', async ({ cycleItemIndices }) => {
      const dbService = getApp().get(DbService);
      const cycleItems = cycleItemIndices.map((index) => seededItems[index]);
      await dbService.item.updateMany({
        where: { id: { in: cycleItems.map(({ id }) => id) } },
        data: { makeBuy: 'MAKE' },
      });
      const cycleBoms = await Promise.all(
        cycleItems.map((item, index) =>
          seedBomHeader(
            item.id,
            new Date('2026-01-01T00:00:00.000Z'),
            null,
            index === 0 ? 'DRAFT' : 'ACTIVE',
          ),
        ),
      );
      await dbService.bomComponent.createMany({
        data: cycleBoms.map((bom, index) => {
          const nextIndex = (index + 1) % cycleBoms.length;

          return {
            bomHeaderId: bom.id,
            componentItemId: cycleItems[nextIndex].id,
            componentRevision: cycleBoms[nextIndex].revision,
            quantityPer: 1,
            scrapRate: 0,
          };
        }),
      });

      try {
        const response = await assertBomDataUnchanged(() =>
          request(getApp().getHttpServer()).post(
            activateBomRevisionUrl(cycleItems[0].id, cycleBoms[0].id),
          ),
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('BOM_CIRCULAR_REFERENCE');
      } finally {
        await dbService.bomComponent.deleteMany({
          where: { bomHeaderId: { in: cycleBoms.map(({ id }) => id) } },
        });
        await dbService.bomHeader.deleteMany({
          where: { id: { in: cycleBoms.map(({ id }) => id) } },
        });
        await dbService.item.updateMany({
          where: { id: { in: cycleItems.map(({ id }) => id) } },
          data: { makeBuy: 'BUY' },
        });
      }
    });
  });

  describe('concurrency', () => {
    it('when the same draft is activated concurrently should persist only one active transition', async () => {
      const parent = seededItems[20];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(bom.id, seededItems[0].id);

      const responses = await Promise.all([
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      ]);
      const persistedBom = await getApp().get(DbService).bomHeader.findUnique({
        where: { id: bom.id },
        include: { components: true },
      });

      expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
      expect(persistedBom).toMatchObject({
        id: bom.id,
        parentItemId: parent.id,
        status: 'ACTIVE',
        components: [expect.objectContaining({ componentItemId: seededItems[0].id })],
      });
      expect(
        await getApp()
          .get(DbService)
          .bomHeader.count({ where: { parentItemId: parent.id, status: 'ACTIVE' } }),
      ).toBe(1);
    });
  });

  describe('server error', () => {
    it('when the transaction throws unexpectedly should roll back and return a masked error without changing BOM data', async () => {
      const parent = seededItems[23];
      const bom = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(bom.id, seededItems[0].id);
      const transaction = vi
        .spyOn(getApp().get(DbService), '$transaction')
        .mockRejectedValue(new Error('Unexpected transaction failure'));

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, bom.id)),
      );

      assertServerError(response);
      expect(transaction).toHaveBeenCalled();
    });
  });
});
