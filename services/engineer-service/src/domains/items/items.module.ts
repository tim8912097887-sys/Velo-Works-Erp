import { Module } from '@nestjs/common';
import { ItemsService } from './items.service.js';
import { ItemsController } from './items.controller.js';
import { ItemsRepository } from './items.repository.js';
import { DbModule } from '../../infrastruture/persistence/db.module.js';

@Module({
  imports: [DbModule],
  controllers: [ItemsController],
  providers: [ItemsService, ItemsRepository],
})
export class ItemsModule {}
