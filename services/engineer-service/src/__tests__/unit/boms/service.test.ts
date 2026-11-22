import { createBom } from '../../utils/bom-service/factory/factory.js';
import { BomsService } from '../../../domains/boms/boms.service.js';
import { describe, it, expect, vi } from 'vitest';
import { ReturnBomExplosionDto } from '../../../domains/boms/dto/bom-explode.dto.js';
import { BomRevisionHasNoComponentsError } from '../../../domains/boms/errors/bom-revision-has-no-components.error.js';
import { BomCircularReferenceError } from '../../../domains/boms/errors/bom-circular-reference.error.js';
import { ItemNotFoundError } from '../../../domains/items/errors/item-not-found.error.js';
import { BomRevisionNotFoundError } from '../../../domains/boms/errors/bom-revision-not-found.error.js';
import { ReferencedBomRevisionNotFoundError } from '../../../domains/boms/errors/referenced-bom-revision-not-found.error.js';
import { ItemNotActiveError } from '../../../domains/items/errors/item-not-active.error.js';
import { BomParentItemNotEligibleError } from '../../../domains/boms/errors/bom-parent-item-not-eligible.error.js';
import { ComponentItemNotFoundError } from '../../../domains/boms/errors/component-item-not-found.error.js';
import { BomSelfReferenceError } from '../../../domains/boms/errors/bom-self-reference.error.js';
import { ComponentItemInactiveError } from '../../../domains/boms/errors/component-item-inactive.error.js';
import { BomComponentItemTypeNotAllowedError } from '../../../domains/boms/errors/bom-component-item-type-not-allowed.error.js';

function createTestContext() {
  const repo = {
    findBomHeadersByRevisions: vi.fn().mockResolvedValue([]),
    findBomHeader: vi.fn(),
    findItemsByIds: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    copy: vi.fn(),
    findItemById: vi.fn().mockResolvedValue({
      id: 'A',
      active: true,
      itemType: 'FINISHED_GOOD',
      makeBuy: 'MAKE',
    }),
  };

  const service = new BomsService(repo as any);
  return { repo, service };
}

function getTotalQty(result: ReturnBomExplosionDto, componentItemId: string): number | undefined {
  return result.requirementSummary.find((summary) => summary.componentItemId === componentItemId)
    ?.totalQuantity;
}

describe('BOM create/update/copy service validation', () => {
  it('should reject a missing parent item before create', async () => {
    const { repo, service } = createTestContext();
    repo.findItemById.mockResolvedValueOnce(null);

    await expect(
      service.create('MISSING', {
        revision: 'R1',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        components: [{ componentItemId: 'B', componentRevision: null, quantityPer: 1, scrapRate: 0, operationSeq: null }],
      }),
    ).rejects.toThrow(ItemNotFoundError);
  });

  it('should reject an inactive parent item before update', async () => {
    const { repo, service } = createTestContext();
    repo.findItemById.mockResolvedValueOnce({ id: 'A', active: false, itemType: 'SUBASSEMBLY', makeBuy: 'MAKE' });

    await expect(
      service.update('A', 'bom-1', {
        version: 1,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        components: [{ componentItemId: 'B', componentRevision: null, quantityPer: 1, scrapRate: 0, operationSeq: null }],
      }),
    ).rejects.toThrow(ItemNotActiveError);
  });

  it('should reject a raw-material or buy parent item', async () => {
    const { repo, service } = createTestContext();
    repo.findItemById.mockResolvedValueOnce({ id: 'A', active: true, itemType: 'RAW_MATERIAL', makeBuy: 'BUY' });

    await expect(
      service.copyRevision('A', 'bom-1', {
        newRevision: 'R2',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
      }),
    ).rejects.toThrow(BomParentItemNotEligibleError);
  });

  it('should reject a missing component item', async () => {
    const { repo, service } = createTestContext();
    repo.findItemsByIds.mockResolvedValueOnce([]);

    await expect(
      service.create('A', {
        revision: 'R1',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        components: [{ componentItemId: 'MISSING', componentRevision: null, quantityPer: 1, scrapRate: 0, operationSeq: null }],
      }),
    ).rejects.toThrow(ComponentItemNotFoundError);
  });

  it('should reject a component that references the parent', async () => {
    const { repo, service } = createTestContext();
    repo.findItemsByIds.mockResolvedValueOnce([{ id: 'A', active: true, itemType: 'SUBASSEMBLY', makeBuy: 'MAKE' }]);

    await expect(
      service.create('A', {
        revision: 'R1',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        components: [{ componentItemId: 'A', componentRevision: null, quantityPer: 1, scrapRate: 0, operationSeq: null }],
      }),
    ).rejects.toThrow(BomSelfReferenceError);
  });

  it('should reject an inactive component', async () => {
    const { repo, service } = createTestContext();
    repo.findItemsByIds.mockResolvedValueOnce([{ id: 'B', active: false, itemType: 'SUBASSEMBLY', makeBuy: 'MAKE' }]);

    await expect(
      service.update('A', 'bom-1', {
        version: 1,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        components: [{ componentItemId: 'B', componentRevision: null, quantityPer: 1, scrapRate: 0, operationSeq: null }],
      }),
    ).rejects.toThrow(ComponentItemInactiveError);
  });

  it('should reject a finished-good component', async () => {
    const { repo, service } = createTestContext();
    repo.findItemsByIds.mockResolvedValueOnce([{ id: 'B', active: true, itemType: 'FINISHED_GOOD', makeBuy: 'MAKE' }]);

    await expect(
      service.create('A', {
        revision: 'R1',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        components: [{ componentItemId: 'B', componentRevision: null, quantityPer: 1, scrapRate: 0, operationSeq: null }],
      }),
    ).rejects.toThrow(BomComponentItemTypeNotAllowedError);
  });
});

