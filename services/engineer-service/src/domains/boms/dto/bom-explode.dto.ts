import { BomHeaderWithRelations } from '../boms.repository.js';
import { ReturnBomDto } from './return-bom.dto.js';

type RawExplosion = {
  rootBom: BomHeaderWithRelations;
  requirementMap: RequirementMap;
  explosionTree: ExplodeTree;
};

export type ExplodeTree = {
  level: number;
  parentItemId: string;
  componentItemId: string;
  quantityPer: number;
  scrapRate: number;
  subBomId: string | null;
}[];

export type RequirementMap = Map<string, { itemCode: string; name: string; totalQuantity: number }>;

export class ReturnBomExplosionDto {
  readonly root: ReturnBomDto;
  readonly requirementSummary: {
    totalQuantity: number;
    itemCode: string;
    name: string;
    componentItemId: string;
  }[];
  readonly tree: ExplodeTree;

  private constructor(rawExplosion: RawExplosion) {
    this.root = ReturnBomDto.fromBomHeader(rawExplosion.rootBom);
    this.requirementSummary = Array.from(rawExplosion.requirementMap.entries()).map(
      ([id, data]) => ({
        componentItemId: id,
        ...data,
        totalQuantity: Number(data.totalQuantity.toFixed(4)), // Clean decimal precision
      }),
    );
    this.tree = rawExplosion.explosionTree;
  }

  static fromRawExplosion(rawExplosion: RawExplosion): ReturnBomExplosionDto {
    return new ReturnBomExplosionDto(rawExplosion);
  }
}
