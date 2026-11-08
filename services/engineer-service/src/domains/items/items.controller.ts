import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { successResponse, ResponseMeta } from '@app/response';
import { ItemsService } from './items.service.js';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe.js';
import { type CreateItemDto, CreateItemSchema } from './dto/create-item.dto.js';
import { type GetItemsQueryDto, GetItemsQuerySchema } from './dto/get-all.dto.js';
import { type ItemParamDto, ItemParamSchema } from './dto/id.dto.js';
import { type UpdateItemDto, UpdateItemSchema } from './dto/update-item.dto.js';

@Controller('/api/v1/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(new ZodValidationPipe(CreateItemSchema)) createItemDto: CreateItemDto) {
    const data = await this.itemsService.create(createItemDto);
    return this.successResponse(data);
  }

  @Get()
  async findAll(@Query(new ZodValidationPipe(GetItemsQuerySchema)) query: GetItemsQueryDto) {
    const data = await this.itemsService.findAll(query);
    return this.successResponse(data);
  }

  @Get(':id')
  async findOne(@Param(new ZodValidationPipe(ItemParamSchema)) params: ItemParamDto) {
    const data = await this.itemsService.findOne(params.id);
    return this.successResponse(data);
  }

  @Patch(':id')
  async update(
    @Param(new ZodValidationPipe(ItemParamSchema)) params: ItemParamDto,
    @Body(new ZodValidationPipe(UpdateItemSchema)) updateItemDto: UpdateItemDto,
  ) {
    const data = await this.itemsService.update(params.id, updateItemDto);
    return this.successResponse(data);
  }

  @Patch(':id/activate')
  async activate(@Param(new ZodValidationPipe(ItemParamSchema)) params: ItemParamDto) {
    const data = await this.itemsService.activate(params.id);
    return this.successResponse(data);
  }

  @Patch(':id/inactivate')
  async inactivate(@Param(new ZodValidationPipe(ItemParamSchema)) params: ItemParamDto) {
    const data = await this.itemsService.inactivate(params.id);
    return this.successResponse(data);
  }

  private successResponse(data: unknown, meta?: ResponseMeta) {
    return successResponse(data, meta);
  }
}
