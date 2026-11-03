import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AppService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AppService.name);
  }

  getHello(): string {
    this.logger.info('Hello World!');
    return 'Hello World!';
  }

  async getError(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate a delay
    this.logger.error('This is an error message');
    return 'Error occurred';
  }
}
