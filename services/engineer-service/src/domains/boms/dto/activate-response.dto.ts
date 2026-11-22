import { BomHeaderWithRelations } from '../boms.repository.js';
import { ReturnBomDto } from './return-bom.dto.js';

export type ActivatedBomResult = {
  activeBom: BomHeaderWithRelations;
  obsoleteBom: BomHeaderWithRelations | null;
};

export class ReturnBomActivationDto {
  readonly activeBom: ReturnBomDto;

  readonly obsoleteBom: ReturnBomDto | null;

  private constructor(result: ActivatedBomResult) {
    this.activeBom = ReturnBomDto.fromBomHeader(result.activeBom);

    this.obsoleteBom = result.obsoleteBom ? ReturnBomDto.fromBomHeader(result.obsoleteBom) : null;
  }

  static fromActivatedBom(result: ActivatedBomResult): ReturnBomActivationDto {
    return new ReturnBomActivationDto(result);
  }
}
