import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { ItemsService } from '../../../domains/items/items.service.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/engineer-service/seed/item.seed.js';
import { GET_ALL_ITEMS_URL } from '../../utils/engineer-service/seed/constants.js';

describe('Item activation integration tests', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  beforeEach(async () => {
    const db = getApp().get(DbService);
    await Promise.all([
      db.item.update({
        where: { id: seededItems[0].id },
        data: { active: true },
      }),
      db.item.update({
        where: { id: seededItems[42].id },
        data: { active: false },
      }),
    ]);
  });

  describe('Activate', () => {
    it('when activating an inactive item should return active true', async () => {
      const item = seededItems[42];
      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${item.id}/activate`,
      );

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.data).toEqual(expect.objectContaining({ id: item.id, active: true }));
    });

    it('when activating an already active item should return a conflict error', async () => {
      const item = seededItems[0];
      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${item.id}/activate`,
      );

      expect(response.status).toBe(409);
      expect(response.body.error).toEqual({
        code: 'ITEM_ALREADY_ACTIVATED',
        message: `Item with ID ${item.id} is already active`,
      });
    });

    it('when activating a missing item should return a not found error', async () => {
      const itemId = '00000000-0000-4000-8000-000000000000';
      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${itemId}/activate`,
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it.each(['not-a-uuid', '123'])(
      'when activating item with malformed ID %s should return a validation error',
      async (itemId) => {
        const response = await request(getApp().getHttpServer()).patch(
          `${GET_ALL_ITEMS_URL}/${itemId}/activate`,
        );

        assertValidationError(response, 'id');
      },
    );

    it('when an unexpected activation error occurs should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'activate').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${seededItems[42].id}/activate`,
      );

      assertServerError(response);
    });

    it('when two requests activate the same item concurrently should activate only once', async () => {
      const item = seededItems[42];
      const responses = await Promise.all([
        request(getApp().getHttpServer()).patch(`${GET_ALL_ITEMS_URL}/${item.id}/activate`),
        request(getApp().getHttpServer()).patch(`${GET_ALL_ITEMS_URL}/${item.id}/activate`),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ITEM_ALREADY_ACTIVATED',
      );
    });
  });

  describe('Inactivate', () => {
    it('when inactivating an active item should return active false', async () => {
      const item = seededItems[0];
      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${item.id}/inactivate`,
      );

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.data).toEqual(expect.objectContaining({ id: item.id, active: false }));
    });

    it('when inactivating an already inactive item should return a conflict error', async () => {
      const item = seededItems[42];
      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${item.id}/inactivate`,
      );

      expect(response.status).toBe(409);
      expect(response.body.error).toEqual({
        code: 'ITEM_ALREADY_INACTIVATED',
        message: `Item with ID ${item.id} is already inactive`,
      });
    });

    it('when inactivating a missing item should return a not found error', async () => {
      const itemId = '00000000-0000-4000-8000-000000000000';
      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${itemId}/inactivate`,
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    it.each(['not-a-uuid', '123'])(
      'when inactivating item with malformed ID %s should return a validation error',
      async (itemId) => {
        const response = await request(getApp().getHttpServer()).patch(
          `${GET_ALL_ITEMS_URL}/${itemId}/inactivate`,
        );

        assertValidationError(response, 'id');
      },
    );

    it('when an unexpected inactivation error occurs should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'inactivate').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(getApp().getHttpServer()).patch(
        `${GET_ALL_ITEMS_URL}/${seededItems[0].id}/inactivate`,
      );

      assertServerError(response);
    });

    it('when two requests inactivate the same item concurrently should inactivate only once', async () => {
      const item = seededItems[0];
      const responses = await Promise.all([
        request(getApp().getHttpServer()).patch(`${GET_ALL_ITEMS_URL}/${item.id}/inactivate`),
        request(getApp().getHttpServer()).patch(`${GET_ALL_ITEMS_URL}/${item.id}/inactivate`),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ITEM_ALREADY_INACTIVATED',
      );
    });
  });
});
