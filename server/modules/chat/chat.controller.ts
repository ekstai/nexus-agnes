import { Controller, Post, Body, Req } from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ChatService } from './chat.service';
import type {
  ChatSendRequest,
  ChatToolRequest,
  ChatToolResponse,
  ChatToolResultRequest,
  ChatToolResultResponse,
  MessageDto,
  DebateRequest,
  DebateResponse,
  MindMapRequest,
  MindMapResponse,
  RewriteRequest,
  RewriteResponse,
  TimelineBranchRequest,
  TimelineBranchResponse,
  ExtractResponse,
} from '@shared/api.interface';

interface SendResponse {
  conversationId: string;
  message: MessageDto;
}

interface UrlSummaryRequest {
  url: string;
}

interface SummarizeBody {
  text: string;
}

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @NeedLogin()
  async send(
    @Req() req: { userContext: { userId: string } },
    @Body() body: ChatSendRequest,
  ): Promise<SendResponse> {
    const { userId } = req.userContext;
    return this.chatService.send(userId, body);
  }

  @Post('tool')
  @NeedLogin()
  async tool(
    @Req() req: { userContext: { userId: string } },
    @Body() body: ChatToolRequest,
  ): Promise<ChatToolResponse> {
    const { userId } = req.userContext;
    return this.chatService.executeTool(userId, body);
  }

  @Post('tool-result')
  @NeedLogin()
  async toolResult(
    @Req() req: { userContext: { userId: string } },
    @Body() body: ChatToolResultRequest,
  ): Promise<ChatToolResultResponse> {
    const { userId } = req.userContext;
    return this.chatService.saveClientToolResult(userId, body);
  }

  @Post('rewrite')
  @NeedLogin()
  async rewrite(
    @Req() req: { userContext: { userId: string } },
    @Body() body: RewriteRequest,
  ): Promise<RewriteResponse> {
    const { userId } = req.userContext;
    return this.chatService.rewrite(userId, body);
  }

  @Post('timeline-branch')
  @NeedLogin()
  async timelineBranch(
    @Req() req: { userContext: { userId: string } },
    @Body() body: TimelineBranchRequest,
  ): Promise<TimelineBranchResponse> {
    const { userId } = req.userContext;
    return this.chatService.timelineBranch(userId, body);
  }

  @Post('debate')
  @NeedLogin()
  async debate(
    @Req() req: { userContext: { userId: string } },
    @Body() body: DebateRequest,
  ): Promise<DebateResponse> {
    const { userId } = req.userContext;
    return this.chatService.debate(userId, body);
  }

  @Post('mindmap')
  @NeedLogin()
  async mindMap(
    @Req() req: { userContext: { userId: string } },
    @Body() body: MindMapRequest,
  ): Promise<MindMapResponse> {
    const { userId } = req.userContext;
    return this.chatService.mindMap(userId, body);
  }

  @Post('fetch-url-summary')
  @NeedLogin()
  async fetchUrlSummary(
    @Req() req: { userContext: { userId: string } },
    @Body() body: UrlSummaryRequest,
  ): Promise<ExtractResponse> {
    const { userId } = req.userContext;
    return this.chatService.fetchUrlSummary(userId, body.url);
  }

  @Post('summarize')
  @NeedLogin()
  async summarize(
    @Req() req: { userContext: { userId: string } },
    @Body() body: SummarizeBody,
  ): Promise<ExtractResponse> {
    const { userId } = req.userContext;
    return this.chatService.summarize(userId, body.text);
  }
}