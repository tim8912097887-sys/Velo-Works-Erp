import { Injectable, NestMiddleware } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class SlowRequestMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = performance.now();

    res.on("finish", () => {
      const duration = performance.now() - start;

      if (duration > 1000) {
        this.logger.warn(
          {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: Math.round(duration),
          },
          "Slow request detected",
        );
      }
    });

    next();
  }
}
