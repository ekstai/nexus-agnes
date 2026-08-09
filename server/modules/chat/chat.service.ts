import { Inject, Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, asc, sql, gt } from 'drizzle-orm';
import { conversation, message } from '@server/database/schema';
import { ConversationService } from '../conversation/conversation.service';
import { LlmService } from '../llm/llm.service';
import { MemoryService } from '../memory/memory.service';
import type { LlmMessage } from '../llm/llm.types';
import type {
  ChatSendRequest,
  ChatToolRequest,
  ChatToolResponse,
  ChatToolResultRequest,
  ChatToolResultResponse,
  MessageDto,
  ToolCall,
  DebateRequest,
  DebateResponse,
  MindMapRequest,
  MindMapResponse,
  MindMapNode,
  RewriteRequest,
  RewriteResponse,
  TimelineBranchRequest,
  TimelineBranchResponse,
  ExtractResponse,
} from '@shared/api.interface';

interface SendResult {
  conversationId: string;
  message: MessageDto;
}

const SYSTEM_PROMPT: string =
  '你是 Nexus Agnes，一个任务、专注、高效的桌面 AI 助手。回答要简洁有条理，优先使用中文；' +
  '需要结构化内容时使用 Markdown；涉及敏感操作时给出明确的建议与安全提醒。';

