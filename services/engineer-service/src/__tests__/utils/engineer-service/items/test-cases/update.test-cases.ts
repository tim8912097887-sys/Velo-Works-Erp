const updateItemTestCases = [
  {
    description: 'when updating the name should return the item with the new name',
    body: { name: 'Updated item name' },
    expected: { name: 'Updated item name' },
  },
  {
    description: 'when updating unitOfMeasure should return the item with the new unit',
    body: { unitOfMeasure: 'BOX' },
    expected: { unitOfMeasure: 'BOX' },
  },
  {
    description: 'when updating leadTimeDays to its minimum should return the updated item',
    body: { leadTimeDays: 1 },
    expected: { leadTimeDays: 1 },
  },
  {
    description: 'when updating safetyStock to zero should return the updated item',
    body: { safetyStock: 0 },
    expected: { safetyStock: 0 },
  },
  {
    description: 'when updating makeBuy should return the item with the new value',
    body: { makeBuy: 'BOTH' },
    expected: { makeBuy: 'BOTH' },
  },
  {
    description: 'when updating makeBuy to MAKE should return the item with the new value',
    body: { makeBuy: 'MAKE' },
    expected: { makeBuy: 'MAKE' },
  },
  {
    description: 'when updating name and unitOfMeasure at their maximum lengths should succeed',
    body: { name: 'N'.repeat(200), unitOfMeasure: 'U'.repeat(20) },
    expected: { name: 'N'.repeat(200), unitOfMeasure: 'U'.repeat(20) },
  },
  {
    description: 'when updating multiple fields should return all updated values',
    body: {
      name: '  Updated name  ',
      unitOfMeasure: '  MTRS  ',
      leadTimeDays: 12,
      safetyStock: 4.5,
      makeBuy: 'BUY',
    },
    expected: {
      name: 'Updated name',
      unitOfMeasure: 'MTRS',
      leadTimeDays: 12,
      safetyStock: 4.5,
      makeBuy: 'BUY',
    },
  },
  {
    description: 'when updating with an empty object should leave the item unchanged',
    body: {},
    expected: {},
  },
];

export { updateItemTestCases };

const validUpdateItem = { name: 'Valid item name' };
const updateValidationCase = (
  description: string,
  body: Record<string, unknown>,
  field?: string,
) => ({ description, body, field });

export const updateItemValidationTestCases = [
  ...(['name', 'unitOfMeasure', 'leadTimeDays', 'safetyStock', 'makeBuy'] as const).map((field) =>
    updateValidationCase(`when ${field} is null should return a validation error`, {
      [field]: null,
    }, field),
  ),
  updateValidationCase('when name is blank should return a validation error', { name: '   ' }, 'name'),
  updateValidationCase('when name exceeds 200 characters should return a validation error', {
    name: 'n'.repeat(201),
  }, 'name'),
  updateValidationCase('when name is not a string should return a validation error', { name: 123 }, 'name'),
  updateValidationCase('when unitOfMeasure is blank should return a validation error', {
    unitOfMeasure: '   ',
  }, 'unitOfMeasure'),
  updateValidationCase('when unitOfMeasure exceeds 20 characters should return a validation error', {
    unitOfMeasure: 'U'.repeat(21),
  }, 'unitOfMeasure'),
  updateValidationCase('when unitOfMeasure is not a string should return a validation error', {
    unitOfMeasure: 123,
  }, 'unitOfMeasure'),
  updateValidationCase('when leadTimeDays is less than 1 should return a validation error', {
    leadTimeDays: 0,
  }, 'leadTimeDays'),
  updateValidationCase('when leadTimeDays is not an integer should return a validation error', {
    leadTimeDays: 1.5,
  }, 'leadTimeDays'),
  updateValidationCase('when leadTimeDays is not a number should return a validation error', {
    leadTimeDays: '5',
  }, 'leadTimeDays'),
  updateValidationCase('when safetyStock is negative should return a validation error', {
    safetyStock: -0.01,
  }, 'safetyStock'),
  updateValidationCase('when makeBuy is invalid should return a validation error', {
    makeBuy: 'INVALID',
  }, 'makeBuy'),
  updateValidationCase('when an unsupported field is supplied should return a validation error', {
    ...validUpdateItem,
    itemCode: 'NOT-ALLOWED',
  }),
];
