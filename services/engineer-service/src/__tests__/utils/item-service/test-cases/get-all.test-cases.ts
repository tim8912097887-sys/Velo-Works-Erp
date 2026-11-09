export interface GetAllItemsTestCase {
  description: string;
  query: Record<string, string>;
}

export const getAllItemsTestCases: GetAllItemsTestCase[] = [
  {
    description:
      'when fetch item at page 3 and limit is 10 and sort by itemCode should return correct 10 items that are in the right order',
    query: { offset: '20', limit: '10', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when fetch items without offset and limit should return the first 20 items',
    query: { sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when fetch items at offset 0 and limit 1 should return the first item',
    query: { offset: '0', limit: '1', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when offset is empty should treat it as 0',
    query: { offset: '', limit: '1', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when fetch items at the last offset with limit 1 should return the last item',
    query: { offset: '49', limit: '1', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when fetch items with the maximum limit should return all seeded items',
    query: { limit: '100', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description:
      'when filter items by itemType should return only items with the selected itemType',
    query: { itemType: 'RAW_MATERIAL', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description:
      'when filter items by FINISHED_GOOD should return only items with the selected itemType',
    query: { itemType: 'FINISHED_GOOD', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description:
      'when filter items by SUBASSEMBLY should return only items with the selected itemType',
    query: { itemType: 'SUBASSEMBLY', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when filter items by makeBuy should return only items with the selected makeBuy',
    query: { makeBuy: 'MAKE', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when filter items by BUY should return only items with the selected makeBuy',
    query: { makeBuy: 'BUY', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when filter items by BOTH should return only items with the selected makeBuy',
    query: { makeBuy: 'BOTH', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description:
      'when filter items by itemType and makeBuy should return only items matching both filters',
    query: {
      itemType: 'SUBASSEMBLY',
      makeBuy: 'BOTH',
      sortBy: 'itemCode',
      sortOrder: 'desc',
    },
  },
  {
    description:
      'when filter and search items together should return only items matching all criteria',
    query: {
      itemType: 'RAW_MATERIAL',
      makeBuy: 'BUY',
      search: 'RM-',
      sortBy: 'itemCode',
      sortOrder: 'asc',
    },
  },
  {
    description:
      'when search the item name with non-empty should return the data with name or itemCode partial match',
    query: { search: 'Precision', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description:
      'when search the itemCode with non-empty should return the data with name or itemCode partial match',
    query: { search: 'RM-0', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when search items with no match should return an empty data array',
    query: { search: 'no matching item', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when search is empty should return all items',
    query: { search: '', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when search contains only whitespace should return all items',
    query: { search: '   ', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when search contains surrounding whitespace should trim before matching',
    query: { search: ' Precision ', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when search is at the maximum length should return matching items',
    query: { search: 'a'.repeat(100), sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when whitespace search exceeds 100 characters should trim before validation',
    query: { search: ' '.repeat(101), sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description:
      'when sort items by name in ascending order should return items in the right order',
    query: { limit: '50', sortBy: 'name', sortOrder: 'asc' },
  },
  {
    description:
      'when sort items by leadTimeDays in descending order should return items in the right order',
    query: { limit: '50', sortBy: 'leadTimeDays', sortOrder: 'desc' },
  },
  {
    description:
      'when sort items by itemCode in descending order should return items in the right order',
    query: { limit: '50', sortBy: 'itemCode', sortOrder: 'desc' },
  },
  {
    description:
      'when sort items by name in descending order should return items in the right order',
    query: { limit: '50', sortBy: 'name', sortOrder: 'desc' },
  },
  {
    description:
      'when sort items by leadTimeDays in ascending order should return items in the right order',
    query: { limit: '50', sortBy: 'leadTimeDays', sortOrder: 'asc' },
  },
  {
    description: 'when sortBy is provided without sortOrder should sort items in ascending order',
    query: { limit: '50', sortBy: 'itemCode' },
  },
  {
    description: 'when sortOrder is provided without sortBy should return all items',
    query: { limit: '50', sortOrder: 'desc' },
  },
  {
    description:
      'when fetch items with an offset beyond the available items should return an empty data array',
    query: { offset: '100', limit: '10', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when offset equals the total number of items should return an empty data array',
    query: { offset: '50', limit: '10', sortBy: 'itemCode', sortOrder: 'asc' },
  },
  {
    description: 'when offset uses an integer exponent should return the matching page',
    query: { offset: '2e1', limit: '10', sortBy: 'itemCode', sortOrder: 'asc' },
  },
];

export interface GetAllItemsValidationTestCase {
  description: string;
  query: Record<string, string>;
  field?: string;
}

export const getAllItemsValidationTestCases: GetAllItemsValidationTestCase[] = [
  {
    description: 'when offset is a negative number should return a validation error',
    query: { offset: '-1' },
    field: 'offset',
  },
  {
    description: 'when offset is not an integer should return a validation error',
    query: { offset: '1.5' },
    field: 'offset',
  },
  {
    description: 'when offset is not a number should return a validation error',
    query: { offset: 'invalid' },
    field: 'offset',
  },
  {
    description: 'when offset is an infinite number should return a validation error',
    query: { offset: 'Infinity' },
    field: 'offset',
  },
  {
    description: 'when limit is less than 1 should return a validation error',
    query: { limit: '0' },
    field: 'limit',
  },
  {
    description: 'when limit is greater than 100 should return a validation error',
    query: { limit: '101' },
    field: 'limit',
  },
  {
    description: 'when limit is not an integer should return a validation error',
    query: { limit: '1.5' },
    field: 'limit',
  },
  {
    description: 'when limit is not a number should return a validation error',
    query: { limit: 'invalid' },
    field: 'limit',
  },
  {
    description: 'when limit is empty should return a validation error',
    query: { limit: '' },
    field: 'limit',
  },
  {
    description: 'when itemType is invalid should return a validation error',
    query: { itemType: 'INVALID' },
    field: 'itemType',
  },
  {
    description: 'when makeBuy is invalid should return a validation error',
    query: { makeBuy: 'INVALID' },
    field: 'makeBuy',
  },
  {
    description: 'when sortBy is invalid should return a validation error',
    query: { sortBy: 'createdAt' },
    field: 'sortBy',
  },
  {
    description: 'when sortOrder is invalid should return a validation error',
    query: { sortOrder: 'descending' },
    field: 'sortOrder',
  },
  {
    description: 'when search exceeds 100 characters should return a validation error',
    query: { search: 'a'.repeat(101) },
    field: 'search',
  },
  {
    description: 'when query contains an unknown field should return a validation error',
    query: { unknown: 'true' },
  },
];
