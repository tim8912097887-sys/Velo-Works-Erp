import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SharedLoggerModule } from '@app/logger';
import { SlowRequestMiddleware } from '@app/logger-middleware';

@Module({
  imports: [
    SharedLoggerModule.createLoggerModule({
      serviceName: 'engineer-service',
      level: 'info',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, SlowRequestMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SlowRequestMiddleware).forRoutes(AppController);
  }
}
