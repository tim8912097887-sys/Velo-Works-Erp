import { Injectable } from '@nestjs/common';
import { ItemNotFoundError } from '../items/errors/item-not-found.error.js';
import { ItemNotActiveError } from '../items/errors/item-not-active.error.js';
import { CreateBomBody } from './dto/create-bom.dto.js';
import { ReturnBomDto } from './dto/return-bom.dto.js';
import { UpdateBomBody } from './dto/update-bom.dto.js';
import { BomRevisionNotFoundError } from './errors/bom-revision-not-found.error.js';
import { BomSelfReferenceError } from './errors/bom-self-reference.error.js';
import { ComponentItemInactiveError } from './errors/component-item-inactive.error.js';
import { ComponentItemNotFoundError } from './errors/component-item-not-found.error.js';
import { BomParentItemNotEligibleError } from './errors/bom-parent-item-not-eligible.error.js';
import { BomComponentItemTypeNotAllowedError } from './errors/bom-component-item-type-not-allowed.error.js';
import { BomRevisionHasNoComponentsError } from './errors/bom-revision-has-no-components.error.js';
import { ReferencedBomRevisionNotFoundError } from './errors/referenced-bom-revision-not-found.error.js';
import { BomCircularReferenceError } from './errors/bom-circular-reference.error.js';
import { BomRevisionCopyNotAllowedError } from './errors/bom-revision-copy-not-allowed.error.js';
import { BomHeaderWithRelations, BomsRepository } from './boms.repository.js';
import { GetBomRevisionsQuery } from './dto/get-bom-revisions-query.dto.js';
import { ReturnBomRevisionDto } from './dto/return-bom-revision.dto.js';
import { CopyBomBody } from './dto/copy-bom.dto.js';
import { ExplodeTree, ReturnBomExplosionDto } from './dto/bom-explode.dto.js';
import { ReturnBomActivationDto } from './dto/activate-response.dto.js';

@Injectable()
export class BomsService {
  constructor(private readonly bomsRepository: BomsRepository) {}

  async create(itemId: string, body: CreateBomBody): Promise<ReturnBomDto> {
    await this.assertParentItemIsEligible(itemId);

    await this.assertComponentsAreEligible(itemId, body.components);

    const bomHeader = await this.bomsRepository.create(itemId, body);

    return ReturnBomDto.fromBomHeader(bomHeader);
  }

  async update(itemId: string, bomHeaderId: string, body: UpdateBomBody): Promise<ReturnBomDto> {
    await this.assertParentItemIsEligible(itemId);

    await this.assertComponentsAreEligible(itemId, body.components);

    const updatedBomHeader = await this.bomsRepository.update(itemId, bomHeaderId, body);

    return ReturnBomDto.fromBomHeader(updatedBomHeader);
  }

