import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastruture/persistence/db.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { GetItemsQueryDto } from './dto/get-all.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { Item, Prisma } from '../../generated/prisma/client.js';
import { ItemCodeAlreadyExistError } from './errors/item-code-already-exist.error.js';
import { ItemAlreadyInUseError } from './errors/item-already-in-use.error.js';
import { ItemNotFoundError } from './errors/item-not-found.error.js';
import { ItemAlreadyActivateError } from './errors/item-already-activate.error.js';
import { ItemAlreadyInActivateError } from './errors/item-already-in-activate.error.js';
import { ItemNotActiveError } from './errors/item-not-active.error.js';

@Injectable()
export class ItemsRepository {
  constructor(private readonly dbClient: DbService) {}

  async findByItemCode(itemCode: string): Promise<Item | null> {
    return this.dbClient.item.findUnique({
      where: { itemCode },
    });
  }

  async create(createItemDto: CreateItemDto): Promise<Item> {
    try {
      return await this.dbClient.item.create({
        data: createItemDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ItemCodeAlreadyExistError(createItemDto.itemCode);
      }

      throw error;
    }
  }

  async findAll(query: GetItemsQueryDto): Promise<Item[]> {
    const where: Prisma.ItemWhereInput = {};

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
          },
        },
        {
          itemCode: {
            contains: query.search,
          },
        },
      ];
    }

    if (query.itemType) {
      where.itemType = query.itemType;
    }

    if (query.makeBuy) {
      where.makeBuy = query.makeBuy;
    }
    const items = await this.dbClient.item.findMany({
      skip: query.offset,
      take: query.limit,
      where,
      orderBy: query.sortBy
        ? {
            [query.sortBy]: query.sortOrder ?? 'asc',
          }
        : undefined,
    });

    return items;
  }

  async findById(id: string): Promise<Item | null> {
    return this.dbClient.item.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<Item> {
    return this.dbClient.$transaction(async (transaction) => {
      const { version, ...data } = updateItemDto;
      const result = await transaction.item.updateMany({
        where: { id, version, active: true },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        const currentItem = await transaction.item.findUnique({
          where: { id },
          select: {
            active: true,
          },
        });

        if (!currentItem) {
          throw new ItemNotFoundError(id);
        }

        if (!currentItem.active) {
          throw new ItemNotActiveError(id);
        }

        throw new ItemAlreadyInUseError(id);
      }

      return transaction.item.findUniqueOrThrow({
        where: { id },
      });
    });
  }

  async updateActiveState(id: string, active: boolean): Promise<Item> {
    return this.dbClient.$transaction(async (transaction) => {
      const lockedItems = await transaction.$queryRaw<{ id: string; active: boolean }[]>`
        SELECT [id], [active]
        FROM [items] WITH (UPDLOCK, ROWLOCK)
        WHERE [id] = ${id}
      `;
      const item = lockedItems[0];

      if (!item) {
        throw new ItemNotFoundError(id);
      }
      if (item.active === active) {
        if (active) {
          throw new ItemAlreadyActivateError(id);
        }
        throw new ItemAlreadyInActivateError(id);
      }

      return transaction.item.update({
        where: { id },
        data: {
          active,
          version: { increment: 1 },
        },
      });
    });
  }
}
