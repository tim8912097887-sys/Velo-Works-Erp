import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastruture/persistence/db.service.js';
import { Item, Prisma } from '../../generated/prisma/client.js';
import { CreateBomBody } from './dto/create-bom.dto.js';
import { UpdateBomBody } from './dto/update-bom.dto.js';
import { BomRevisionNotFoundError } from './errors/bom-revision-not-found.error.js';
import { BomRevisionNotDraftError } from './errors/bom-revision-not-draft.error.js';
import { BomRevisionAlreadyExistsError } from './errors/bom-revision-already-exists.error.js';
import { BomDraftAlreadyExistsError } from './errors/bom-draft-already-exists.error.js';
import { CopyBomBody } from './dto/copy-bom.dto.js';
import { GetBomRevisionsQuery } from './dto/get-bom-revisions-query.dto.js';
import { ItemNotFoundError } from '../items/errors/item-not-found.error.js';
import { ItemNotActiveError } from '../items/errors/item-not-active.error.js';
import { BomParentItemNotEligibleError } from './errors/bom-parent-item-not-eligible.error.js';
import { BomRevisionVersionConflictError } from './errors/bom-revision-version-conflict.error.js';
import { MultipleActiveBomRevisionsError } from './errors/multiple-active-bom-revisions.error.js';
import { BomRevisionHasNoComponentsError } from './errors/bom-revision-has-no-components.error.js';
import { ComponentItemNotFoundError } from './errors/component-item-not-found.error.js';
import { ComponentItemInactiveError } from './errors/component-item-inactive.error.js';
import { BomComponentItemTypeNotAllowedError } from './errors/bom-component-item-type-not-allowed.error.js';
import { ReferencedBomRevisionNotFoundError } from './errors/referenced-bom-revision-not-found.error.js';
import { BomCircularReferenceError } from './errors/bom-circular-reference.error.js';
import { ReferencedBomRevisionNotActiveError } from './errors/referenced-bom-revision-not-active.error.js';
import { BomActivationConflictError } from './errors/bom-activation-conflict.error.js';
import { BomRevisionActivationConflictError } from './errors/bom-revision-activation-conflict.error.js';
import { ActivatedBomResult } from './dto/activate-response.dto.js';

const bomInclude = {
  parentItem: true,
  components: {
    include: {
      componentItem: true,
    },
  },
} satisfies Prisma.BomHeaderInclude;

export type BomHeaderWithRelations = Prisma.BomHeaderGetPayload<{
  include: typeof bomInclude;
}>;

const bomHeaderSummaryInclude = {
  parentItem: true,
} satisfies Prisma.BomHeaderInclude;

export type BomHeaderWithParentItem = Prisma.BomHeaderGetPayload<{
  include: typeof bomHeaderSummaryInclude;
}>;

export type BomRevisionReference = {
  parentItemId: string;
  revision: string;
};

type LockedItemRow = {
  id: string;
  active: boolean;
  itemType: string;
  makeBuy: string;
};

type LockedBomRow = {
  bomHeaderId: string;
  parentItemId: string;
  revision: string;
  status: string;
  componentItemId: string | null;
  componentRevision: string | null;
};

type LockedBomComponent = {
  componentItemId: string;
  componentRevision: string | null;
};

type LockedBomNode = {
  id: string;
  parentItemId: string;
  revision: string;
  status: string;
  components: LockedBomComponent[];
};

type ActivationQueueNode = {
  node: LockedBomNode;
  path: Set<string>;
};

@Injectable()
export class BomsRepository {
  constructor(private readonly dbClient: DbService) {}

  async findItemById(itemId: string): Promise<Item | null> {
    return this.dbClient.item.findUnique({
      where: { id: itemId },
    });
  }

  async findItemsByIds(itemIds: string[]): Promise<Item[]> {
    return this.dbClient.item.findMany({
      where: {
        id: { in: itemIds },
      },
    });
  }

  async findActiveBomHeaderByItem(itemId: string): Promise<BomHeaderWithRelations | null> {
    return this.dbClient.bomHeader.findFirst({
      where: {
        parentItemId: itemId,
        status: 'ACTIVE',
      },
      include: bomInclude,
    });
  }

  async findBomHeaderByRevision(
    parentItemId: string,
    revision: string,
  ): Promise<BomHeaderWithRelations | null> {
    return this.dbClient.bomHeader.findFirst({
      where: {
        parentItemId,
        revision,
      },
      include: bomInclude,
    });
  }

