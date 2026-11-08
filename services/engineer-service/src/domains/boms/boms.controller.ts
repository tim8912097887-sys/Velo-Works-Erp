import { Body, Controller, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { successResponse } from '@app/response';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe.js';
import { BomsService } from './boms.service.js';
import { type CreateBomBody, createBomBodySchema } from './dto/create-bom.dto.js';
import { createBomParamsSchema } from './dto/create-bom-params.dto.js';
import { type UpdateBomBody, updateBomBodySchema } from './dto/update-bom.dto.js';
import { updateBomParamsSchema } from './dto/update-bom-params.dto.js';

@Controller('/api/v1/items')
export class BomsController {
  constructor(private readonly bomsService: BomsService) {}

  @Post(':itemId/bom-revisions')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param(new ZodValidationPipe(createBomParamsSchema)) params: { itemId: string },
    @Body(new ZodValidationPipe(createBomBodySchema)) body: CreateBomBody,
  ) {
    const data = await this.bomsService.create(params.itemId, body);
    return successResponse(data);
  }

  @Put(':itemId/bom-revisions/:bomHeaderId')
  async update(
    @Param(new ZodValidationPipe(updateBomParamsSchema))
    params: { itemId: string; bomHeaderId: string },
    @Body(new ZodValidationPipe(updateBomBodySchema)) body: UpdateBomBody,
  ) {
    const data = await this.bomsService.update(params.itemId, params.bomHeaderId, body);
    return successResponse(data);
  }
}
