import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { successResponse, type SuccessResponse } from '@app/response';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): SuccessResponse<{ message: string }> {
    return successResponse({ message: this.appService.getHealth() });
  }
}
