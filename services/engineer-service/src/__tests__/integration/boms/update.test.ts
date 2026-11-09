import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { BomsService } from '../../../domains/boms/boms.service.js';
import { BomsRepository } from '../../../domains/boms/boms.repository.js';
import { BomRevisionNotFoundError } from '../../../domains/boms/errors/bom-revision-not-found.error.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { seedBomComponent, seedBomHeader } from '../../utils/bom-service/seed/bom.seed.js';
import { assertBomDataUnchanged, getBomData } from '../../utils/bom-service/assertion.js';
import { getBomRevisionUrl, updateBomBody } from '../../utils/bom-service/test-data.js';
import { updateBomValidationTestCases } from '../../utils/bom-service/test-cases/update.test-cases.js';

describe('Update BOM Revision Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('Success test', () => {
    it('when a draft BOM revision is updated should return the new version and components', async () => {
      const parent = seededItems[1];
      const header = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      const response = await request(getApp().getHttpServer())
        .put(getBomRevisionUrl(parent.id, header.id))
        .send({
          ...updateBomBody,
          components: [{ componentItemId: seededItems[0].id, quantityPer: 3 }],
        });

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: header.id,
          version: 2,
          status: 'DRAFT',
          components: [
            expect.objectContaining({ componentItemId: seededItems[0].id, quantityPer: 3 }),
          ],
        }),
      );
    });
  });

  describe('Business Logic test', () => {
    it('when parent item does not exist should return a not found error', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(
            getBomRevisionUrl(
              '00000000-0000-4000-8000-000000000088',
              '00000000-0000-4000-8000-000000000002',
            ),
          )
          .send(updateBomBody),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('when parent item is inactive should return a conflict error', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(seededItems[47].id, '00000000-0000-4000-8000-000000000002'))
          .send(updateBomBody),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ITEM_NOT_ACTIVE');
    });

    it('when parent item is a raw material should return a conflict error', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(seededItems[0].id, '00000000-0000-4000-8000-000000000002'))
          .send(updateBomBody),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_BOM_HEADER');
    });

    it('when BOM revision does not exist should return a not found error', async () => {
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(seededItems[1].id, '00000000-0000-4000-8000-000000000088'))
          .send(updateBomBody),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_FOUND');
    });

    it('when BOM revision is not a draft should return a conflict error', async () => {
      const parent = seededItems[2];
      const header = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'OBSOLETE',
      );
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(parent.id, header.id))
          .send(updateBomBody),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_DRAFT');
    });

    it('when the submitted version is stale should return a conflict error', async () => {
      const parent = seededItems[4];
      const header = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(header.id, seededItems[0].id);
      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(parent.id, header.id))
          .send({
            ...updateBomBody,
            components: [{ componentItemId: seededItems[0].id, quantityPer: 1 }],
            version: 2,
          }),
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('BOM_REVISION_ALREADY_IN_USE');
    });

    it('when concurrent updates use the same version should reject the stale update without applying its changes', async () => {
      const parent = seededItems[7];
      const header = await seedBomHeader(
        parent.id,
        new Date('2026-01-01T00:00:00.000Z'),
        null,
        'DRAFT',
      );
      await seedBomComponent(header.id, seededItems[0].id);
      const responses = await Promise.all([
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(parent.id, header.id))
          .send({
            ...updateBomBody,
            components: [{ componentItemId: seededItems[0].id, quantityPer: 2 }],
          }),
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(parent.id, header.id))
          .send({
            ...updateBomBody,
            components: [{ componentItemId: seededItems[0].id, quantityPer: 3 }],
          }),
      ]);

      expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
      expect(responses.find(({ status }) => status === 409)?.body.error.code).toBe(
        'BOM_REVISION_ALREADY_IN_USE',
      );
      const successfulResponse = responses.find(({ status }) => status === 200);
      const persistedHeader = await getApp()
        .get(BomsRepository)
        .findBomHeader(parent.id, header.id);
      expect(persistedHeader?.version).toBe(2);
      expect(persistedHeader?.components).toHaveLength(1);
      expect(persistedHeader?.components[0].quantityPer.toNumber()).toBe(
        successfulResponse?.body.data.components[0].quantityPer,
      );
      const snapshotAfterSuccess = await getBomData();
      const staleResponse = await request(getApp().getHttpServer())
        .put(getBomRevisionUrl(parent.id, header.id))
        .send({
          ...updateBomBody,
          components: [{ componentItemId: seededItems[0].id, quantityPer: 4 }],
        });

      expect(staleResponse.status).toBe(409);
      expect(staleResponse.body.error.code).toBe('BOM_REVISION_ALREADY_IN_USE');
      expect(await getBomData()).toEqual(snapshotAfterSuccess);
    });
  });

  describe('Repository Error test', () => {
    it('when a revision is missing during repository update should throw a not found error', async () => {
      const bomsRepository = getApp().get(BomsRepository);
      const before = await getBomData();

      await expect(
        bomsRepository.update('00000000-0000-4000-8000-000000000088', {
          ...updateBomBody,
          components: [],
        }),
      ).rejects.toBeInstanceOf(BomRevisionNotFoundError);
      expect(await getBomData()).toEqual(before);
    });
  });

  describe('Validation Error test', () => {
    it.each(updateBomValidationTestCases)(
      '$description',
      async ({ itemId, bomHeaderId, body, field }) => {
        const response = await assertBomDataUnchanged(() =>
          request(getApp().getHttpServer()).put(getBomRevisionUrl(itemId, bomHeaderId)).send(body),
        );

        assertValidationError(response, field);
      },
    );
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      const update = vi
        .spyOn(getApp().get(BomsService), 'update')
        .mockRejectedValue(new Error('Unexpected database failure'));

      const response = await assertBomDataUnchanged(() =>
        request(getApp().getHttpServer())
          .put(getBomRevisionUrl(seededItems[5].id, '00000000-0000-4000-8000-000000000002'))
          .send(updateBomBody),
      );

      assertServerError(response);
      expect(update).toHaveBeenCalled();
    });
  });
});
