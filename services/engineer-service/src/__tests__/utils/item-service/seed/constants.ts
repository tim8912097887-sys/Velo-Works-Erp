const ITEMS_URL = '/api/v1/items';

export const CREATE_ITEM_URL = ITEMS_URL;
export const GET_ALL_ITEMS_URL = ITEMS_URL;
export const GET_ITEM_URL = (itemId: string) => `${ITEMS_URL}/${itemId}`;
export const UPDATE_ITEM_URL = (itemId: string) => `${ITEMS_URL}/${itemId}`;
export const ACTIVATE_ITEM_URL = (itemId: string) => `${ITEMS_URL}/${itemId}/activate`;
export const INACTIVATE_ITEM_URL = (itemId: string) => `${ITEMS_URL}/${itemId}/inactivate`;
