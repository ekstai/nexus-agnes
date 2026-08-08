import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { MemoryService } from './memory.service';
import type {
  MemoryListResponse,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryDto,
  MemoryFlashbackResponse,
} from '@shared/api.interface';

@Controller('api/memories')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get()
  @NeedLogin()
  async list(
    @Req() req: { userContext: { userId: string } },
    @Query('category') category?: string,
  ): Promise<MemoryListResponse> {
    const { userId } = req.userContext;
    return this.memoryService.list(userId, category);
  }

  @Get('flashback')
  @NeedLogin()
  async flashback(
    @Req() req: { userContext: { userId: string } },
    @Query('q') q?: string,
  ): Promise<MemoryFlashbackResponse> {
    const { userId } = req.userContext;
    return this.memoryService.flashback(userId, q ?? '');
  }

  @Post()
  @NeedLogin()
  async create(
    @Req() req: { userContext: { userId: string } },
    @Body() dto: CreateMemoryRequest,
  ): Promise<MemoryDto> {
    const { userId } = req.userContext;
    return this.memoryService.create(userId, dto);
  }

  @Patch(':id')
  @NeedLogin()
  async update(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateMemoryRequest,
  ): Promise<MemoryDto> {
    const { userId } = req.userContext;
    return this.memoryService.update(userId, id, dto);
  }

  @Post(':id/star')
  @NeedLogin()
  async toggleStar(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<MemoryDto> {
    const { userId } = req.userContext;
    return this.memoryService.toggleStar(userId, id);
  }

  @Delete(':id')
  @NeedLogin()
  async delete(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.memoryService.delete(userId, id);
  }
}