  async findBomHeadersByRevisions(
    references: BomRevisionReference[],
  ): Promise<BomHeaderWithRelations[]> {
    if (references.length === 0) {
      return [];
    }

    const uniqueReferences = new Map(
      references.map((reference) => [
        this.bomReferenceKey(reference.parentItemId, reference.revision),
        reference,
      ]),
    );

    return this.dbClient.bomHeader.findMany({
      where: {
        OR: [...uniqueReferences.values()].map((reference) => ({
          parentItemId: reference.parentItemId,
          revision: reference.revision,
        })),
      },
      include: bomInclude,
    });
  }

  async findBomHeader(itemId: string, bomHeaderId: string): Promise<BomHeaderWithRelations | null> {
    return this.dbClient.bomHeader.findFirst({
      where: {
        id: bomHeaderId,
        parentItemId: itemId,
      },
      include: bomInclude,
    });
  }

  async findBomRevisions(
    itemId: string,
    query: GetBomRevisionsQuery,
  ): Promise<{
    revisions: BomHeaderWithParentItem[];
    total: number;
  }> {
    const where: Prisma.BomHeaderWhereInput = {
      parentItemId: itemId,
      ...(query.status ? { status: query.status } : {}),
    };

    const orderBy: Prisma.BomHeaderOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      { id: 'asc' },
    ];

    const [revisions, total] = await Promise.all([
      this.dbClient.bomHeader.findMany({
        where,
        skip: query.offset,
        take: query.limit,
        orderBy,
        include: bomHeaderSummaryInclude,
      }),
      this.dbClient.bomHeader.count({ where }),
    ]);