describe('bfsBom (via explodeRevision)', () => {
  it('should explode single level bom', async () => {
    const { repo, service } = createTestContext();

    // A -> B (x2), C (x4)
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        { componentItemId: 'B', quantityPer: 2 },
        { componentItemId: 'C', quantityPer: 4 },
      ],
    });
    repo.findBomHeader.mockResolvedValueOnce(rootBom);

    const result = await service.explodeRevision(rootBom.parentItemId, rootBom.id, 1);

    expect(result).toBeInstanceOf(ReturnBomExplosionDto);
    expect(result.root.id).toBe(rootBom.id);
    expect(repo.findBomHeader).toHaveBeenCalledTimes(1);
    expect(repo.findBomHeadersByRevisions).not.toHaveBeenCalled();
    expect(getTotalQty(result, 'B')).toBe(2);
    expect(getTotalQty(result, 'C')).toBe(4);
    expect(result.tree).toEqual([
      {
        level: 1,
        parentItemId: 'A',
        componentItemId: 'B',
        quantityPer: 2,
        scrapRate: 0,
        subBomId: null,
      },
      {
        level: 1,
        parentItemId: 'A',
        componentItemId: 'C',
        quantityPer: 4,
        scrapRate: 0,
        subBomId: null,
      },
    ]);
  });

  it('should explode multi-level bom across 3 levels and skip query when leaf level has no sub-boms', async () => {
    const { repo, service } = createTestContext();

    // Level 1: A -> B (R1, x2), C (x4)
    // Level 2: B -> D (R1, x3)
    // Level 3: D -> E (x5)
    const bomD = createBom({
      parentItemId: 'D',
      revision: 'R1',
      components: [{ componentItemId: 'E', quantityPer: 5 }],
    });
    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 3, componentRevision: 'R1' }],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        { componentItemId: 'B', quantityPer: 2, componentRevision: 'R1' },
        { componentItemId: 'C', quantityPer: 4 },
      ],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([bomB]).mockResolvedValueOnce([bomD]);

    const result = await service.explodeRevision(rootBom.parentItemId, rootBom.id, 1);

    expect(repo.findBomHeader).toHaveBeenCalledTimes(1);
    expect(repo.findBomHeadersByRevisions).toHaveBeenCalledTimes(2);
    expect(getTotalQty(result, 'B')).toBe(2);
    expect(getTotalQty(result, 'C')).toBe(4);
    expect(getTotalQty(result, 'D')).toBe(6);
    expect(getTotalQty(result, 'E')).toBe(30);
    expect(result.tree).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 1,
          parentItemId: 'A',
          componentItemId: 'B',
          subBomId: bomB.id,
        }),
        expect.objectContaining({
          level: 2,
          parentItemId: 'B',
          componentItemId: 'D',
          subBomId: bomD.id,
        }),
        expect.objectContaining({
          level: 3,
          parentItemId: 'D',
          componentItemId: 'E',
          subBomId: null,
        }),
      ]),
    );
  });

  it('should scale quantities with rootQuantity greater than 1', async () => {
    const { repo, service } = createTestContext();

    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 3 }],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        { componentItemId: 'B', quantityPer: 2, componentRevision: 'R1' },
        { componentItemId: 'C', quantityPer: 4 },
      ],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([bomB]);

    const result = await service.explodeRevision(rootBom.parentItemId, rootBom.id, 5);

    expect(getTotalQty(result, 'B')).toBe(10);
    expect(getTotalQty(result, 'C')).toBe(20);
    expect(getTotalQty(result, 'D')).toBe(30);
  });

  it('should apply scrapRate formula and propagate adjusted quantity to sub-boms', async () => {
    const { repo, service } = createTestContext();

    // B: quantityPer = 2, scrapRate = 0.2 => requiredQty = 2 / (1 - 0.2) = 2.5
    // D (under B): quantityPer = 4, scrapRate = 0.5, cumulativeQty = 2.5 => (4 * 2.5) / 0.5 = 20
    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 4, scrapRate: 0.5 }],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        {
          componentItemId: 'B',
          quantityPer: 2,
          scrapRate: 0.2,
          componentRevision: 'R1',
        },
      ],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([bomB]);

    const result = await service.explodeRevision(rootBom.parentItemId, rootBom.id, 1);

    expect(getTotalQty(result, 'B')).toBe(2.5);
    expect(getTotalQty(result, 'D')).toBe(20);
  });

  it('should accumulate component requirements across multiple branches', async () => {
    const { repo, service } = createTestContext();

    // A -> B (R1, x2), C (R1, x3), D (x1)
    // B -> D (x5)
    // C -> D (x2)
    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 5 }],
    });
    const bomC = createBom({
      parentItemId: 'C',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 2 }],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        { componentItemId: 'B', quantityPer: 2, componentRevision: 'R1' },
        { componentItemId: 'C', quantityPer: 3, componentRevision: 'R1' },
        { componentItemId: 'D', quantityPer: 1 },
      ],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([bomB, bomC]);

    const result = await service.explodeRevision(rootBom.parentItemId, rootBom.id, 1);

    // D = 1 + (2 * 5) + (3 * 2) = 17
    expect(getTotalQty(result, 'D')).toBe(17);
  });

  it('should allow diamond dependencies without throwing a circular reference error', async () => {
    const { repo, service } = createTestContext();

    // A -> B (R1, x1), C (R1, x1)
    // B -> D (R1, x2)
    // C -> D (R1, x3)
    // D -> E (x10)
    const bomD = createBom({
      parentItemId: 'D',
      revision: 'R1',
      components: [{ componentItemId: 'E', quantityPer: 10 }],
    });
    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 2, componentRevision: 'R1' }],
    });
    const bomC = createBom({
      parentItemId: 'C',
      revision: 'R1',
      components: [{ componentItemId: 'D', quantityPer: 3, componentRevision: 'R1' }],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        { componentItemId: 'B', quantityPer: 1, componentRevision: 'R1' },
        { componentItemId: 'C', quantityPer: 1, componentRevision: 'R1' },
      ],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions
      .mockResolvedValueOnce([bomB, bomC])
      .mockResolvedValueOnce([bomD]);

    const result = await service.explodeRevision(rootBom.parentItemId, rootBom.id, 1);

    expect(getTotalQty(result, 'D')).toBe(5);
    expect(getTotalQty(result, 'E')).toBe(50);
  });

  it('should throw BomRevisionHasNoComponentsError when root bom has zero components', async () => {
    const { repo, service } = createTestContext();

    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [],
    });
    repo.findBomHeader.mockResolvedValueOnce(rootBom);

    await expect(service.explodeRevision(rootBom.parentItemId, rootBom.id, 1)).rejects.toThrow(
      BomRevisionHasNoComponentsError,
    );

    expect(repo.findBomHeadersByRevisions).not.toHaveBeenCalled();
  });

  it('should throw BomRevisionHasNoComponentsError when sub bom components have zero length', async () => {
    const { repo, service } = createTestContext();

    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [
        { componentItemId: 'B', quantityPer: 2, componentRevision: 'R1' },
        { componentItemId: 'C', quantityPer: 4 },
      ],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([bomB]);

    await expect(service.explodeRevision(rootBom.parentItemId, rootBom.id, 1)).rejects.toThrow(
      BomRevisionHasNoComponentsError,
    );

    expect(repo.findBomHeader).toHaveBeenCalledTimes(1);
    expect(repo.findBomHeadersByRevisions).toHaveBeenCalledTimes(1);
  });

  it('should throw ReferencedBomRevisionNotFoundError when componentRevision does not exist', async () => {
    const { repo, service } = createTestContext();

    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [{ componentItemId: 'B', quantityPer: 2, componentRevision: 'R99' }],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([]);

    await expect(service.explodeRevision(rootBom.parentItemId, rootBom.id, 1)).rejects.toThrow(
      ReferencedBomRevisionNotFoundError,
    );
  });

  it('should throw BomCircularReferenceError on a cycle (A -> B -> A)', async () => {
    const { repo, service } = createTestContext();

    const bomB = createBom({
      parentItemId: 'B',
      revision: 'R1',
      components: [{ componentItemId: 'A', quantityPer: 1, componentRevision: 'R1' }],
    });
    const rootBom = createBom({
      parentItemId: 'A',
      revision: 'R1',
      components: [{ componentItemId: 'B', quantityPer: 2, componentRevision: 'R1' }],
    });

    repo.findBomHeader.mockResolvedValueOnce(rootBom);
    repo.findBomHeadersByRevisions.mockResolvedValueOnce([bomB]).mockResolvedValueOnce([rootBom]);

    await expect(service.explodeRevision(rootBom.parentItemId, rootBom.id, 1)).rejects.toThrow(
      BomCircularReferenceError,
    );
  });

  it('should throw ItemNotFoundError when item does not exist', async () => {
    const { repo, service } = createTestContext();
    repo.findItemById.mockResolvedValueOnce(null);

    await expect(service.explodeRevision('MISSING', 'bom-1', 1)).rejects.toThrow(ItemNotFoundError);
  });

  it('should throw BomRevisionNotFoundError when root bom does not exist', async () => {
    const { repo, service } = createTestContext();
    repo.findBomHeader.mockResolvedValueOnce(null);

    await expect(service.explodeRevision('A', 'MISSING-BOM', 1)).rejects.toThrow(
      BomRevisionNotFoundError,
    );
  });
});
