import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastruture/persistence/db.service.js';
import { BomHeader, Item, Prisma } from '../../generated/prisma/client.js';
import { CreateBomBody } from './dto/create-bom.dto.js';
import { UpdateBomBody } from './dto/update-bom.dto.js';
import { BomRevisionNotFoundError } from './errors/bom-revision-not-found.error.js';
import { BomRevisionNotDraftError } from './errors/bom-revision-not-draft.error.js';
import { BomRevisionAlreadyInUseError } from './errors/bom-revision-already-in-use.error.js';
import { BomRevisionAlreadyExistsError } from './errors/bom-revision-already-exists.error.js';

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

  async findBomHeader(itemId: string, bomHeaderId: string): Promise<BomHeader | null> {
    return this.dbClient.bomHeader.findFirst({
      where: {
        id: bomHeaderId,
        parentItemId: itemId,
      },
    });
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
      // Capture Prisma Unique Constraint Violation (P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BomRevisionAlreadyExistsError(itemId, body.revision);
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
      // Fetch current header to check status and capture the current version
      const bomHeader = await transaction.bomHeader.findFirst({
        where: { id: bomHeaderId, parentItemId: itemId },
        select: { status: true, version: true },
      });

      if (!bomHeader) {
        throw new BomRevisionNotFoundError(bomHeaderId);
      }
      if (bomHeader.status !== 'DRAFT') {
        throw new BomRevisionNotDraftError(bomHeaderId);
      }

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

      try {
        // Perform update with optimistic lock (version checking & incrementing)
        return await transaction.bomHeader.update({
          where: {
            id: bomHeaderId,
            version: bomHeader.version, // Ensures no concurrent modifications happened
          },
          data: {
            effectiveFrom: this.toDatabaseDate(body.effectiveFrom),
            effectiveTo: body.effectiveTo ? this.toDatabaseDate(body.effectiveTo) : null,
            version: { increment: 1 }, // Atomically bump version
          },
          include: bomInclude,
        });
      } catch (error) {
        // If P2025 occurs, the record wasn't found because version changed concurrently
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw new BomRevisionAlreadyInUseError(bomHeaderId);
        }
        throw error;
      }
    });
  }

  private toDatabaseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
