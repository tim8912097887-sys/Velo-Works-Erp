import { Injectable } from '@nestjs/common';
import { DbService } from 'src/infrastruture/persistence/db.service.js';

@Injectable()
export class ItemsRepository {
  constructor(private readonly dbClient: DbService) {}
  create(createItemDto: CreateItemDto) {
    return 'This action adds a new item';
  }

  findAll() {
    return `This action returns all items`;
  }

  findOne(id: number) {
    return `This action returns a #${id} item`;
  }

  update(id: number, updateItemDto: UpdateItemDto) {
    return `This action updates a #${id} item`;
  }

  remove(id: number) {
    return `This action removes a #${id} item`;
  }
}
