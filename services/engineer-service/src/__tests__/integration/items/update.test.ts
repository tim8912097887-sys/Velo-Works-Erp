import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { ItemsService } from '../../../domains/items/items.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/engineer-service/seed/item.seed.js';
import { GET_ALL_ITEMS_URL } from '../../utils/engineer-service/seed/constants.js';
import {
  updateItemTestCases,
  updateItemValidationTestCases,
} from '../../utils/engineer-service/items/test-cases/update.test-cases.js';

describe('Update Item Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('Success test', () => {
    it.each(updateItemTestCases)('$description', async ({ body, expected }) => {
      const item = seededItems[1];
      const response = await request(getApp().getHttpServer())
        .patch(`${GET_ALL_ITEMS_URL}/${item.id}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(expect.objectContaining({ id: item.id, ...expected }));
    });
  });

  describe('Business Logic test', () => {
    it('when item does not exist should return a not found error', async () => {
      const missingId = '00000000-0000-4000-8000-000000000000';
      const response = await request(getApp().getHttpServer())
        .patch(`${GET_ALL_ITEMS_URL}/${missingId}`)
        .send({ name: 'Updated name' });

      expect(response.status).toBe(404);
      expect(response.body.state).toBe('error');
      expect(response.body.data).toBeNull();
      expect(response.body.error).toEqual({
        code: 'ITEM_NOT_FOUND',
        message: `Item with ID ${missingId} not found`,
      });
    });
  });

  describe('Validation Error test', () => {
    it.each(updateItemValidationTestCases)('$description', async ({ body, field }) => {
      const response = await request(getApp().getHttpServer())
        .patch(`${GET_ALL_ITEMS_URL}/${seededItems[1].id}`)
        .send(body);

      assertValidationError(response, field);
    });

    it.each(['not-a-uuid', '123'])(
      'when item id %s is not a valid UUID should return a validation error',
      async (id) => {
        const response = await request(getApp().getHttpServer())
          .patch(`${GET_ALL_ITEMS_URL}/${id}`)
          .send({ name: 'Updated name' });

        assertValidationError(response, 'id');
      },
    );
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'update').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(getApp().getHttpServer())
        .patch(`${GET_ALL_ITEMS_URL}/${seededItems[1].id}`)
        .send({ name: 'Updated name' });

      assertServerError(response);
    });
  });
});
