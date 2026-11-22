import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { BomsService } from '../../../domains/boms/boms.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { seedBomComponent, seedBomHeader } from '../../utils/bom-service/seed/bom.seed.js';
import { getBomRevisionUrl } from '../../utils/bom-service/test-data.js';
import { getBomRevisionValidationTestCases } from '../../utils/bom-service/test-cases/get-item.test-cases.js';

describe('GET /api/v1/items/:itemId/bom-revisions/:bomHeaderId', () => {
  let seededItems: Item[];
  let bomHeaderId: string;

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
    const header = await seedBomHeader(
      seededItems[2].id,
      new Date('2026-01-01T00:00:00.000Z'),
      null,
      'OBSOLETE',
    );
    bomHeaderId = header.id;
    await seedBomComponent(header.id, seededItems[0].id);
  });

  describe('success', () => {
    it('when a BOM revision exists should return the matching revision and components', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionUrl(seededItems[2].id, bomHeaderId),
      );

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: bomHeaderId,
          parentItem: expect.objectContaining({ id: seededItems[2].id }),
          components: [
            expect.objectContaining({ componentItemId: seededItems[0].id, quantityPer: 1 }),
          ],
        }),
      );
    });
  });

  describe('validation', () => {
    it.each(getBomRevisionValidationTestCases)(
      '$description',
      async ({ itemId, bomHeaderId, field }) => {
        const response = await request(getApp().getHttpServer()).get(
          getBomRevisionUrl(itemId, bomHeaderId),
        );

        assertValidationError(response, field);
      },
    );
  });

  describe('business logic', () => {
    it('when parent item does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionUrl('00000000-0000-4000-8000-000000000088', bomHeaderId),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it('when BOM revision does not exist for the parent item should return a not found error', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionUrl(seededItems[2].id, '00000000-0000-4000-8000-000000000088'),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOM_REVISION_NOT_FOUND');
    });
  });

  describe('server error', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      const findRevision = vi
        .spyOn(getApp().get(BomsService), 'findRevision')
        .mockRejectedValue(new Error('Unexpected database failure'));

      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionUrl(seededItems[2].id, bomHeaderId),
      );

      assertServerError(response);
      expect(findRevision).toHaveBeenCalled();
    });
  });
});
