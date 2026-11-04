import { Injectable } from '@nestjs/common';
import { DbService } from '../../infrastruture/persistence/db.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { GetItemsQueryDto } from './dto/get-all.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { Item, Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class ItemsRepository {
  constructor(private readonly dbClient: DbService) {}

  async findByItemCode(itemCode: string): Promise<Item | null> {
    return this.dbClient.item.findUnique({
      where: { itemCode },
    });
  }

  async create(createItemDto: CreateItemDto): Promise<Item> {
    return this.dbClient.item.create({
      data: createItemDto,
    });
  }

  async findAll(query: GetItemsQueryDto): Promise<Item[]> {
    const where: Prisma.ItemWhereInput = {};

    if (query.search) {
      where.name = {
        contains: query.search,
      };
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
    return this.dbClient.item.update({
      where: { id },
      data: updateItemDto,
    });
  }
}
