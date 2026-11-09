import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastruture/persistence/db.service.js';
import { Item, Prisma } from '../../generated/prisma/client.js';
import { CreateBomBody } from './dto/create-bom.dto.js';
import { UpdateBomBody } from './dto/update-bom.dto.js';
import { BomRevisionNotFoundError } from './errors/bom-revision-not-found.error.js';
import { BomRevisionNotDraftError } from './errors/bom-revision-not-draft.error.js';
import { BomRevisionAlreadyInUseError } from './errors/bom-revision-already-in-use.error.js';
import { BomRevisionAlreadyExistsError } from './errors/bom-revision-already-exists.error.js';
import { BomDraftAlreadyExistsError } from './errors/bom-draft-already-exists.error.js';
import { CopyBomBody } from './dto/copy-bom.dto.js';
import { GetBomRevisionsQuery } from './dto/get-bom-revisions-query.dto.js';

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

@Injectable()
export class BomsRepository {
  constructor(private readonly dbClient: DbService) {}

  async findItemById(itemId: string): Promise<Item | null> {
    return this.dbClient.item.findUnique({ where: { id: itemId } });
  }

  async findItemsByIds(itemIds: string[]): Promise<Item[]> {
    return this.dbClient.item.findMany({
      where: {
        id: {
          in: itemIds,
        },
      },
    });
  }

  async revisionExists(parentItemId: string, revision: string): Promise<boolean> {
    const header = await this.dbClient.bomHeader.findUnique({
      where: {
        parentItemId_revision: {
          parentItemId,
          revision,
        },
      },
      select: { id: true },
    });

    return header !== null;
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
  ): Promise<{ revisions: BomHeaderWithParentItem[]; total: number }> {
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
            version: 1, // Initialize version
          },
        });

        await transaction.bomComponent.createMany({
          data: body.components.map((component) => ({
            bomHeaderId: bomHeader.id,
            componentItemId: component.componentItemId,
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

  async update(bomHeaderId: string, body: UpdateBomBody): Promise<BomHeaderWithRelations> {
    return this.dbClient.$transaction(async (transaction) => {
      // Replace components for this draft revision
      await transaction.bomComponent.deleteMany({
        where: { bomHeaderId },
      });

      await transaction.bomComponent.createMany({
        data: body.components.map((component) => ({
          bomHeaderId,
          componentItemId: component.componentItemId,
          quantityPer: component.quantityPer,
          scrapRate: component.scrapRate,
          operationSeq: component.operationSeq,
        })),
      });

      // Perform update with optimistic lock (version checking & incrementing)
      const result = await transaction.bomHeader.updateMany({
        where: {
          id: bomHeaderId,
          version: body.version, // Ensures no concurrent modifications happened
          status: 'DRAFT',
        },
        data: {
          effectiveFrom: this.toDatabaseDate(body.effectiveFrom),
          effectiveTo: body.effectiveTo ? this.toDatabaseDate(body.effectiveTo) : null,
          version: { increment: 1 }, // Atomically bump version
        },
      });

      if (result.count === 0) {
        const currentItem = await transaction.bomHeader.findUnique({
          where: {
            id: bomHeaderId,
          },
        });

        if (!currentItem) {
          throw new BomRevisionNotFoundError(bomHeaderId);
        }

        if (currentItem.status !== 'DRAFT') {
          throw new BomRevisionNotDraftError(bomHeaderId);
        }

        if (currentItem.version !== body.version) {
          throw new BomRevisionAlreadyInUseError(bomHeaderId);
        }
      }

      return transaction.bomHeader.findUniqueOrThrow({
        where: {
          id: bomHeaderId,
        },
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

  private async throwBomConflictError(
    itemId: string,
    revision: string,
    error: Prisma.PrismaClientKnownRequestError,
  ): Promise<never> {
    const existingRevision = await this.dbClient.bomHeader.findUnique({
      where: {
        parentItemId_revision: {
          parentItemId: itemId,
          revision,
        },
      },
      select: { id: true },
    });

    if (existingRevision) {
      throw new BomRevisionAlreadyExistsError(itemId, revision);
    }

    const existingDraft = await this.dbClient.bomHeader.findFirst({
      where: { parentItemId: itemId, status: 'DRAFT' },
      select: { id: true },
    });

    if (existingDraft) {
      throw new BomDraftAlreadyExistsError(itemId);
    }

    throw error;
  }

  private toDatabaseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