    return { revisions, total };
  }

  async create(itemId: string, body: CreateBomBody): Promise<BomHeaderWithRelations> {
    try {
      return await this.dbClient.$transaction(async (transaction) => {
        const bomHeader = await transaction.bomHeader.create({
          data: {
            parentItemId: itemId,
            revision: body.revision,
            status: 'DRAFT',
            effectiveFrom: this.toDatabaseDate(body.effectiveFrom),
            effectiveTo: body.effectiveTo ? this.toDatabaseDate(body.effectiveTo) : null,
            version: 1,
          },
        });

        await transaction.bomComponent.createMany({
          data: body.components.map((component) => ({
            bomHeaderId: bomHeader.id,
            componentItemId: component.componentItemId,
            componentRevision: component.componentRevision,
            quantityPer: component.quantityPer,
            scrapRate: component.scrapRate,
            operationSeq: component.operationSeq,
          })),
        });

        return transaction.bomHeader.findUniqueOrThrow({
          where: { id: bomHeader.id },
          include: bomInclude,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.throwBomConflictError(itemId, body.revision, error);
      }

      throw error;
    }
  }

  async update(
    itemId: string,
    bomHeaderId: string,
    body: UpdateBomBody,
  ): Promise<BomHeaderWithRelations> {
    return this.dbClient.$transaction(async (transaction) => {
      const result = await transaction.bomHeader.updateMany({
        where: {
          id: bomHeaderId,
          parentItemId: itemId,
          version: body.version,
          status: 'DRAFT',
        },
        data: {
          effectiveFrom: this.toDatabaseDate(body.effectiveFrom),
          effectiveTo: body.effectiveTo ? this.toDatabaseDate(body.effectiveTo) : null,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        const currentBom = await transaction.bomHeader.findFirst({
          where: {
            id: bomHeaderId,
            parentItemId: itemId,
          },
        });
        if (!currentBom) {
          throw new BomRevisionNotFoundError(bomHeaderId);
        }

        if (currentBom.status !== 'DRAFT') {
          throw new BomRevisionNotDraftError(bomHeaderId);
        }

        if (currentBom.version !== body.version) {
          throw new BomRevisionVersionConflictError({
            bomHeaderId,
            expectedVersion: body.version,
            actualVersion: currentBom.version,
          });
        }
      }

      await transaction.bomComponent.deleteMany({
        where: { bomHeaderId },
      });

      await transaction.bomComponent.createMany({
        data: body.components.map((component) => ({
          bomHeaderId,
          componentRevision: component.componentRevision,
          componentItemId: component.componentItemId,
          quantityPer: component.quantityPer,
          scrapRate: component.scrapRate,
          operationSeq: component.operationSeq,
        })),
      });

      return transaction.bomHeader.findUniqueOrThrow({
        where: { id: bomHeaderId },
        include: bomInclude,
      });
    });
  }

  async copy(source: BomHeaderWithRelations, body: CopyBomBody): Promise<BomHeaderWithRelations> {
    try {
      return await this.dbClient.$transaction(async (transaction) => {
        const bomHeader = await transaction.bomHeader.create({
          data: {
            parentItemId: source.parentItemId,
            revision: body.newRevision,
            status: 'DRAFT',
            effectiveFrom: this.toDatabaseDate(body.effectiveFrom),
            effectiveTo: body.effectiveTo ? this.toDatabaseDate(body.effectiveTo) : null,
            version: 1,
          },
        });

        await transaction.bomComponent.createMany({
          data: source.components.map((component) => ({
            bomHeaderId: bomHeader.id,
            componentItemId: component.componentItemId,
            componentRevision: component.componentRevision,
            quantityPer: component.quantityPer,
            scrapRate: component.scrapRate,
            operationSeq: component.operationSeq,
          })),
        });

        return transaction.bomHeader.findUniqueOrThrow({
          where: { id: bomHeader.id },
          include: bomInclude,
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.throwBomConflictError(source.parentItemId, body.newRevision, error);
      }

      throw error;
    }
  }

  async activate(itemId: string, bomHeaderId: string): Promise<ActivatedBomResult> {
    return this.dbClient.$transaction(async (transaction) => {
      // -----------------------------------------
      // 1. Lock root item
      // -----------------------------------------

      const lockedRootItems = await transaction.$queryRaw<LockedItemRow[]>`
        SELECT
          [id],
          [active],
          [item_type] AS [itemType],
          [make_buy] AS [makeBuy]
        FROM [items] WITH (UPDLOCK, ROWLOCK)
        WHERE [id] = ${itemId}
      `;

      const rootItem = lockedRootItems[0];

      if (!rootItem) {
        throw new ItemNotFoundError(itemId);
      }

      if (!rootItem.active) {
        throw new ItemNotActiveError(itemId);
      }

      this.assertEligibleBomParent(itemId, rootItem);

      // -----------------------------------------
      // 2. Lock current ACTIVE BOM
      // -----------------------------------------

      const currentActiveBoms = await transaction.$queryRaw<
        { id: string; revision: string; status: string }[]
      >`
        SELECT
          [id],
          [revision],
          [status]
        FROM [bom_headers] WITH (UPDLOCK, ROWLOCK)
        WHERE [parent_item_id] = ${itemId}
          AND [status] = 'ACTIVE'
      `;

      if (currentActiveBoms.length > 1) {
        throw new MultipleActiveBomRevisionsError({
          parentItemId: itemId,
          bomHeaderIds: currentActiveBoms.map((bom) => bom.id),
        });
      }

      let obsoleteBom: BomHeaderWithRelations | null = null;

      if (currentActiveBoms.length === 1) {
        obsoleteBom = await transaction.bomHeader.findUnique({
          where: {
            id: currentActiveBoms[0].id,
          },
          include: bomInclude,
        });
      }

      // -----------------------------------------
      // 3. Lock target DRAFT BOM and components
      // -----------------------------------------

      const rootRows = await transaction.$queryRaw<LockedBomRow[]>`
        SELECT
          bh.[id] AS [bomHeaderId],
          bh.[parent_item_id] AS [parentItemId],
          bh.[revision] AS [revision],
          bh.[status] AS [status],
          bc.[component_item_id] AS [componentItemId],
          bc.[component_revision] AS [componentRevision]
        FROM [bom_headers] AS bh WITH (UPDLOCK, ROWLOCK)
        LEFT JOIN [bom_components] AS bc
          WITH (UPDLOCK, ROWLOCK)
          ON bc.[bom_header_id] = bh.[id]
        WHERE bh.[id] = ${bomHeaderId}
          AND bh.[parent_item_id] = ${itemId}
      `;

      const rootNode = this.groupLockedBomRows(rootRows)[0];

      if (!rootNode) {
        throw new BomRevisionNotFoundError(bomHeaderId);
      }

      if (rootNode.status !== 'DRAFT') {
        throw new BomRevisionNotDraftError(bomHeaderId);
      }

      if (rootNode.components.length === 0) {
        throw new BomRevisionHasNoComponentsError(bomHeaderId);
      }

      // -----------------------------------------
      // 4. BFS through referenced BOMs
      // -----------------------------------------

      let frontier: ActivationQueueNode[] = [
        {
          node: rootNode,
          path: new Set([itemId]),
        },
      ];

      while (frontier.length > 0) {
        const componentItemIds = [
          ...new Set(
            frontier.flatMap(({ node }) =>
              node.components.map((component) => component.componentItemId),
            ),
          ),
        ].sort();

        // ---------------------------------------
        // 4.1 Lock all component items in a batch
        // ---------------------------------------

        const lockedComponentItems = await transaction.$queryRaw<LockedItemRow[]>`
            SELECT
              [id],
              [active],
              [item_type] AS [itemType],
              [make_buy] AS [makeBuy]
            FROM [items] WITH (UPDLOCK, ROWLOCK)
            WHERE [id] IN (${Prisma.join(componentItemIds)})
            ORDER BY [id]
          `;

        const componentItemsById = new Map(lockedComponentItems.map((item) => [item.id, item]));

        for (const componentItemId of componentItemIds) {
          const item = componentItemsById.get(componentItemId);

          if (!item) {
            throw new ComponentItemNotFoundError(componentItemId);
          }

          if (!item.active) {
            throw new ComponentItemInactiveError(componentItemId);
          }

          if (item.itemType === 'FINISHED_GOOD') {
            throw new BomComponentItemTypeNotAllowedError({
              componentItemId,
              itemType: item.itemType,
            });
          }
        }

        // ---------------------------------------
        // 4.2 Collect referenced BOM revisions
        // ---------------------------------------

        const references: BomRevisionReference[] = frontier.flatMap(({ node }) =>
          node.components.flatMap((component) => {
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

        // ---------------------------------------
        // 4.3 Batch lock referenced BOMs
        // ---------------------------------------

        const referencedNodes = await this.lockBomNodesByReferences(transaction, references);

        const nodesByReference = new Map(
          referencedNodes.map((node) => [
            this.bomReferenceKey(node.parentItemId, node.revision),
            node,
          ]),
        );

        const nextFrontier: ActivationQueueNode[] = [];

        // ---------------------------------------
        // 4.4 Validate references and cycles
        // ---------------------------------------

        for (const current of frontier) {
          const { node, path } = current;

          if (node.components.length === 0) {
            throw new BomRevisionHasNoComponentsError(node.id);
          }

          for (const component of node.components) {
            const componentItemId = component.componentItemId;

            if (component.componentRevision == null) {
              continue;
            }

            const referenceKey = this.bomReferenceKey(componentItemId, component.componentRevision);

            const subBom = nodesByReference.get(referenceKey);

            if (!subBom) {
              throw new ReferencedBomRevisionNotFoundError({
                parentItemId: componentItemId,
                revision: component.componentRevision,
              });
            }

            if (path.has(componentItemId)) {
              throw new BomCircularReferenceError([...path, componentItemId]);
            }

            if (subBom.status !== 'ACTIVE') {
              throw new ReferencedBomRevisionNotActiveError({
                bomHeaderId: subBom.id,
                parentItemId: subBom.parentItemId,
                revision: subBom.revision,
                status: subBom.status,
              });
            }

            if (subBom.components.length === 0) {
              throw new BomRevisionHasNoComponentsError(subBom.id);
            }

            const componentItem = componentItemsById.get(componentItemId) as LockedItemRow;

            this.assertEligibleBomParent(componentItemId, componentItem);

            const nextPath = new Set(path);
            nextPath.add(componentItemId);

            nextFrontier.push({
              node: subBom,
              path: nextPath,
            });
          }
        }

        frontier = nextFrontier;
      }

      // -----------------------------------------
      // 5. Demote existing ACTIVE BOM
      // -----------------------------------------

      if (currentActiveBoms.length === 1) {
        const previousActiveBom = currentActiveBoms[0];

        const demoteResult = await transaction.bomHeader.updateMany({
          where: {
            id: previousActiveBom.id,
            parentItemId: itemId,
            status: 'ACTIVE',
          },
          data: {
            status: 'OBSOLETE',
          },
        });

        if (demoteResult.count !== 1) {
          throw new BomActivationConflictError({
            parentItemId: itemId,
            previousActiveBomHeaderId: previousActiveBom.id,
          });
        }
      }

      // -----------------------------------------
      // 6. Activate target DRAFT BOM
      // -----------------------------------------

      const activateResult = await transaction.bomHeader.updateMany({
        where: {
          id: bomHeaderId,
          parentItemId: itemId,
          status: 'DRAFT',
        },
        data: {
          status: 'ACTIVE',
        },
      });

      if (activateResult.count !== 1) {
        throw new BomRevisionActivationConflictError({
          bomHeaderId,
        });
      }

      const activeBom = await transaction.bomHeader.findUniqueOrThrow({
        where: {
          id: bomHeaderId,
        },
        include: bomInclude,
      });

      // -----------------------------------------
      // 7. Return activated BOM
      // -----------------------------------------

      return {
        activeBom,
        obsoleteBom,
      };
    });
  }

  private async lockBomNodesByReferences(
    transaction: Prisma.TransactionClient,
    references: BomRevisionReference[],
  ): Promise<LockedBomNode[]> {
    if (references.length === 0) {
      return [];
    }

    const uniqueReferences = [
      ...new Map(
        references.map((reference) => [
          this.bomReferenceKey(reference.parentItemId, reference.revision),
          reference,
        ]),
      ).values(),
    ];

    const predicates = uniqueReferences.map(
      (reference) =>
        Prisma.sql`(
          bh.[parent_item_id] = ${reference.parentItemId}
          AND bh.[revision] = ${reference.revision}
        )`,
    );

    const rows = await transaction.$queryRaw<LockedBomRow[]>`
      SELECT
        bh.[id] AS [bomHeaderId],
        bh.[parent_item_id] AS [parentItemId],
        bh.[revision] AS [revision],
        bh.[status] AS [status],
        bc.[component_item_id] AS [componentItemId],
        bc.[component_revision] AS [componentRevision]
      FROM [bom_headers] AS bh WITH (UPDLOCK, ROWLOCK)
      LEFT JOIN [bom_components] AS bc
        WITH (UPDLOCK, ROWLOCK)
        ON bc.[bom_header_id] = bh.[id]
      WHERE ${Prisma.join(predicates, ' OR ')}
    `;

    return this.groupLockedBomRows(rows);
  }

  private groupLockedBomRows(rows: LockedBomRow[]): LockedBomNode[] {
    const nodes = new Map<string, LockedBomNode>();

    for (const row of rows) {
      let node = nodes.get(row.bomHeaderId);

      if (!node) {
        node = {
          id: row.bomHeaderId,
          parentItemId: row.parentItemId,
          revision: row.revision,
          status: row.status,
          components: [],
        };

        nodes.set(row.bomHeaderId, node);
      }

      if (row.componentItemId !== null) {
        node.components.push({
          componentItemId: row.componentItemId,
          componentRevision: row.componentRevision,
        });
      }
    }

    return [...nodes.values()];
  }

  private assertEligibleBomParent(
    itemId: string,
    item: Pick<LockedItemRow, 'itemType' | 'makeBuy'>,
  ): void {
    if (item.itemType === 'RAW_MATERIAL' || item.makeBuy === 'BUY') {
      throw new BomParentItemNotEligibleError({
        parentItemId: itemId,
        itemType: item.itemType,
        makeBuy: item.makeBuy,
      });
    }
  }

  private bomReferenceKey(parentItemId: string, revision: string): string {
    return JSON.stringify([parentItemId, revision]);
  }

  private async throwBomConflictError(
    itemId: string,
    revision: string,
    error: Prisma.PrismaClientKnownRequestError,
  ): Promise<never> {
    const existingDraft = await this.dbClient.bomHeader.findFirst({
      where: {
        parentItemId: itemId,
        status: 'DRAFT',
      },
      select: {
        id: true,
      },
    });

    if (existingDraft) {
      throw new BomDraftAlreadyExistsError({
        parentItemId: itemId,
        existingDraftId: existingDraft.id,
      });
    }

    const existingRevision = await this.dbClient.bomHeader.findUnique({
      where: {
        parentItemId_revision: {
          parentItemId: itemId,
          revision,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingRevision) {
      throw new BomRevisionAlreadyExistsError({
        parentItemId: itemId,
        revision,
      });
    }

    throw error;
  }

  private toDatabaseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
