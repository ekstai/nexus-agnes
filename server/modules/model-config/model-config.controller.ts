import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Logger,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import type {
  ModelConfigDto,
  ModelConfigListResponse,
  CreateModelConfigRequest,
  UpdateModelConfigRequest,
  ModelTestResponse,
  FetchModelsRequest,
  FetchModelsResponse,
} from '@shared/api.interface';
import { ModelConfigService } from './model-config.service';

@Controller('api/model-configs')
export class ModelConfigController {
  private readonly logger = new Logger(ModelConfigController.name);

  constructor(private readonly modelConfigService: ModelConfigService) {}

  @Post('fetch-models')
  @NeedLogin()
  async fetchModels(@Body() dto: FetchModelsRequest): Promise<FetchModelsResponse> {
    return this.modelConfigService.fetchModels(dto);
  }  @Get()
  @NeedLogin()
  async list(@Req() req: Request): Promise<ModelConfigListResponse> {
    const { userId } = req.userContext;
    return this.modelConfigService.list(userId);
  }

  @Post()
  @NeedLogin()
  async create(
    @Req() req: Request,
    @Body() dto: CreateModelConfigRequest,
  ): Promise<ModelConfigDto> {
    const { userId } = req.userContext;
    return this.modelConfigService.create(userId, dto);
  }

  @Put(':id')
  @NeedLogin()
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateModelConfigRequest,
  ): Promise<ModelConfigDto> {
    const { userId } = req.userContext;
    return this.modelConfigService.update(userId, id, dto);
  }

  @Delete(':id')
  @NeedLogin()
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.modelConfigService.delete(userId, id);
  }

  @Post(':id/test')
  @NeedLogin()
  async test(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ModelTestResponse> {
    const { userId } = req.userContext;
    return this.modelConfigService.test(userId, id);
  }
}
