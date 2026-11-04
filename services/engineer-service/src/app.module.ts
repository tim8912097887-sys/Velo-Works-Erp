import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SharedLoggerModule } from '@app/logger';
import { SlowRequestMiddleware } from '@app/logger-middleware';
import { ItemsModule } from './domains/items/items.module.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.js';
import { GlobalExceptionFilter } from './shared/filters/error-handler.filter.js';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true, // Tells NestJS to skip searching for .env on disk (Docker already injected process.env)
      validate: validateEnv,
    }),
    SharedLoggerModule.createLoggerModule({
      serviceName: 'engineer-service',
      level: 'info',
    }),
    ItemsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SlowRequestMiddleware,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter, // NestJS will now instantiate this via DI container
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SlowRequestMiddleware).forRoutes(AppController);
  }
}
