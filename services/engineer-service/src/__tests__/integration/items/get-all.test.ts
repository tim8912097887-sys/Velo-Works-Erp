import request from 'supertest';
import { seedItems } from '../../utils/engineer-service/seed/item.seed.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { getApp } from '../../setup.js';
import { ReturnItemDto } from '../../../domains/items/dto/return-item.dto.js';
import { Item } from '../../../generated/prisma/client.js';
import { GET_ALL_ITEMS_URL } from '../../utils/engineer-service/seed/constants.js';
import { ItemsService } from '../../../domains/items/items.service.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import {
  getAllItemsTestCases,
  getAllItemsValidationTestCases,
} from '../../utils/engineer-service/items/test-cases/get-all.test-cases.js';

describe('Get All Items Integration Test', () => {
  beforeAll(async () => {
    await resetDb();
  });

  describe('Pagination, Filtering, Search Sorting test', () => {
    let seededItems: Item[];
    beforeAll(async () => {
      seededItems = (await seedItems()) as unknown as Item[];
    });

    it.each(getAllItemsTestCases)('$description', async ({ query }) => {
      const { itemType, makeBuy, sortBy, sortOrder } = query;
      const search = query.search?.trim();
      const offset = Number(query.offset ?? 0);
      const limit = Number(query.limit ?? 20);
      const filteredItems = seededItems
        .filter((item) => !itemType || item.itemType === itemType)
        .filter((item) => !makeBuy || item.makeBuy === makeBuy)
        .filter((item) => !search || item.name.includes(search) || item.itemCode.includes(search));

      if (sortBy) {
        filteredItems.sort((first, second) => {
          const firstValue =
            sortBy === 'itemCode'
              ? first.itemCode
              : sortBy === 'name'
                ? first.name
                : first.leadTimeDays;
          const secondValue =
            sortBy === 'itemCode'
              ? second.itemCode
              : sortBy === 'name'
                ? second.name
                : second.leadTimeDays;
          const comparison =
            typeof firstValue === 'string' && typeof secondValue === 'string'
              ? firstValue.localeCompare(secondValue)
              : Number(firstValue) - Number(secondValue);

          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      const expectedItems = filteredItems
        .slice(offset, offset + limit)
        .map((item) => ReturnItemDto.toDomainItem(item));
      const queryString = new URLSearchParams(query);
      const response = await request(getApp().getHttpServer()).get(
        `${GET_ALL_ITEMS_URL}?${queryString.toString()}`,
      );

      expect(response.status).toBe(200);
      if (sortBy === 'leadTimeDays') {
        expect(response.body.data).toHaveLength(expectedItems.length);
        expect(response.body.data.map((item: ReturnItemDto) => item.itemCode).sort()).toEqual(
          expectedItems.map((item) => item.itemCode).sort(),
        );
        expect(response.body.data.map((item: ReturnItemDto) => item.leadTimeDays)).toEqual(
          [...response.body.data.map((item: ReturnItemDto) => item.leadTimeDays)].sort(
            (first, second) => (sortOrder === 'desc' ? second - first : first - second),
          ),
        );
      } else if (sortBy) {
        expect(response.body.data).toEqual(expectedItems);
      } else {
        expect(response.body.data.map((item: ReturnItemDto) => item.id).sort()).toEqual(
          expectedItems.map((item) => item.id).sort(),
        );
      }
    });

    it('includes the active state for every returned item', async () => {
      const response = await request(getApp().getHttpServer()).get(GET_ALL_ITEMS_URL);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.every((item: ReturnItemDto) => typeof item.active === 'boolean'),
      ).toBe(true);
    });
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'findAll').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(getApp().getHttpServer()).get(GET_ALL_ITEMS_URL);

      assertServerError(response);
    });
  });

  describe('Validation Error test', () => {
    it.each(getAllItemsValidationTestCases)('$description', async ({ query, field }) => {
      const queryString = new URLSearchParams(query);
      const response = await request(getApp().getHttpServer()).get(
        `${GET_ALL_ITEMS_URL}?${queryString.toString()}`,
      );

      assertValidationError(response, field);
    });
  });
});
