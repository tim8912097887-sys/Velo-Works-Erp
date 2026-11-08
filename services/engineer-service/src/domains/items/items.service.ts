import { Injectable } from '@nestjs/common';
import { ItemsRepository } from './items.repository.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { GetItemsQueryDto } from './dto/get-all.dto.js';
import { ItemNotFoundError } from './errors/item-not-found.error.js';
import { ReturnItemDto } from './dto/return-item.dto.js';

@Injectable()
export class ItemsService {
  constructor(private readonly itemRepository: ItemsRepository) {}

  async create(createItemDto: CreateItemDto): Promise<ReturnItemDto> {
    const item = await this.itemRepository.create(createItemDto);
    return ReturnItemDto.toDomainItem(item);
  }

  async findAll(query: GetItemsQueryDto): Promise<ReturnItemDto[]> {
    const items = await this.itemRepository.findAll(query);
    return items.map((item) => ReturnItemDto.toDomainItem(item));
  }

  async findOne(id: string): Promise<ReturnItemDto> {
    const item = await this.itemRepository.findById(id);
    if (!item) {
      throw new ItemNotFoundError(id);
    }

    return ReturnItemDto.toDomainItem(item);
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<ReturnItemDto> {
    const updatedItem = await this.itemRepository.update(id, updateItemDto);
    return ReturnItemDto.toDomainItem(updatedItem);
  }

  async activate(id: string): Promise<ReturnItemDto> {
    return ReturnItemDto.toDomainItem(await this.itemRepository.updateActiveState(id, true));
  }

  async inactivate(id: string): Promise<ReturnItemDto> {
    return ReturnItemDto.toDomainItem(await this.itemRepository.updateActiveState(id, false));
  }
}
