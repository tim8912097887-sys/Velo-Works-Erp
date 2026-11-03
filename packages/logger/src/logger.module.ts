import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { SharedLoggerOptions } from './logger.options.js';
import { REDACT_PATHS } from './logger.redact.js';

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9\-_/.]{8,128}$/;

@Module({})
export class SharedLoggerModule {
  static createLoggerModule(options: SharedLoggerOptions): DynamicModule {
    const { serviceName, level = 'info', microservice = false } = options;

    if (!serviceName.trim()) {
      throw new Error('Logger serviceName cannot be empty');
    }

    return LoggerModule.forRoot({
      pinoHttp: {
        base: {
          service: serviceName,
        },
        autoLogging: false,
        level,
        genReqId: (req, res) => {
          const existingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];

          const requestId = Array.isArray(existingId)
            ? existingId[0]
            : existingId || crypto.randomUUID();

          const validRequestId = SAFE_REQUEST_ID_REGEX.test(requestId.trim())
            ? requestId.trim()
            : crypto.randomUUID();

          res.setHeader('X-Request-Id', validRequestId);
          return validRequestId;
        },
        redact: {
          paths: [...REDACT_PATHS],
          censor: '[REDACTED]',
        },
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        serializers: {
          err: (error) => ({
            type: error.type,
            message: error.message,
            stack: error.stack,
            code: error.code,
          }),
        },
      },
      ...(microservice ? { microservice: true } : {}),
    });
  }
}
