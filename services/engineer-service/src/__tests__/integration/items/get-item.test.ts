import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { ReturnItemDto } from '../../../domains/items/dto/return-item.dto.js';
import { ItemsService } from '../../../domains/items/items.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { GET_ITEM_URL } from '../../utils/item-service/seed/constants.js';

describe('Get Item Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('Success test', () => {
    it('when an item exists should return the matching item', async () => {
      const item = seededItems[0];
      const response = await request(getApp().getHttpServer()).get(GET_ITEM_URL(item.id));

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(ReturnItemDto.toDomainItem(item));
    });
  });

  describe('Business Logic test', () => {
    it('when an item does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer()).get(
        GET_ITEM_URL('00000000-0000-4000-8000-000000000000'),
      );

      expect(response.status).toBe(404);
      expect(response.body.state).toBe('error');
      expect(response.body.data).toBeNull();
      expect(response.body.error).toEqual({
        code: 'ITEM_NOT_FOUND',
        message: 'Item with ID 00000000-0000-4000-8000-000000000000 not found',
      });
    });
  });

  describe('Validation Error test', () => {
    it.each(['not-a-uuid', '123'])(
      'when item id %s is not a valid UUID should return a validation error',
      async (id) => {
        const response = await request(getApp().getHttpServer()).get(GET_ITEM_URL(id));

        assertValidationError(response, 'id');
      },
    );
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'findOne').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(getApp().getHttpServer()).get(GET_ITEM_URL(seededItems[0].id));

      assertServerError(response);
    });
  });
});
