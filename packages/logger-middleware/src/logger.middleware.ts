import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PinoLogger } from "nestjs-pino";

// Extend Express Request type to include custom performance/trace properties
declare module 'express' {
  interface Request {
    startTime?: number;
    requestId?: string;
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Performance Profiling: Mark start time
    req.startTime = Date.now();

    // Consume the validated request ID already provided by pino-http
    req.requestId = (req.id as string) || "-";

    res.on("finish", () => {
      const duration = Date.now() - (req.startTime ?? Date.now());

      if (duration > 1000) {
        this.logger.warn(
          `Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`,
        );
      }
    });

    next();
  }
}
