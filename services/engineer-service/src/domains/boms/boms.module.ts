import { Module } from '@nestjs/common';
import { BomsController } from './boms.controller.js';
import { BomsService } from './boms.service.js';
import { BomsRepository } from './boms.repository.js';
import { DbModule } from '../../infrastruture/persistence/db.module.js';

@Module({
  imports: [DbModule],
  controllers: [BomsController],
  providers: [BomsService, BomsRepository],
})
export class BomsModule {}
