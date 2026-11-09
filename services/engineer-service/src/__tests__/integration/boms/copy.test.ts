import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { BomsService } from '../../../domains/boms/boms.service.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { seedBomComponent, seedBomHeader } from '../../utils/bom-service/seed/bom.seed.js';
import { copyBomRevisionUrl, copyBomBody } from '../../utils/bom-service/test-data.js';
import { copyBomValidationTestCases } from '../../utils/bom-service/test-cases/copy.test-cases.js';

describe('Copy BOM Revision Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('Success test', () => {
    it('when an active BOM revision is copied should return a new draft with copied components', async () => {
      const parent = seededItems[1];
      const source = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'ACTIVE',
      );
      await seedBomComponent(source.id, seededItems[0].id);
      const response = await request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(parent.id, source.id))
        .send(copyBomBody);

      expect(response.status).toBe(201);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(
        expect.objectContaining({
          parentItem: expect.objectContaining({ id: parent.id }),
          revision: copyBomBody.newRevision,
          status: 'DRAFT',
          version: 1,
          components: [
            expect.objectContaining({ componentItemId: seededItems[0].id, quantityPer: 1 }),
          ],
        }),
      );
    });
  });

  describe('Business Logic test', () => {
    it('when parent item does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(
          copyBomRevisionUrl(
            '00000000-0000-4000-8000-000000000088',
            '00000000-0000-4000-8000-000000000002',
          ),
        )
        .send(copyBomBody);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('when BOM revision does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(seededItems[1].id, '00000000-0000-4000-8000-000000000088'))
        .send(copyBomBody);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_FOUND');
    });

    it('when source revision is a draft should return a conflict error', async () => {
      const parent = seededItems[3];
      const source = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      const response = await request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(parent.id, source.id))
        .send(copyBomBody);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_COPYABLE');
    });

    it('when the new revision already exists should return a conflict error', async () => {
      const parent = seededItems[4];
      const source = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'ACTIVE',
      );
      const existing = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'OBSOLETE',
      );
      const response = await request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(parent.id, source.id))
        .send({ ...copyBomBody, newRevision: existing.revision });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_REVISION_ALREADY_EXISTS');
    });

    it('when concurrent requests copy to the same revision should create only one BOM', async () => {
      const parent = seededItems[7];
      const source = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'ACTIVE',
      );
      const body = { ...copyBomBody, newRevision: 'RACE-COPY-01' };
      const responses = await Promise.all([
        request(getApp().getHttpServer()).post(copyBomRevisionUrl(parent.id, source.id)).send(body),
        request(getApp().getHttpServer()).post(copyBomRevisionUrl(parent.id, source.id)).send(body),
      ]);

      expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
      expect(responses.find(({ status }) => status === 409)?.body.error.code).toBe(
        'BOM_REVISION_ALREADY_EXISTS',
      );
      const revisions = await getApp()
        .get(DbService)
        .bomHeader.findMany({
          where: { parentItemId: parent.id },
          orderBy: { revision: 'asc' },
        });
      expect(revisions).toHaveLength(2);
      expect(revisions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: source.id, status: 'ACTIVE' }),
          expect.objectContaining({ revision: body.newRevision, status: 'DRAFT' }),
        ]),
      );
    });

    it('when the parent already has a draft should return a conflict error', async () => {
      const parent = seededItems[5];
      const source = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'ACTIVE',
      );
      await seedBomHeader(parent.id, new Date('2026-01-01T00:00:00.000Z'), null, 'DRAFT');
      const response = await request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(parent.id, source.id))
        .send(copyBomBody);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_DRAFT_ALREADY_EXISTS');
    });
  });

  describe('Validation Error test', () => {
    it.each(copyBomValidationTestCases)(
      '$description',
      async ({ itemId, bomHeaderId, body, field }) => {
        const response = await request(getApp().getHttpServer())
          .post(copyBomRevisionUrl(itemId, bomHeaderId))
          .send(body);

        assertValidationError(response, field);
      },
    );
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      const copyRevision = vi
        .spyOn(getApp().get(BomsService), 'copyRevision')
        .mockRejectedValue(new Error('Unexpected database failure'));

      const response = await request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(seededItems[6].id, '00000000-0000-4000-8000-000000000002'))
        .send(copyBomBody);

      assertServerError(response);
      expect(copyRevision).toHaveBeenCalled();
    });
  });
});
