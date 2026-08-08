import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ConversationService } from './conversation.service';
import type {
  ConversationDto,
  ConversationDetailDto,
  ConversationListResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
} from '@shared/api.interface';

@Controller('api/conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @NeedLogin()
  async list(@Req() req: { userContext: { userId: string } }): Promise<ConversationListResponse> {
    const { userId } = req.userContext;
    return this.conversationService.list(userId);
  }

  @Post()
  @NeedLogin()
  async create(
    @Req() req: { userContext: { userId: string } },
    @Body() body: CreateConversationRequest,
  ): Promise<ConversationDto> {
    const { userId } = req.userContext;
    return this.conversationService.create(userId, body);
  }

  @Get(':id')
  @NeedLogin()
  async getDetail(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<ConversationDetailDto> {
    const { userId } = req.userContext;
    return this.conversationService.getDetail(userId, id);
  }

  @Patch(':id')
  @NeedLogin()
  async update(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
    @Body() body: UpdateConversationRequest,
  ): Promise<ConversationDto> {
    const { userId } = req.userContext;
    return this.conversationService.update(userId, id, body);
  }

  @Delete(':id')
  @NeedLogin()
  async delete(
    @Req() req: { userContext: { userId: string } },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.conversationService.delete(userId, id);
    return { success: true };
  }
}
