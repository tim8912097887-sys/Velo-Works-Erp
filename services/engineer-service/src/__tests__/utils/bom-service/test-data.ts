export const bomTestComponentId = '00000000-0000-4000-8000-000000000003';
const ITEMS_URL = '/api/v1/items';

export const getBomRevisionsUrl = (itemId: string) => `${ITEMS_URL}/${itemId}/bom-revisions`;
export const getBomRevisionUrl = (itemId: string, bomHeaderId: string) =>
  `${getBomRevisionsUrl(itemId)}/${bomHeaderId}`;
export const copyBomRevisionUrl = (itemId: string, bomHeaderId: string) =>
  `${getBomRevisionUrl(itemId, bomHeaderId)}/copy`;

export const createBomBody = {
  revision: 'R1',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  components: [{ componentItemId: bomTestComponentId, quantityPer: 1 }],
};

export const updateBomBody = {
  version: 1,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  components: [{ componentItemId: bomTestComponentId, quantityPer: 1 }],
};

export const copyBomBody = {
  newRevision: 'R2',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
};