const LLM_ERROR_PREFIX = '模型调用失败：';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly conversationService: ConversationService,
    private readonly llmService: LlmService,
    private readonly memoryService: MemoryService,
  ) {}

  async send(userId: string, dto: ChatSendRequest): Promise<SendResult> {
    let conversationId: string = dto.conversationId ?? '';

    if (!conversationId) {
      const title = dto.message.slice(0, 20) || '新对话';
      const conv = await this.conversationService.create(userId, {
        title,
        modelConfigId: dto.modelConfigId,
      });
      conversationId = conv.id;
    } else {
      const convRows = await this.db
        .select()
        .from(conversation)
        .where(eq(conversation.id, conversationId));
      if (!convRows[0]) {
        throw new NotFoundException('Conversation not found');
      }
      if (convRows[0].userId !== userId) {
        throw new NotFoundException('Conversation not found');
      }
      if (dto.modelConfigId && dto.modelConfigId !== convRows[0].modelConfigId) {
        await this.db
          .update(conversation)
          .set({ modelConfigId: dto.modelConfigId })
          .where(eq(conversation.id, conversationId));
      }
    }

    // Load model config
    const configRow = await this.llmService.loadConfig(userId, dto.modelConfigId);
    if (!configRow) {
      throw new BadRequestException('未配置模型，请先在设置中完成模型配置');
    }
    const llmOptions = this.llmService.toApiOptions(configRow);

    // Next order index
    const maxOrderResult = await this.db
      .select({ max: sql<number>`COALESCE(MAX(${message.orderIndex}), -1)` })
      .from(message)
      .where(eq(message.conversationId, conversationId));
    const nextOrderIndex: number = Number(maxOrderResult[0]?.max ?? -1) + 1;

    // Save user message
    const userMsgRows = await this.db
      .insert(message)
      .values({
        conversationId,
        role: 'user',
        content: dto.message,
        status: 'success',
        orderIndex: nextOrderIndex,
      })
      .returning();
    const userMsgRow = userMsgRows[0];
    if (!userMsgRow) {
      throw new Error('Failed to save user message');
    }

    // Build conversation history for the LLM
    const historyRows = await this.db
      .select()
      .from(message)
      .where(eq(message.conversationId, conversationId))
      .orderBy(asc(message.orderIndex));
    const history: Array<{ role: 'user' | 'assistant'; content: string; toolName?: string }> =
      historyRows
        .filter((r) => r.role === 'user' || r.role === 'assistant')
        .map((r) => ({
          role: (r.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: r.content,
          toolName: r.toolName ?? undefined,
        }))
        .slice(-30);

    const messages = [
      { role: 'system' as const, content: configRow.systemPrompt || SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    ];

    // Handle simple math inline (lightweight, no tool round-trip)
    const lowerMsg = dto.message.toLowerCase();
    let assistantContent = '';
    let assistantToolCalls: ToolCall[] | undefined;

    if (lowerMsg.includes('计算') || lowerMsg.includes('calc')) {
      const expr = this.extractExpression(dto.message);
      try {
        assistantContent = `计算结果：${this.safeCalculate(expr)}`;
        assistantToolCalls = [
          { id: `tool_${Date.now()}`, name: 'calculator', args: { expression: expr }, status: 'success', result: this.safeCalculate(expr) },
        ];
      } catch (err) {
        // fall back to LLM for unparsed expressions
      }
    }

    if (!assistantContent) {
      let llmResult;
      try {
        llmResult = await this.llmService.chat(messages as LlmMessage[], llmOptions);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`LLM call failed: ${msg}`);
        throw new BadRequestException(LLM_ERROR_PREFIX + msg.slice(0, 300));
      }
      assistantContent = llmResult.content;
      assistantToolCalls = undefined;
    }

    const promptTokens = Math.max(1, Math.round(dto.message.length / 2));
    const completionTokens = Math.max(1, Math.round(assistantContent.length / 2));
    const tokenUsage = { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };

    const assistantMsg = await this.db
      .insert(message)
      .values({
        conversationId,
        role: 'assistant',
        content: assistantContent,
        toolCalls: assistantToolCalls as unknown as Record<string, unknown>[] | undefined,
        status: 'success',
        orderIndex: nextOrderIndex + 1,
        tokenUsage: tokenUsage as unknown as Record<string, unknown>,
      })
      .returning();
    const assistantMsgRow = assistantMsg[0];
    if (!assistantMsgRow) {
      throw new Error('Failed to save assistant message');
    }

    await this.conversationService.touchLastMessageAt(conversationId);
    this.logger.log(`Chat send completed for conversation ${conversationId}`);

    return {
      conversationId,
      message: {
        id: assistantMsgRow.id,
        conversationId: assistantMsgRow.conversationId,
        role: 'assistant',
        content: assistantMsgRow.content,
        toolCalls: assistantToolCalls ?? undefined,
        status: 'success',
        orderIndex: assistantMsgRow.orderIndex,
        createdAt: assistantMsgRow.createdAt.toISOString(),
        tokenUsage,
      },
    };
  }

  async rewrite(userId: string, dto: RewriteRequest): Promise<RewriteResponse> {
    const conv = await this.verifyConversation(userId, dto.conversationId);
    const msgRows = await this.db
      .select()
      .from(message)
      .where(eq(message.id, dto.messageId));
    const msg = msgRows[0];
    if (!msg || msg.conversationId !== dto.conversationId) {
      throw new NotFoundException('Message not found');
    }
    const configRow = await this.llmService.loadConfig(userId, conv.modelConfigId ?? undefined);
    if (!configRow) {
      throw new BadRequestException('未配置模型，请先在设置中完成模型配置');
    }
    const result = await this.llmService.chatRaw(
      [
        { role: 'system', content: configRow.systemPrompt ?? SYSTEM_PROMPT },
        { role: 'user', content: `请用更有条理、更为精炼的方式改写下面这段回复，保留原意：\n\n${msg.content}` },
      ],
      this.llmService.toApiOptions(configRow),
    );

    const updated = await this.db
      .update(message)
      .set({ content: result })
      .where(eq(message.id, dto.messageId))
      .returning();
    const row = updated[0];
    return {
      message: {
        id: row.id,
        conversationId: row.conversationId,
        role: 'assistant',
        content: row.content,
        status: 'success',
        orderIndex: row.orderIndex,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }

  async timelineBranch(userId: string, dto: TimelineBranchRequest): Promise<TimelineBranchResponse> {
    const conv = await this.verifyConversation(userId, dto.conversationId);
    const msgRows = await this.db
      .select()
      .from(message)
      .where(eq(message.id, dto.messageId));
    const targetMsg = msgRows[0];
    if (!targetMsg || targetMsg.conversationId !== dto.conversationId) {
      throw new NotFoundException('Message not found');
    }
    // 从目标消息之后开始分叉：删除其后所有消息
    await this.db
      .delete(message)
      .where(and(eq(message.conversationId, dto.conversationId), gt(message.orderIndex, targetMsg.orderIndex)));
    await this.conversationService.touchLastMessageAt(dto.conversationId);
    void conv;
    return { success: true };
  }

  async debate(userId: string, dto: DebateRequest): Promise<DebateResponse> {
    const conv = await this.verifyConversation(userId, dto.conversationId);
    const msgRows = await this.db
      .select()
      .from(message)
      .where(eq(message.id, dto.messageId));
    const msg = msgRows[0];
    if (!msg || msg.conversationId !== dto.conversationId) {
      throw new NotFoundException('Message not found');
    }
    const configRow = await this.llmService.loadConfig(userId, conv.modelConfigId ?? undefined);
    if (!configRow) {
      throw new BadRequestException('未配置模型，请先在设置中完成模型配置');
    }
const opts = this.llmService.toApiOptions(configRow);
    const baseSystem = configRow.systemPrompt ?? SYSTEM_PROMPT;
    const roles = [
      { roleId: 'optimist' as const, roleName: '乐观派', roleDesc: '站在积极与机会角度，指出潜在收益、可行路径与有利趋势。' },
      { roleId: 'risk' as const, roleName: '风险官', roleDesc: '从中立严谨角度，识别风险、痛点、前提不足与可能的失败点。' },
      { roleId: 'creative' as const, roleName: '创意师', roleDesc: '跳出常规，提供创新、跨界的替代方案与灵感。' },
    ];

    const results = await Promise.allSettled(
      roles.map(async (role) => {
        const content = await this.llmService.chatRaw(
          [
            { role: 'system', content: `${baseSystem}\n\n现在请你扮演“${role.roleName}”：${role.roleDesc}。请针对下面的议题给出你的独立观点（200-400 字）。` },
            { role: 'user', content: `议题：${msg.content}` },
          ],
          opts,
        );
        return { ...role, content };
      }),
    );

    const opinions = roles.map((role, i) => {
      const r = results[i];
      return {
        roleId: role.roleId,
        roleName: role.roleName,
        roleDesc: role.roleDesc,
        content: r.status === 'fulfilled' ? r.value.content : `（生成失败：${String(r.reason)}）`,
      };
    });

    return { opinions };
  }

  async mindMap(userId: string, dto: MindMapRequest): Promise<MindMapResponse> {
    const conv = await this.verifyConversation(userId, dto.conversationId);
    const configRow = await this.llmService.loadConfig(userId, conv.modelConfigId ?? undefined);
    if (!configRow) {
      throw new BadRequestException('未配置模型，请先在设置中完成模型配置');
    }
    const prompt = `请把下面的内容提炼成一张思维导图。只输出一个 JSON，不要任何额外文字，结构为：
{ "label": "主题", "children": [ { "label": "...", "children": [] } ] }，最多 3 层。\n\n内容：\n${dto.content.slice(0, 6000)}`;
    const raw = await this.llmService.chatRaw(
      [
        { role: 'system', content: configRow.systemPrompt ?? SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      this.llmService.toApiOptions(configRow),
    );
    const parsed = this.parseJson(raw);
    const root = this.normalizeNode(parsed);
    return { root };
  }

  async fetchUrlSummary(_userId: string, url: string): Promise<ExtractResponse> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(timer);
      const text = await res.text();
      const cleaned = text
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12000);
      return { summary: cleaned };
    } catch (err: unknown) {
      throw new BadRequestException(`链接抓取失败：${(err as Error).message}`);
    }
  }

  async summarize(userId: string, text: string): Promise<ExtractResponse> {
    const configRow = await this.llmService.loadConfig(userId);
    if (!configRow) {
      throw new BadRequestException('未配置模型，请先在设置中完成模型配置');
    }
    const result = await this.llmService.chatRaw(
      [
        { role: 'system', content: configRow.systemPrompt ?? SYSTEM_PROMPT },
        { role: 'user', content: `请对下面这段文字提取要点，输出简短的要点列表（中文）：\n\n${text.slice(0, 8000)}` },
      ],
      this.llmService.toApiOptions(configRow),
    );
    return { summary: result };
  }

  async executeTool(userId: string, dto: ChatToolRequest): Promise<ChatToolResponse> {
    const conv = await this.verifyConversation(userId, dto.conversationId);
    void conv;
    const toolName = dto.toolName;
    let result: unknown;
    try {
      result = await this.runTool(toolName, dto.args ?? {});
    } catch (err: unknown) {
      result = { error: err instanceof Error ? err.message : String(err) };
    }
    const maxOrder = await this.db
      .select({ max: sql<number>`COALESCE(MAX(${message.orderIndex}), -1)` })
      .from(message)
      .where(eq(message.conversationId, dto.conversationId));
    const nextOrderIndex = Number(maxOrder[0]?.max ?? -1) + 1;
    await this.db.insert(message).values({
      conversationId: dto.conversationId,
      role: 'tool',
      content: JSON.stringify(result),
      toolCallId: dto.toolCallId,
      toolName,
      status: 'success',
      orderIndex: nextOrderIndex,
    });
    await this.conversationService.touchLastMessageAt(dto.conversationId);
    return { result };
  }

  // ---- tool implementations ----

  /** 客户端本地执行(相机/电脑自动化)结果回写为工具消息 */
  async saveClientToolResult(
    userId: string,
    dto: ChatToolResultRequest,
  ): Promise<ChatToolResultResponse> {
    const conv = await this.verifyConversation(userId, dto.conversationId);
    void conv;
    const maxOrder = await this.db
      .select({ max: sql<number>`COALESCE(MAX(${message.orderIndex}), -1)` })
      .from(message)
      .where(eq(message.conversationId, dto.conversationId));
    const nextOrderIndex = Number(maxOrder[0]?.max ?? -1) + 1;
    await this.db.insert(message).values({
      conversationId: dto.conversationId,
      role: 'tool',
      content: JSON.stringify(dto.result ?? {}),
      toolCallId: dto.toolCallId,
      toolName: dto.toolName,
      status: 'success',
      orderIndex: nextOrderIndex,
    });
    await this.conversationService.touchLastMessageAt(dto.conversationId);
    return { success: true };
  }

  private async fetchJson(url: string, timeoutMs = 15000): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'NexusAgnes/2.2' },
      });
      if (!response.ok) {
        throw new Error(`API 请求失败 (HTTP ${response.status})`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  private async runTool(toolName: string, args: Record<string, any>): Promise<unknown> {
    switch (toolName) {
      case 'calculator': {
        return { expression: String(args.expression ?? ''), result: this.safeCalculate(String(args.expression ?? '')) };
      }
      case 'weather': {
        // 真实天气数据来源: wttr.in (无密钥)
        const city = String(args.city || args.defaultCity || '北京').trim();
        const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=zh`;
        let data: any;
        try {
          data = await this.fetchJson(url, 12000);
        } catch (err: unknown) {
          throw new Error(`天气服务暂不可用: ${err instanceof Error ? err.message : String(err)}`);
        }
        const area = data?.nearest_area?.[0];
        const cur = data?.current_condition?.[0];
        if (!cur) throw new Error('未获取到天气数据');
        const cityName = area?.areaName?.[0]?.value ?? city;
        const country = area?.country?.[0]?.value ?? '';
        const nextDays = (data?.weather ?? []).slice(1, 4).map((d: any) => ({
          date: d.date,
          high: `${d.maxtempC}°C`,
          low: `${d.mintempC}°C`,
          desc: d.hourly?.[0]?.lang_zh?.[0]?.value ?? d.hourly?.[0]?.weatherDesc?.[0]?.value ?? '',
        }));
        return {
          city: `${cityName}${country ? `, ${country}` : ''}`,
          temperature: `${cur.temp_C ?? '?'}°C`,
          feelsLike: `${cur.FeelsLikeC ?? '?'}°C`,
          condition: cur.lang_zh?.[0]?.value ?? cur.weatherDesc?.[0]?.value ?? '未知',
          humidity: `${cur.humidity ?? '?'}%`,
          wind: `${cur.windspeedKmph ?? cur.windspeedMiles ?? '?'} (${cur.winddir16Point ?? ''})`,
          visibility: cur.visibility ?? '',
          pressure: cur.pressure ?? '',
          localtime: cur.localObsDateTime ?? '',
          forecast: nextDays,
        };
      }
      case 'currency-convert': {
        const amount = Number(args.amount ?? 1);
        const from = String(args.from || args.defaultFrom || 'USD').toUpperCase().slice(0, 3);
        const to = String(args.to || args.defaultTo || 'CNY').toUpperCase().slice(0, 3);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('金额必须是大于 0 的数字');
        let data: any;
        try {
          data = await this.fetchJson(`https://open.er-api.com/v6/latest/${from}`, 12000);
        } catch (err: unknown) {
          throw new Error(`汇率服务暂不可用: ${err instanceof Error ? err.message : String(err)}`);
        }
        const rates = data?.rates ?? {};
        const rate = rates[to];
        if (!rate) throw new Error(`暂不支持货币 ${to}`);
        return {
          from,
          to,
          amount,
          rate: Number(rate),
          result: Number((amount * rate).toFixed(2)),
          updatedAt: data.time_last_update_utc ?? '',
        };
      }
      case 'base64-codec': {
        const action = String(args.action ?? 'encode');
        const input = String(args.input ?? '');
        if (!input) throw new Error('请输入 encode/decode 与内容');
        const before = Buffer.byteLength(input, 'utf8');
        if (action === 'decode') {
          const cleaned = input.replace(/\s+/g, '');
          const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
          return { action: 'decode', input: cleaned, size: `${before}B`, output: decoded };
        }
        const encoded = Buffer.from(input, 'utf8').toString('base64');
        return { action: 'encode', input, size: `${before}B`, output: encoded };
      }
      case 'uuid-gen': {
        const count = Math.min(Math.max(Number(args.count ?? 1) || 1, 1), 50);
        const cryptoNode = await import('crypto');
        const items: string[] = [];
        for (let i = 0; i < count; i++) items.push(cryptoNode.randomUUID());
        return { count: items.length, uuids: items };
      }
      case 'json-tool': {
        const action = String(args.action ?? 'format');
        const input = String(args.input ?? '');
        if (!input.trim()) throw new Error('请输入 JSON 内容');
        const parsed = JSON.parse(input);
        if (action === 'minify') {
          return { action, output: JSON.stringify(parsed) };
        }
        if (action === 'validate') {
          return { action, valid: true, rootType: Array.isArray(parsed) ? 'array' : typeof parsed };
        }
        return { action, output: JSON.stringify(parsed, null, 2) };
      }
      case 'timestamp': {
        const action = String(args.action ?? 'now');
        const input = String(args.input ?? '').trim();
        const offsetHours = Number(args.offsetHours ?? 0);
        if (action === 'from-date' && input) {
          const parsed = new Date(input);
          if (isNaN(parsed.getTime())) throw new Error('无法解析日期，请用 ISO 格式如 2026-08-08T12:00:00');
          return { action: 'to_unix', input, unix: Math.floor(parsed.getTime() / 1000) };
        }
        const now = new Date();
        if (action === 'date' && input) {
          const ts = Number(input) * 1000;
          if (!Number.isFinite(ts)) throw new Error('时间戳格式无效');
          const d = new Date(ts);
          if (offsetHours) {
            d.setUTCHours(d.getUTCHours() + offsetHours);
          }
          return {
            action: 'to_date',
            timestamp: input,
            iso: d.toISOString(),
            local: d.toLocaleString('zh-CN', { timeZone: 'UTC' }) + (offsetHours ? ` (UTC+${offsetHours})` : ''),
          };
        }
        const sec = Math.floor(now.getTime() / 1000);
        return { action: 'now', unix: sec, iso: now.toISOString(), local: now.toLocaleString('zh-CN') };
      }
      case 'text-stats': {
        const text = String(args.text ?? '');
        if (!text) throw new Error('请输入文本');
        const noSpace = text.replace(/\s/g, '');
        const letters = text.replace(/[^\p{L}\p{N}]/gu, '');
        const lines = text.split(/\r?\n/);
        const words = new Set(text.match(/[\p{L}\p{N}]+/gu) ?? []);
        return {
          chars: text.length,
          charsNoSpace: noSpace.length,
          lettersDigits: letters.length,
          lines: lines.length,
          linesNonEmpty: lines.filter((l) => l.trim().length > 0).length,
          uniqueWords: words.size,
          words: text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0,
        };
      }
      case 'web-search': {
        // 渐进式: 先尝试 DuckDuckGo 简易后端查询，失败了也返回可读提示
        const query = String(args.query ?? '').trim();
        const maxResults = Math.min(Math.max(Number(args.maxResults ?? 5) || 5, 1), 10);
        if (!query) throw new Error('请输入搜索关键词');
        throw new Error('网页搜索暂不可用，稍后再试');
      }
      case 'computer-use': {
        return {
          hint: '该工具在客户端本地执行（电脑控制/截图/鼠标键盘）',
          clientExecuted: true,
        };
      }
      default:
        throw new BadRequestException(`Unknown tool: ${toolName}`);
    }
  }

  // ---- helpers ----

  private async verifyConversation(userId: string, conversationId: string) {
    const rows = await this.db
      .select()
      .from(conversation)
      .where(eq(conversation.id, conversationId));
    if (!rows[0]) throw new NotFoundException('Conversation not found');
    if (rows[0].userId !== userId) throw new NotFoundException('Conversation not found');
    return rows[0];
  }

  private safeCalculate(expression: string): number {
    const trimmed = expression.trim();
    if (!trimmed) throw new BadRequestException('Expression is empty');
    if (!/^[\d+\-*/().\s]+$/.test(trimmed)) {
      throw new BadRequestException('Invalid expression');
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${trimmed});`);
    const result = Number(fn());
    if (!Number.isFinite(result)) throw new BadRequestException('Result is not finite');
    return result;
  }

  private extractExpression(msg: string): string {
    const matches = msg.match(/计算\s*[:：]?\s*([\d+\-*/().\s]+)/) || msg.match(/calc\s*[:：]?\s*([\d+\-*/().\s]+)/i);
    if (matches && matches[1]) return matches[1].trim();
    const fallback = msg.match(/[\d+\-*/().\s]{3,}/);
    return fallback ? fallback[0].trim() : '0';
  }

  private parseJson(raw: string): any {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* ignore */ }
    }
    try { return JSON.parse(raw); } catch { return null; }
  }

  private normalizeNode(node: any): MindMapNode {
    return {
      id: `n_${Math.random().toString(36).slice(2, 9)}`,
      label: String(node?.label ?? node?.name ?? '节点'),
      children: Array.isArray(node?.children)
        ? node.children.map((c: any) => this.normalizeNode(c)).slice(0, 8)
        : [],
    };
  }
}