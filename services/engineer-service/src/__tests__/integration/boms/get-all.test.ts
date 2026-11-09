import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { BomsService } from '../../../domains/boms/boms.service.js';
import { getApp } from '../../setup.js';
import { assertServerError, assertValidationError } from '../../utils/common/assertion.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import { seedBomHeader, seedBomHeaders } from '../../utils/bom-service/seed/bom.seed.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getBomRevisionsUrl } from '../../utils/bom-service/test-data.js';
import { getBomRevisionsValidationTestCases } from '../../utils/bom-service/test-cases/get-all.test-cases.js';

describe('Get All BOM Revisions Integration Test', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
    await seedBomHeaders(seededItems[1].id, 2);
    await seedBomHeader(seededItems[1].id, new Date('2026-01-01T00:00:00.000Z'), null, 'DRAFT');
    await seedBomHeader(seededItems[1].id, new Date('2026-01-01T00:00:00.000Z'), null, 'ACTIVE');
  });

  describe('Success test', () => {
    it('when BOM revisions exist should return the matching revisions and pagination', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionsUrl(seededItems[1].id),
      );

      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.error).toBeNull();
      expect(response.body.data).toHaveLength(4);
      expect(response.body.meta.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 4,
        totalPages: 1,
      });
      expect(
        response.body.data.every(
          (revision: { parentItem: { id: string } }) =>
            revision.parentItem.id === seededItems[1].id,
        ),
      ).toBe(true);
    });

    it.each([
      {
        description: 'when revisions are filtered, sorted, and paginated',
        query: {
          status: 'OBSOLETE',
          offset: '1',
          limit: '1',
          sortBy: 'revision',
          sortOrder: 'asc',
        },
      },
      {
        description: 'when revisions are sorted by creation time and filtered by status',
        query: {
          status: 'ACTIVE',
          offset: '0',
          limit: '1',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      },
    ])(
      '$description should return the matching page and pagination metadata',
      async ({ query }) => {
        const offset = Number(query.offset);
        const limit = Number(query.limit);
        const sortMultiplier = query.sortOrder === 'asc' ? 1 : -1;
        const revisions = await getApp()
          .get(DbService)
          .bomHeader.findMany({
            where: { parentItemId: seededItems[1].id },
          });
        const expected = revisions
          .filter((revision) => revision.status === query.status)
          .sort((first, second) => {
            const firstValue =
              query.sortBy === 'revision' ? first.revision : first.createdAt.getTime();
            const secondValue =
              query.sortBy === 'revision' ? second.revision : second.createdAt.getTime();
            const comparison =
              typeof firstValue === 'string' && typeof secondValue === 'string'
                ? firstValue.localeCompare(secondValue)
                : Number(firstValue) - Number(secondValue);

            return comparison * sortMultiplier || first.id.localeCompare(second.id);
          });
        const queryString = new URLSearchParams(query);
        const response = await request(getApp().getHttpServer()).get(
          `${getBomRevisionsUrl(seededItems[1].id)}?${queryString.toString()}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.data.map((revision: { id: string }) => revision.id)).toEqual(
          expected.slice(offset, offset + limit).map(({ id }) => id),
        );
        expect(response.body.meta.pagination).toEqual({
          page: Math.floor(offset / limit) + 1,
          limit,
          total: expected.length,
          totalPages: Math.ceil(expected.length / limit),
        });
      },
    );
  });

  describe('Business Logic test', () => {
    it('when parent item does not exist should return a not found error', async () => {
      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionsUrl('00000000-0000-4000-8000-000000000088'),
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('Validation Error test', () => {
    it.each(getBomRevisionsValidationTestCases)(
      '$description',
      async ({ itemId, query, field }) => {
        const queryString = query ? `?${new URLSearchParams(query).toString()}` : '';
        const response = await request(getApp().getHttpServer()).get(
          `${getBomRevisionsUrl(itemId)}${queryString}`,
        );

        assertValidationError(response, field);
      },
    );
  });

  describe('Server Error test', () => {
    it('when the service throws an unexpected error should return a masked server error', async () => {
      const findRevisions = vi
        .spyOn(getApp().get(BomsService), 'findRevisions')
        .mockRejectedValue(new Error('Unexpected database failure'));

      const response = await request(getApp().getHttpServer()).get(
        getBomRevisionsUrl(seededItems[1].id),
      );

      assertServerError(response);
      expect(findRevisions).toHaveBeenCalled();
    });
  });
});
