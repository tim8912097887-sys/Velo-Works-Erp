import { Item } from 'src/generated/prisma/client.js';

export class ReturnItemDto {
  id: string;
  itemCode: string;
  name: string;
  itemType: string;
  makeBuy: string;
  unitOfMeasure: string;
  leadTimeDays: number;
  safetyStock: number;

  private constructor(item: Item) {
    this.id = item.id;
    this.itemCode = item.itemCode;
    this.name = item.name;
    this.itemType = item.itemType;
    this.makeBuy = item.makeBuy;
    this.unitOfMeasure = item.unitOfMeasure;
    this.leadTimeDays = item.leadTimeDays;
    this.safetyStock = Number(item.safetyStock);
  }

  // Static factory method
  static toDomainItem(item: Item): ReturnItemDto {
    return new ReturnItemDto(item);
  }
}
