import { getApp } from '../../setup.js';
import { DbService } from '../../../infrastruture/persistence/db.service.js';

export const resetDb = async () => {
  const app = getApp();
  const dbService = app.get(DbService);

  await dbService.$transaction([
    dbService.bomComponent.deleteMany(),
    dbService.bomHeader.deleteMany(),
    dbService.item.deleteMany(),
  ]);
};
