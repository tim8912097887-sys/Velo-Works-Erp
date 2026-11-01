import { LoggerModule } from "nestjs-pino";
import type { DynamicModule } from "@nestjs/common";
import { stdTimeFunctions } from "pino";

import type { SharedLoggerOptions } from "./logger.options.js";
import { REDACT_PATHS } from "./logger.redact.js";

export function createLoggerModule(
  options: SharedLoggerOptions,
): DynamicModule {
  const { serviceName, level = "info", microservice = false } = options;

  if (!serviceName.trim()) {
    throw new Error("Logger serviceName cannot be empty");
  }

  return LoggerModule.forRoot({
    pinoHttp: {
      // Service identification
      base: {
        service: serviceName,
      },

      // Log level
      level,

      // JSON output
      formatters: {
        level(label) {
          return {
            level: label,
          };
        },
      },

      // ISO 8601 timestamp
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

      // Security
      redact: {
        paths: [...REDACT_PATHS],
        censor: "[REDACTED]",
      },

      // Error serialization
      serializers: {
        err: (error) => ({
          type: error.type,
          message: error.message,
          stack: error.stack,
          code: error.code,
        }),
      },
    },

    // Enable NestJS microservice message logging when needed
    ...(microservice ? { microservice: true } : {}),
  });
}
