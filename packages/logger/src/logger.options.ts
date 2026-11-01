import type { Level } from "pino";

export interface SharedLoggerOptions {
  serviceName: string;
  level?: Level;
  microservice?: boolean;
}
