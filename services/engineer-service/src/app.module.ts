import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SharedLoggerModule } from '@app/logger';
import { SlowRequestMiddleware } from '@app/logger-middleware';
import { ItemModule } from './item/item.module';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [
    SharedLoggerModule.createLoggerModule({
      serviceName: 'engineer-service',
      level: 'info',
    }),
    ItemModule,
    ItemsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SlowRequestMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SlowRequestMiddleware).forRoutes(AppController);
  }
}
