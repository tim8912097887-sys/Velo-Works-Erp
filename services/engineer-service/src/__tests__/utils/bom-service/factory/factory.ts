import { BomHeaderWithRelations } from 'src/domains/boms/boms.repository.js';

type ComponentInput = {
  componentItemId: string;
  quantityPer?: number;
  scrapRate?: number;
  componentRevision?: string | null;
};

type BomInput = {
  id?: string;
  parentItemId: string;
  revision?: string;
  status?: string;
  components?: ComponentInput[];
};

export function createBom({
  id,
  parentItemId,
  revision = 'R1',
  status = 'ACTIVE',
  components = [],
}: BomInput): BomHeaderWithRelations {
  return {
    id: id ?? crypto.randomUUID(),
    parentItemId,
    revision,
    status,

    version: 1,
    effectiveFrom: new Date(),
    effectiveTo: null,

    parentItem: {
      id: parentItemId,
      itemCode: parentItemId,
      name: parentItemId,
      active: true,
      itemType: 'SUBASSEMBLY',
      makeBuy: 'MAKE',
    },

    components: components.map((component) => ({
      id: crypto.randomUUID(),

      bomHeaderId: 'bom-id',

      componentItemId: component.componentItemId,

      componentRevision: component.componentRevision ?? null,

      quantityPer: component.quantityPer ?? 1,

      scrapRate: component.scrapRate ?? 0,

      operationSeq: 10,

      componentItem: {
        id: component.componentItemId,
        itemCode: component.componentItemId,
        name: component.componentItemId,
        active: true,
        itemType: 'SUBASSEMBLY',
        makeBuy: 'MAKE',
      },
    })),
  } as unknown as BomHeaderWithRelations;
}
