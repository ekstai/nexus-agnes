import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ConversationDto,
  ConversationDetailDto,
  ConversationListResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
  ChatSendRequest,
  ChatToolRequest,
  ChatToolResponse,
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

const CHAT_PREFIX = '/api/chat';
const CONV_PREFIX = '/api/conversations';

// 对话列表
export async function getConversations(): Promise<ConversationListResponse> {
  try {
    const response = await axiosForBackend({
      url: CONV_PREFIX,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取对话列表失败', error);
    throw error;
  }
}

// 创建对话
export async function createConversation(
  data: CreateConversationRequest
): Promise<ConversationDto> {
  try {
    const response = await axiosForBackend({
      url: CONV_PREFIX,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建对话失败', error);
    throw error;
  }
}

// 获取对话详情
export async function getConversation(
  id: string
): Promise<ConversationDetailDto> {
  try {
    const response = await axiosForBackend({
      url: `${CONV_PREFIX}/${id}`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取对话详情失败', error);
    throw error;
  }
}

// 更新对话
export async function updateConversation(
  id: string,
  data: UpdateConversationRequest
): Promise<ConversationDto> {
  try {
    const response = await axiosForBackend({
      url: `${CONV_PREFIX}/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新对话失败', error);
    throw error;
  }
}

// 删除对话
export async function deleteConversation(id: string): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: `${CONV_PREFIX}/${id}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error('删除对话失败', error);
    throw error;
  }
}

// 发送消息
export async function sendMessage(
  data: ChatSendRequest
): Promise<{ conversationId: string; message: MessageDto }> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/send`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('发送消息失败', error);
    throw error;
  }
}

// 执行工具
export async function executeTool(
  data: ChatToolRequest
): Promise<ChatToolResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/tool`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('执行工具失败', error);
    throw error;
  }
}

// 回写客户端本地执行(相机/电脑自动化)的工具结果
export async function saveClientToolResult(
  data: {
    conversationId: string;
    toolCallId: string;
    toolName: string;
    result: any;
  }
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/tool-result`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('保存工具结果失败', error);
    throw error;
  }
}

// 改写消息
export async function rewriteMessage(data: RewriteRequest): Promise<RewriteResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/rewrite`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('改写失败', error);
    throw error;
  }
}

// 时间机器：从某条消息处分叉
export async function timelineBranch(
  data: TimelineBranchRequest
): Promise<TimelineBranchResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/timeline-branch`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('时间分叉失败', error);
    throw error;
  }
}

// 多角色辩论
export async function debate(data: DebateRequest): Promise<DebateResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/debate`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('辩论失败', error);
    throw error;
  }
}

// 思维导图
export async function generateMindMap(data: MindMapRequest): Promise<MindMapResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/mindmap`,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('生成思维导图失败', error);
    throw error;
  }
}

// 网页摘要提取
export async function fetchUrlSummary(url: string): Promise<ExtractResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/fetch-url-summary`,
      method: 'POST',
      data: { url },
    });
    return response.data;
  } catch (error) {
    logger.error('网页摘要失败', error);
    throw error;
  }
}

// 文字要点提取
export async function summarizeText(text: string): Promise<ExtractResponse> {
  try {
    const response = await axiosForBackend({
      url: `${CHAT_PREFIX}/summarize`,
      method: 'POST',
      data: { text },
    });
    return response.data;
  } catch (error) {
    logger.error('提取要点失败', error);
    throw error;
  }
}
