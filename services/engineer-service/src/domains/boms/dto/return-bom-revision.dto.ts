import { BomHeader, Item } from '../../../generated/prisma/client.js';

type BomHeaderWithParentItem = BomHeader & { parentItem: Item };

export class ReturnBomRevisionDto {
  readonly id: string;
  readonly parentItem: Pick<Item, 'id' | 'itemCode' | 'name' | 'itemType'>;
  readonly revision: string;
  readonly status: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly version: number;
  readonly createdAt: Date;

  private constructor(bomHeader: BomHeaderWithParentItem) {
    this.id = bomHeader.id;
    this.parentItem = {
      id: bomHeader.parentItem.id,
      itemCode: bomHeader.parentItem.itemCode,
      name: bomHeader.parentItem.name,
      itemType: bomHeader.parentItem.itemType,
    };
    this.revision = bomHeader.revision;
    this.status = bomHeader.status;
    this.effectiveFrom = bomHeader.effectiveFrom.toISOString().slice(0, 10);
    this.effectiveTo = bomHeader.effectiveTo?.toISOString().slice(0, 10) ?? null;
    this.version = bomHeader.version;
    this.createdAt = bomHeader.createdAt;
  }

  static fromBomHeader(bomHeader: BomHeaderWithParentItem): ReturnBomRevisionDto {
    return new ReturnBomRevisionDto(bomHeader);
  }
}
