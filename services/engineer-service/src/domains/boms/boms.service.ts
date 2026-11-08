import { Injectable } from '@nestjs/common';
import { ItemNotFoundError } from '../items/errors/item-not-found.error.js';
import { ItemNotActiveError } from '../items/errors/item-not-active.error.js';
import { CreateBomBody } from './dto/create-bom.dto.js';
import { ReturnBomDto } from './dto/return-bom.dto.js';
import { UpdateBomBody } from './dto/update-bom.dto.js';
import { BomRevisionAlreadyExistsError } from './errors/bom-revision-already-exists.error.js';
import { BomRevisionNotDraftError } from './errors/bom-revision-not-draft.error.js';
import { BomRevisionNotFoundError } from './errors/bom-revision-not-found.error.js';
import { BomSelfReferenceError } from './errors/bom-self-reference.error.js';
import { ComponentItemInactiveError } from './errors/component-item-inactive.error.js';
import { ComponentItemNotFoundError } from './errors/component-item-not-found.error.js';
import { InvalidBomComponentTypeError } from './errors/invalid-bom-component-type.error.js';
import { InvalidBomHeaderError } from './errors/invalid-bom-header.error.js';
import { BomsRepository } from './boms.repository.js';

@Injectable()
export class BomsService {
  constructor(private readonly bomsRepository: BomsRepository) {}

  async create(itemId: string, body: CreateBomBody): Promise<ReturnBomDto> {
    await this.assertParentItemIsEligible(itemId);

    if (await this.bomsRepository.revisionExists(itemId, body.revision)) {
      throw new BomRevisionAlreadyExistsError(itemId, body.revision);
    }

    await this.assertComponentsAreEligible(itemId, body.components);
    const bomHeader = await this.bomsRepository.create(itemId, body);

    return ReturnBomDto.fromBomHeader(bomHeader);
  }

  async update(
    itemId: string,
    bomHeaderId: string,
    body: UpdateBomBody,
  ): Promise<ReturnBomDto> {
    await this.assertParentItemIsEligible(itemId);

    const bomHeader = await this.bomsRepository.findBomHeader(itemId, bomHeaderId);
    if (!bomHeader) {
      throw new BomRevisionNotFoundError(bomHeaderId);
    }
    if (bomHeader.status !== 'DRAFT') {
      throw new BomRevisionNotDraftError(bomHeaderId);
    }

    await this.assertComponentsAreEligible(bomHeader.parentItemId, body.components);
    const updatedBomHeader = await this.bomsRepository.update(itemId, bomHeaderId, body);

    return ReturnBomDto.fromBomHeader(updatedBomHeader);
  }

  private async assertParentItemIsEligible(itemId: string): Promise<void> {
    const item = await this.bomsRepository.findItemById(itemId);
    if (!item) {
      throw new ItemNotFoundError(itemId);
    }
    if (!item.active) {
      throw new ItemNotActiveError(itemId);
    }
    if (item.itemType === 'RAW_MATERIAL') {
      throw new InvalidBomHeaderError(itemId);
    }
  }

  private async assertComponentsAreEligible(
    parentItemId: string,
    components: CreateBomBody['components'],
  ): Promise<void> {
    const componentItems = await this.bomsRepository.findItemsByIds(
      components.map((component) => component.componentItemId),
    );
    const itemsById = new Map(componentItems.map((item) => [item.id, item]));

    for (const component of components) {
      const item = itemsById.get(component.componentItemId);
      if (!item) {
        throw new ComponentItemNotFoundError(component.componentItemId);
      }
      if (item.id === parentItemId) {
        throw new BomSelfReferenceError(parentItemId);
      }
      if (!item.active) {
        throw new ComponentItemInactiveError(item.id);
      }
      if (item.itemType === 'FINISHED_GOOD') {
        throw new InvalidBomComponentTypeError(item.id);
      }
    }
  }
}
