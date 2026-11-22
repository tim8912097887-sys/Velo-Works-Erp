import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { Item } from '../../../generated/prisma/client.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';
import { getApp } from '../../setup.js';
import { resetDb } from '../../utils/common/db-reset.js';
import { seedItems } from '../../utils/item-service/seed/item.seed.js';
import {
  seedBomComponent,
  seedBomHeader,
} from '../../utils/bom-service/seed/bom.seed.js';
import {
  activateBomRevisionUrl,
  copyBomRevisionUrl,
  copyBomBody,
  createBomBody,
  getBomRevisionsUrl,
  getBomRevisionUrl,
  updateBomBody,
} from '../../utils/bom-service/test-data.js';

describe('Cross-endpoint BOM concurrency', () => {
  let seededItems: Item[];

  beforeAll(async () => {
    await resetDb();
    seededItems = (await seedItems()) as unknown as Item[];
  });

  it('when create and copy race on the same item should create only one draft', async () => {
    const parent = seededItems[35];
    const source = await seedBomHeader(
      parent.id,
      new Date('2026-01-01T00:00:00.000Z'),
      null,
      'ACTIVE',
    );
    await seedBomComponent(source.id, seededItems[0].id);

    const responses = await Promise.all([
      request(getApp().getHttpServer())
        .post(getBomRevisionsUrl(parent.id))
        .send({
          ...createBomBody,
          revision: 'CROSS-CREATE-RACE',
          components: [{ componentItemId: seededItems[0].id, quantityPer: 1 }],
        }),
      request(getApp().getHttpServer())
        .post(copyBomRevisionUrl(parent.id, source.id))
        .send({ ...copyBomBody, newRevision: 'CROSS-COPY-RACE' }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(responses.find(({ status }) => status === 409)?.body.error.code).toBe(
      'BOM_DRAFT_ALREADY_EXISTS',
    );
    expect(
      await getApp()
        .get(DbService)
        .bomHeader.count({ where: { parentItemId: parent.id, status: 'DRAFT' } }),
    ).toBe(1);
  });

  it('when update and activate race on the same draft should leave exactly one active revision', async () => {
    const parent = seededItems[38];
    const draft = await seedBomHeader(
      parent.id,
      new Date('2026-01-01T00:00:00.000Z'),
      null,
      'DRAFT',
    );
    await seedBomComponent(draft.id, seededItems[0].id);

    const responses = await Promise.all([
      request(getApp().getHttpServer())
        .put(getBomRevisionUrl(parent.id, draft.id))
        .send({
          ...updateBomBody,
          components: [{ componentItemId: seededItems[0].id, quantityPer: 2 }],
        }),
      request(getApp().getHttpServer()).post(activateBomRevisionUrl(parent.id, draft.id)),
    ]);

    const statuses = responses.map(({ status }) => status).sort();
    expect(statuses.length).toBe(2);
    expect(statuses).toEqual(
      expect.arrayContaining([200]),
    );
    const unexpectedStatus = responses.find(({ status }) => status !== 200 && status !== 409);
    expect(unexpectedStatus).toBeUndefined();
    const conflict = responses.find(({ status }) => status === 409);
    if (conflict) {
      expect(['BOM_REVISION_NOT_DRAFT', 'BOM_REVISION_VERSION_CONFLICT']).toContain(
        conflict.body.error.code,
      );
    }

    const persistedDraft = await getApp()
      .get(DbService)
      .bomHeader.findUnique({
        where: { id: draft.id },
        include: { components: true },
      });
    expect(persistedDraft?.status).toBe('ACTIVE');
    expect(persistedDraft?.components).toHaveLength(1);
    expect([1, 2]).toContain(persistedDraft?.version);
    expect([1, 2]).toContain(Number(persistedDraft?.components[0].quantityPer));
    expect(
      await getApp()
        .get(DbService)
        .bomHeader.count({ where: { parentItemId: parent.id, status: 'ACTIVE' } }),
    ).toBe(1);
  });
});