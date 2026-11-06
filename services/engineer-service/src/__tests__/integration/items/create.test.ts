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
  createItemTestCases,
  createItemValidationTestCases,
} from '../../utils/engineer-service/items/test-cases/create.test-cases.js';

describe('Create Item Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  describe('Success test', () => {
    it.each(createItemTestCases)('$description', async ({ body }) => {
      const response = await request(getApp().getHttpServer()).post(GET_ALL_ITEMS_URL).send(body);

      expect(response.status).toBe(201);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          ...body,
          itemCode: body.itemCode.trim(),
          name: body.name.trim(),
          unitOfMeasure: body.unitOfMeasure.trim(),
        }),
      );
    });
  });

  describe('Business Logic test', () => {
    it('when itemCode already exists should return a conflict error', async () => {
      const response = await request(getApp().getHttpServer())
        .post(GET_ALL_ITEMS_URL)
        .send({
          itemCode: seededItems[0].itemCode,
          name: 'Duplicate item',
          itemType: 'RAW_MATERIAL',
          unitOfMeasure: 'PCS',
          makeBuy: 'BUY',
          leadTimeDays: 5,
          safetyStock: 0,
        });

      expect(response.status).toBe(409);
      expect(response.body.state).toBe('error');
      expect(response.body.data).toBeNull();
      expect(response.body.error).toEqual({
        code: 'ITEM_ALREADY_EXISTS',
        message: `Item with code ${seededItems[0].itemCode} already exists`,
      });
    });
  });

  describe('Validation Error test', () => {
    it.each(createItemValidationTestCases)('$description', async ({ body, field }) => {
      const response = await request(getApp().getHttpServer()).post(GET_ALL_ITEMS_URL).send(body);

      assertValidationError(response, field);
    });
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      vi.spyOn(getApp().get(ItemsService), 'create').mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(getApp().getHttpServer())
        .post(GET_ALL_ITEMS_URL)
        .send(createItemTestCases[0].body);

      assertServerError(response);
    });
  });
});
