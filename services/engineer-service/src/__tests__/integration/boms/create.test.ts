import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { BomsService } from '../../../domains/boms/boms.service.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { seedBomHeader } from '../../utils/bom-service/seed/bom.seed.js';
import { createBomBody, getBomRevisionsUrl } from '../../utils/bom-service/test-data.js';
import { createBomValidationTestCases } from '../../utils/bom-service/test-cases/create.test-cases.js';

describe('Create BOM Revision Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('Success test', () => {
    it('when a valid BOM revision is created should return the revision and its components', async () => {
      const parent = seededItems[1];
      const body = {
        ...createBomBody,
        components: [{ componentItemId: seededItems[0].id, quantityPer: 2 }],
      };
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(parent.id))
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(
        expect.objectContaining({
          parentItem: expect.objectContaining({ id: parent.id }),
          revision: body.revision,
          status: 'DRAFT',
          effectiveFrom: body.effectiveFrom,
          effectiveTo: body.effectiveTo,
          components: [
            expect.objectContaining({
              componentItemId: seededItems[0].id,
              quantityPer: 2,
            }),
          ],
        }),
      );
    });
  });

  describe('Business Logic test', () => {
    it('when parent item does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl('00000000-0000-4000-8000-000000000088'))
        .send(createBomBody);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('when parent item is inactive should return a conflict error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(seededItems[47].id))
        .send(createBomBody);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ITEM_NOT_ACTIVE');
    });

    it('when parent item is a raw material should return a conflict error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(seededItems[0].id))
        .send(createBomBody);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_BOM_HEADER');
    });

    it('when revision already exists should return a conflict error', async () => {
      const parent = seededItems[4];
      const existing = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'OBSOLETE',
      );
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(parent.id))
        .send({ ...createBomBody, revision: existing.revision });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_REVISION_ALREADY_EXISTS');
    });

    it('when concurrent requests create the same revision should create only one BOM', async () => {
      const parent = seededItems[13];
      const body = {
        ...createBomBody,
        revision: 'RACE-CREATE-01',
        components: [{ componentItemId: seededItems[0].id, quantityPer: 1 }],
      };
      const responses = await Promise.all([
        request(getApp().getHttpServer()).post(getBomRevisionsUrl(parent.id)).send(body),
        request(getApp().getHttpServer()).post(getBomRevisionsUrl(parent.id)).send(body),
      ]);

      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(responses.find(({ status }) => status === 409)?.body.error.code).toBe(
        'BOM_REVISION_ALREADY_EXISTS',
      );
      const createdRevisions = await getApp()
        .get(DbService)
        .bomHeader.findMany({
          where: { parentItemId: parent.id, revision: body.revision },
        });
      expect(createdRevisions).toHaveLength(1);
      expect(createdRevisions[0]).toMatchObject({
        parentItemId: parent.id,
        revision: body.revision,
        status: 'DRAFT',
      });
    });

    it('when a draft BOM already exists should return a conflict error', async () => {
      const parent = seededItems[5];
      await seedBomHeader(parent.id, new Date('2026-01-01T00:00:00.000Z'), null, 'DRAFT');
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(parent.id))
        .send({
          ...createBomBody,
          components: [{ componentItemId: seededItems[0].id, quantityPer: 1 }],
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_DRAFT_ALREADY_EXISTS');
    });

    it('when a component item does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(seededItems[10].id))
        .send({
          ...createBomBody,
          components: [{ componentItemId: '00000000-0000-4000-8000-000000000088', quantityPer: 1 }],
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('COMPONENT_ITEM_NOT_FOUND');
    });

    it('when a component references its parent item should return a bad request error', async () => {
      const parent = seededItems[7];
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(parent.id))
        .send({
          ...createBomBody,
          components: [{ componentItemId: parent.id, quantityPer: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BOM_SELF_REFERENCE');
    });

    it('when a component item is inactive should return a bad request error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(seededItems[8].id))
        .send({
          ...createBomBody,
          components: [{ componentItemId: seededItems[42].id, quantityPer: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('COMPONENT_ITEM_INACTIVE');
    });

    it('when a component is a finished good should return a bad request error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(seededItems[11].id))
        .send({
          ...createBomBody,
          components: [{ componentItemId: seededItems[2].id, quantityPer: 1 }],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_BOM_COMPONENT_TYPE');
    });
  });

  describe('Validation Error test', () => {
    it.each(createBomValidationTestCases)('$description', async ({ itemId, body, field }) => {
      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(itemId))
        .send(body);

      assertValidationError(response, field);
    });
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      const create = vi
        .spyOn(getApp().get(BomsService), 'create')
        .mockRejectedValue(new Error('Unexpected database failure'));

      const response = await request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(seededItems[10].id))
        .send(createBomBody);

      assertServerError(response);
      expect(create).toHaveBeenCalled();
    });
  });
});
