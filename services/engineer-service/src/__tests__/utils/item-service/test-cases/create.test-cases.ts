export const createItemTestCases = [
  {
    description: 'when creating a SUBASSEMBLY with BOTH makeBuy should create the item',
    body: {
      itemCode: 'TEST-SUB-001',
      name: 'Test subassembly',
      itemType: 'SUBASSEMBLY',
      unitOfMeasure: 'PCS',
      makeBuy: 'BOTH',
      leadTimeDays: 5,
      safetyStock: 10,
    },
  },
  {
    description: 'when creating a RAW_MATERIAL with BUY makeBuy should create the item',
    body: {
      itemCode: 'TEST-RM-001',
      name: 'Test raw material',
      itemType: 'RAW_MATERIAL',
      unitOfMeasure: 'KG',
      makeBuy: 'BUY',
      leadTimeDays: 1,
      safetyStock: 0,
    },
  },
  {
    description:
      'when creating a FINISHED_GOOD with maximum name and unit lengths should trim and create the item',
    body: {
      itemCode: ` ${'C'.repeat(50)} `,
      name: ` ${'N'.repeat(200)} `,
      itemType: 'FINISHED_GOOD',
      unitOfMeasure: ` ${'U'.repeat(20)} `,
      makeBuy: 'MAKE',
      leadTimeDays: 1,
      safetyStock: 0,
    },
  },
];

const validCreateItem = createItemTestCases[0].body;

const createValidationCase = (
  description: string,
  body: Record<string, unknown>,
  field?: string,
) => ({ description, body, field });

export const createItemValidationTestCases = [
  ...(['itemCode', 'name', 'itemType', 'unitOfMeasure', 'makeBuy', 'leadTimeDays', 'safetyStock'] as const).map(
    (field) => {
      const body = Object.fromEntries(
        Object.entries(validCreateItem).filter(([key]) => key !== field),
      );
      return createValidationCase(`when ${field} is missing should return a validation error`, body, field);
    },
  ),
  ...(['itemCode', 'name', 'itemType', 'unitOfMeasure', 'makeBuy', 'leadTimeDays', 'safetyStock'] as const).map(
    (field) =>
      createValidationCase(`when ${field} is null should return a validation error`, {
        ...validCreateItem,
        [field]: null,
      }, field),
  ),
  createValidationCase('when itemCode is blank should return a validation error', {
    ...validCreateItem,
    itemCode: '   ',
  }, 'itemCode'),
  createValidationCase('when itemCode exceeds 50 characters should return a validation error', {
    ...validCreateItem,
    itemCode: 'i'.repeat(51),
  }, 'itemCode'),
  createValidationCase('when itemCode is not a string should return a validation error', {
    ...validCreateItem,
    itemCode: 123,
  }, 'itemCode'),
  createValidationCase('when name is blank should return a validation error', {
    ...validCreateItem,
    name: '   ',
  }, 'name'),
  createValidationCase('when name exceeds 200 characters should return a validation error', {
    ...validCreateItem,
    name: 'n'.repeat(201),
  }, 'name'),
  createValidationCase('when name is not a string should return a validation error', {
    ...validCreateItem,
    name: 123,
  }, 'name'),
  createValidationCase('when itemType is invalid should return a validation error', {
    ...validCreateItem,
    itemType: 'INVALID',
  }, 'itemType'),
  createValidationCase('when unitOfMeasure is blank should return a validation error', {
    ...validCreateItem,
    unitOfMeasure: '   ',
  }, 'unitOfMeasure'),
  createValidationCase('when unitOfMeasure exceeds 20 characters should return a validation error', {
    ...validCreateItem,
    unitOfMeasure: 'U'.repeat(21),
  }, 'unitOfMeasure'),
  createValidationCase('when unitOfMeasure is not a string should return a validation error', {
    ...validCreateItem,
    unitOfMeasure: 123,
  }, 'unitOfMeasure'),
  createValidationCase('when makeBuy is invalid should return a validation error', {
    ...validCreateItem,
    makeBuy: 'INVALID',
  }, 'makeBuy'),
  createValidationCase('when RAW_MATERIAL is not BUY should return a validation error', {
    ...validCreateItem,
    itemType: 'RAW_MATERIAL',
    makeBuy: 'MAKE',
  }, 'makeBuy'),
  createValidationCase('when leadTimeDays is less than 1 should return a validation error', {
    ...validCreateItem,
    leadTimeDays: 0,
  }, 'leadTimeDays'),
  createValidationCase('when leadTimeDays is not an integer should return a validation error', {
    ...validCreateItem,
    leadTimeDays: 1.5,
  }, 'leadTimeDays'),
  createValidationCase('when leadTimeDays is not a number should return a validation error', {
    ...validCreateItem,
    leadTimeDays: '5',
  }, 'leadTimeDays'),
  createValidationCase('when safetyStock is negative should return a validation error', {
    ...validCreateItem,
    safetyStock: -0.01,
  }, 'safetyStock'),
  createValidationCase('when safetyStock is not a number should return a validation error', {
    ...validCreateItem,
    safetyStock: '10',
  }, 'safetyStock'),
  createValidationCase('when an unsupported field is supplied should return a validation error', {
    ...validCreateItem,
    active: false,
  }),
];
