import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { ItemsService } from '../../../domains/items/items.service.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { UPDATE_ITEM_URL } from '../../utils/item-service/seed/constants.js';
import {
  updateItemTestCases,
  updateItemValidationTestCases,
} from '../../utils/item-service/test-cases/update.test-cases.js';

describe('Update Item Integration Test', () => {
  let seededItems: Item[];

  beforeEach(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  const toPersistedItemData = (item: Item) => ({
    id: item.id,
    itemCode: item.itemCode,
    name: item.name,
    itemType: item.itemType,
    unitOfMeasure: item.unitOfMeasure,
    makeBuy: item.makeBuy,
    leadTimeDays: item.leadTimeDays,
    safetyStock: Number(item.safetyStock),
    version: item.version,
    active: item.active,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });

  const getPersistedItem = async (id: string) => {
    const item = await getApp().get(DbService).item.findUnique({ where: { id } });
    return item ? toPersistedItemData(item) : null;
  };

  const assertItemDataUnchanged = async <T>(id: string, action: () => Promise<T>): Promise<T> => {
    const before = await getPersistedItem(id);
    const result = await action();
    expect(await getPersistedItem(id)).toEqual(before);
    return result;
  };

  describe('Success test', () => {
    it.each(updateItemTestCases)('$description', async ({ body, expected }) => {
      const item = seededItems[1];
      const response = await request(getApp().getHttpServer())
        .patch(UPDATE_ITEM_URL(item.id))
        .send({ ...body, version: item.version });

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(expect.objectContaining({ id: item.id, ...expected }));
    });
  });

  describe('Business Logic test', () => {
    it('when item does not exist should return a not found error', async () => {
      const missingId = '00000000-0000-4000-8000-000000000000';
      const response = await assertItemDataUnchanged(missingId, () =>
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(missingId))
          .send({ name: 'Updated name', version: 1 }),
      );

      expect(response.status).toBe(404);
      expect(response.body.state).toBe('error');
      expect(response.body.data).toBeNull();
      expect(response.body.error).toEqual({
        code: 'ITEM_NOT_FOUND',
        message: `Item with ID ${missingId} not found`,
      });
    });

    it('when two requests update the same version concurrently should reject the stale update', async () => {
      const item = seededItems[1];

      const responses = await Promise.all([
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(item.id))
          .send({ name: 'Concurrent update A', version: item.version }),
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(item.id))
          .send({ name: 'Concurrent update B', version: item.version }),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ITEM_ALREADY_IN_USE',
      );
      const persistedItem = await getPersistedItem(item.id);
      expect(persistedItem?.version).toBe(item.version + 1);
      expect(persistedItem?.name).toBe(
        responses.find((response) => response.status === 200)?.body.data.name,
      );
      const failedUpdateResponse = await assertItemDataUnchanged(item.id, () =>
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(item.id))
          .send({ name: 'Stale update must not persist', version: item.version }),
      );
      expect(failedUpdateResponse.status).toBe(409);
      expect(failedUpdateResponse.body.error.code).toBe('ITEM_ALREADY_IN_USE');
    });

    it('when item is inactive should reject the update', async () => {
      const inactiveItem = seededItems[42];
      const response = await assertItemDataUnchanged(inactiveItem.id, () =>
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(inactiveItem.id))
          .send({ name: 'Updated inactive item', version: inactiveItem.version }),
      );

      expect(response.status).toBe(409);
      expect(response.body.error).toEqual({
        code: 'ITEM_NOT_ACTIVE',
        message: `Item with ID ${inactiveItem.id} is inactive`,
      });
    });
  });

  describe('Validation Error test', () => {
    it.each(updateItemValidationTestCases)('$description', async ({ body, field }) => {
      const item = seededItems[1];
      const response = await assertItemDataUnchanged(item.id, () =>
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(item.id))
          .send({ version: item.version, ...body }),
      );

      assertValidationError(response, field);
    });

    it('when version is missing should return a validation error', async () => {
      const item = seededItems[1];
      const response = await assertItemDataUnchanged(item.id, () =>
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(item.id))
          .send({ name: 'Updated name' }),
      );

      assertValidationError(response, 'version');
    });

    it.each(['not-a-uuid', '123'])(
      'when item id %s is not a valid UUID should return a validation error',
      async (id) => {
        const response = await assertItemDataUnchanged(seededItems[1].id, () =>
          request(getApp().getHttpServer())
            .patch(UPDATE_ITEM_URL(id))
            .send({ name: 'Updated name', version: 1 }),
        );

        assertValidationError(response, 'id');
      },
    );
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'update').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await assertItemDataUnchanged(seededItems[1].id, () =>
        request(getApp().getHttpServer())
          .patch(UPDATE_ITEM_URL(seededItems[1].id))
          .send({ name: 'Updated name', version: 1 }),
      );

      assertServerError(response);
    });
  });
});
