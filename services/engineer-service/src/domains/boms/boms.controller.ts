import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { successResponse } from '@app/response';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe.js';
import { BomsService } from './boms.service.js';
import { type CreateBomBody, createBomBodySchema } from './dto/create-bom.dto.js';
import { createBomParamsSchema } from './dto/create-bom-params.dto.js';
import { type UpdateBomBody, updateBomBodySchema } from './dto/update-bom.dto.js';
import { updateBomParamsSchema } from './dto/update-bom-params.dto.js';
import {
  type GetBomRevisionsQuery,
  getBomRevisionsQuerySchema,
} from './dto/get-bom-revisions-query.dto.js';
import { type CopyBomBody, copyBomBodySchema } from './dto/copy-bom.dto.js';
import { explodeBomParamsSchema } from './dto/explode-bom-params.dto.js';
import {
  type GetBomExplosionQuery,
  getBomExplosionQuerySchema,
} from './dto/get-bom-explosion-query.dto.js';
import { activateBomParamsSchema } from './dto/activate-bom-params.dto.js';

@Controller('/api/v1/items')
export class BomsController {
  constructor(private readonly bomsService: BomsService) {}

  @Get(':itemId/bom-revisions')
  async findRevisions(
    @Param(new ZodValidationPipe(createBomParamsSchema)) params: { itemId: string },
    @Query(new ZodValidationPipe(getBomRevisionsQuerySchema)) query: GetBomRevisionsQuery,
  ) {
    const result = await this.bomsService.findRevisions(params.itemId, query);
    return successResponse(result.data, {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  @Get(':itemId/bom-revisions/:bomHeaderId')
  async findRevision(
    @Param(new ZodValidationPipe(updateBomParamsSchema))
    params: {
      itemId: string;
      bomHeaderId: string;
    },
  ) {
    const data = await this.bomsService.findRevision(params.itemId, params.bomHeaderId);
    return successResponse(data);
  }

  @Post(':itemId/bom-revisions/:bomHeaderId/copy')
  @HttpCode(HttpStatus.CREATED)
  async copyRevision(
    @Param(new ZodValidationPipe(updateBomParamsSchema))
    params: { itemId: string; bomHeaderId: string },
    @Body(new ZodValidationPipe(copyBomBodySchema)) body: CopyBomBody,
  ) {
    const data = await this.bomsService.copyRevision(params.itemId, params.bomHeaderId, body);
    return successResponse(data);
  }

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

  @Get(':itemId/bom-revisions/:bomHeaderId/explode')
  async explodeRevision(
    @Param(new ZodValidationPipe(explodeBomParamsSchema))
    params: {
      itemId: string;
      bomHeaderId: string;
    },
    @Query(new ZodValidationPipe(getBomExplosionQuerySchema)) query: GetBomExplosionQuery,
  ) {
    const data = await this.bomsService.explodeRevision(
      params.itemId,
      params.bomHeaderId,
      query.rootQuantity,
    );
    return successResponse(data);
  }

  @Post(':itemId/bom-revisions/:bomHeaderId/activate')
  @HttpCode(HttpStatus.OK)
  async activateBom(
    @Param(new ZodValidationPipe(activateBomParamsSchema))
    params: {
      itemId: string;
      bomHeaderId: string;
    },
  ) {
    const data = await this.bomsService.activateBom(params.itemId, params.bomHeaderId);

    return successResponse(data);
  }
}
