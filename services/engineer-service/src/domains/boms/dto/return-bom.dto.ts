import { BomComponent, BomHeader, Item } from '../../../generated/prisma/client.js';

type BomHeaderWithRelations = BomHeader & {
  parentItem: Item;
  components: (BomComponent & { componentItem: Item })[];
};

export class ReturnBomDto {
  readonly id: string;
  readonly parentItem: Pick<Item, 'id' | 'itemCode' | 'name' | 'itemType'>;
  readonly revision: string;
  readonly status: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly version: number;
  readonly components: {
    id: string;
    componentItemId: string;
    componentItem: Pick<Item, 'id' | 'itemCode' | 'name' | 'itemType'>;
    quantityPer: number;
    scrapRate: number;
    operationSeq: number | null;
  }[];
  readonly createdAt: Date;

  private constructor(bomHeader: BomHeaderWithRelations) {
    this.id = bomHeader.id;
    this.parentItem = this.toItem(bomHeader.parentItem);
    this.revision = bomHeader.revision;
    this.status = bomHeader.status;
    this.effectiveFrom = bomHeader.effectiveFrom.toISOString().slice(0, 10);
    this.effectiveTo = bomHeader.effectiveTo?.toISOString().slice(0, 10) ?? null;
    this.version = bomHeader.version;
    this.components = bomHeader.components.map((component) => ({
      id: component.id,
      componentItemId: component.componentItemId,
      componentItem: this.toItem(component.componentItem),
      quantityPer: Number(component.quantityPer),
      scrapRate: Number(component.scrapRate),
      operationSeq: component.operationSeq,
    }));
    this.createdAt = bomHeader.createdAt;
  }

  static fromBomHeader(bomHeader: BomHeaderWithRelations): ReturnBomDto {
    return new ReturnBomDto(bomHeader);
  }

  private toItem(item: Item): Pick<Item, 'id' | 'itemCode' | 'name' | 'itemType'> {
    return {
      id: item.id,
      itemCode: item.itemCode,
      name: item.name,
      itemType: item.itemType,
    };
  }
}