  async findRevisions(itemId: string, query: GetBomRevisionsQuery) {
    await this.assertItemExists(itemId);

    const { revisions, total } = await this.bomsRepository.findBomRevisions(itemId, query);

    return {
      data: revisions.map((revision) => ReturnBomRevisionDto.fromBomHeader(revision)),
      total,
      page: Math.floor(query.offset / query.limit) + 1,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findRevision(itemId: string, bomHeaderId: string): Promise<ReturnBomDto> {
    await this.assertItemExists(itemId);

    const bomHeader = await this.bomsRepository.findBomHeader(itemId, bomHeaderId);

    if (!bomHeader) {
      throw new BomRevisionNotFoundError(bomHeaderId);
    }

    return ReturnBomDto.fromBomHeader(bomHeader);
  }

  async copyRevision(
    itemId: string,
    bomHeaderId: string,
    body: CopyBomBody,
  ): Promise<ReturnBomDto> {
    await this.assertParentItemIsEligible(itemId);

    const source = await this.bomsRepository.findBomHeader(itemId, bomHeaderId);

    if (!source) {
      throw new BomRevisionNotFoundError(bomHeaderId);
    }

    if (source.status === 'DRAFT') {
      throw new BomRevisionCopyNotAllowedError({
        bomHeaderId,
        status: source.status,
      });
    }

    const copiedBomHeader = await this.bomsRepository.copy(source, body);

    return ReturnBomDto.fromBomHeader(copiedBomHeader);
  }

  async explodeRevision(itemId: string, bomHeaderId: string, rootQuantity: number = 1) {
    await this.assertItemExists(itemId);

    const rootBom = await this.bomsRepository.findBomHeader(itemId, bomHeaderId);

    if (!rootBom) {
      throw new BomRevisionNotFoundError(bomHeaderId);
    }

    const { explosionTree, requirementMap } = await this.bfsBom(rootBom, rootQuantity);

    return ReturnBomExplosionDto.fromRawExplosion({
      rootBom,
      requirementMap,
      explosionTree,
    });
  }

  async activateBom(itemId: string, bomHeaderId: string): Promise<ReturnBomActivationDto> {
    const result = await this.bomsRepository.activate(itemId, bomHeaderId);

    return ReturnBomActivationDto.fromActivatedBom({
      activeBom: result.activeBom,
      obsoleteBom: result.obsoleteBom,
    });
  }

  private async assertItemExists(itemId: string): Promise<void> {
    const item = await this.bomsRepository.findItemById(itemId);

    if (!item) {
      throw new ItemNotFoundError(itemId);
    }
  }

  private async assertParentItemIsEligible(itemId: string): Promise<void> {
    const item = await this.bomsRepository.findItemById(itemId);

    if (!item) {
      throw new ItemNotFoundError(itemId);
    }

    if (!item.active) {
      throw new ItemNotActiveError(itemId);
    }

    if (item.itemType === 'RAW_MATERIAL' || item.makeBuy === 'BUY') {
      throw new BomParentItemNotEligibleError({
        parentItemId: itemId,
        itemType: item.itemType,
        makeBuy: item.makeBuy,
      });
    }
  }

  private async assertComponentsAreEligible(
    parentItemId: string,
    components: CreateBomBody['components'],
  ): Promise<void> {
    const componentItems = await this.bomsRepository.findItemsByIds(
      components.map((component) => component.componentItemId),
    );

    const itemsById = new Map(componentItems.map((item) => [item.id, item]));

    for (const component of components) {
      const componentItemId = component.componentItemId;
      const item = itemsById.get(componentItemId);

      if (!item) {
        throw new ComponentItemNotFoundError(componentItemId);
      }

      if (item.id === parentItemId) {
        throw new BomSelfReferenceError(parentItemId);
      }

      if (!item.active) {
        throw new ComponentItemInactiveError(item.id);
      }

      if (item.itemType === 'FINISHED_GOOD') {
        throw new BomComponentItemTypeNotAllowedError({
          componentItemId: item.id,
          itemType: item.itemType,
        });
      }
    }
  }

  /**
   * BFS BOM explosion.
   *
   * Database query count:
   * - One query to load the root BOM.
   * - One batched query for referenced BOMs per depth.
   *
   * No database query is performed for each individual component.
   */
  private async bfsBom(rootBom: BomHeaderWithRelations, rootQuantity: number) {
    const requirementMap = new Map<
      string,
      {
        itemCode: string;
        name: string;
        totalQuantity: number;
      }
    >();

    const explosionTree: ExplodeTree = [];

    type QueueNode = {
      bom: BomHeaderWithRelations;
      level: number;
      cumulativeQty: number;
      path: Set<string>;
    };

    let currentLevel: QueueNode[] = [
      {
        bom: rootBom,
        level: 1,
        cumulativeQty: rootQuantity,
        path: new Set([rootBom.parentItemId]),
      },
    ];

    while (currentLevel.length > 0) {
      /*
       * Batch all referenced BOM lookups at this depth.
       * The pair (parentItemId, revision) uniquely identifies
       * a BOM revision.
       */
      const references = currentLevel.flatMap(({ bom }) =>
        bom.components.flatMap((component) => {
          if (component.componentRevision == null) {
            return [];
          }

          return [
            {
              parentItemId: component.componentItemId,
              revision: component.componentRevision,
            },
          ];
        }),
      );

      const referencedBoms =
        references.length > 0
          ? await this.bomsRepository.findBomHeadersByRevisions(references)
          : [];

      const bomByReference = new Map(
        referencedBoms.map((bom) => [this.bomReferenceKey(bom.parentItemId, bom.revision), bom]),
      );

      const nextLevel: QueueNode[] = [];

      for (const node of currentLevel) {
        const { bom, level, cumulativeQty, path } = node;

        if (bom.components.length === 0) {
          throw new BomRevisionHasNoComponentsError(bom.id);
        }

        for (const component of bom.components) {
          const componentItemId = component.componentItemId;
          const quantityPer = Number(component.quantityPer);
          const scrapRate = Number(component.scrapRate);

          const requiredQty = (quantityPer * cumulativeQty) / (1 - scrapRate);

          // Accumulate requirements across different BOM branches.
          const existingReq = requirementMap.get(componentItemId);

          if (existingReq) {
            existingReq.totalQuantity += requiredQty;
          } else {
            requirementMap.set(componentItemId, {
              itemCode: component.componentItem?.itemCode ?? '',
              name: component.componentItem?.name ?? '',
              totalQuantity: requiredQty,
            });
          }

          let subBom: BomHeaderWithRelations | null = null;

          if (component.componentRevision != null) {
            subBom =
              bomByReference.get(
                this.bomReferenceKey(componentItemId, component.componentRevision),
              ) ?? null;

            // A non-null reference must resolve to an actual BOM.
            if (!subBom) {
              throw new ReferencedBomRevisionNotFoundError({
                parentItemId: componentItemId,
                revision: component.componentRevision,
              });
            }

            // Detect cycles only on actual BOM-reference edges.
            if (path.has(componentItemId)) {
              throw new BomCircularReferenceError([...path, componentItemId]);
            }

            if (subBom.components.length === 0) {
              throw new BomRevisionHasNoComponentsError(subBom.id);
            }
          }

          explosionTree.push({
            level,
            parentItemId: bom.parentItemId,
            componentItemId,
            quantityPer: requiredQty,
            scrapRate,
            subBomId: subBom?.id ?? null,
          });

          if (subBom) {
            const nextPath = new Set(path);
            nextPath.add(componentItemId);

            nextLevel.push({
              bom: subBom,
              level: level + 1,
              cumulativeQty: requiredQty,
              path: nextPath,
            });
          }
        }
      }

      currentLevel = nextLevel;
    }

    return {
      explosionTree,
      requirementMap,
    };
  }

  private bomReferenceKey(parentItemId: string, revision: string): string {
    return JSON.stringify([parentItemId, revision]);
  }
}
