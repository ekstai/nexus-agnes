import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { decode } from 'js-base64';
import { modelConfig } from '@server/database/schema';
import type { LlmMessage, LlmCompletionOptions, LlmResult } from './llm.types';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * Load a model config row for the user (prefer the given id, else default).
   */
  async loadConfig(userId: string, modelConfigId?: string) {
    if (modelConfigId) {
      const rows = await this.db
        .select()
        .from(modelConfig)
        .where(eq(modelConfig.id, modelConfigId));
      if (rows.length > 0 && rows[0].userId === userId) {
        return rows[0];
      }
    }
    const rows = await this.db
      .select()
      .from(modelConfig)
      .where(eq(modelConfig.userId, userId));
    const sorted = rows.slice().sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    return sorted[0] ?? null;
  }

  toApiOptions(row: typeof modelConfig.$inferSelect): LlmCompletionOptions {
    return {
      apiUrl: row.apiUrl,
      apiKey: decode(row.apiKey ?? ''),
      modelName: row.modelName,
      apiFormat: (row.apiFormat ?? 'openai') as LlmCompletionOptions['apiFormat'],
      maxTokens: row.maxTokens ?? 4096,
      systemPrompt: row.systemPrompt ?? undefined,
    };
  }

  async chat(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmResult> {
    const raw = await this.chatRaw(messages, options);
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    const promptTokens = Math.max(1, Math.round(totalChars / 2));
    const completionTokens = Math.max(1, Math.round(raw.length / 2));
    return {
      content: raw,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  async chatRaw(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<string> {
    const base = options.apiUrl.replace(/\/+$/, '');
    const timeoutMs = options.timeoutMs ?? 120000;
    const temperature = 1 - (options.temperature ?? 0.7) * 0.5;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (options.apiFormat === 'anthropic') {
        return await this.callAnthropic(base, messages, options, controller.signal);
      }
      if (options.apiFormat === 'ollama') {
        return await this.callOllama(base, messages, options, controller.signal);
      }
      return await this.callOpenAi(base, messages, options, temperature, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  private async callOpenAi(
    base: string,
    messages: LlmMessage[],
    options: LlmCompletionOptions,
    temperature: number,
    signal: AbortSignal,
  ): Promise<string> {
    const url = base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
    const body: Record<string, unknown> = {
      model: options.modelName,
      messages,
      temperature,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: options.apiKey ? `Bearer ${options.apiKey}` : '',
      },
      body: JSON.stringify(body),
      signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `模型请求失败 (HTTP ${res.status}): ${text.slice(0, 300)}`,
      );
    }
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new BadRequestException('模型返回无法解析的响应');
    }
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      this.logger.warn(`OpenAI response missing content: ${text.slice(0, 300)}`);
      throw new BadRequestException('模型返回异常（缺少内容）');
    }
    return content;
  }

  private async callAnthropic(
    base: string,
    messages: LlmMessage[],
    options: LlmCompletionOptions,
    signal: AbortSignal,
  ): Promise<string> {
    const url = base.endsWith('/messages')
      ? base
      : base.endsWith('/v1')
        ? `${base}/messages`
        : `${base}/v1/messages`;
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const body: Record<string, unknown> = {
      model: options.modelName,
      system: system || undefined,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      max_tokens: options.maxTokens ?? 4096,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `Anthropic 请求失败 (HTTP ${res.status}): ${text.slice(0, 300)}`,
      );
    }
    const json = JSON.parse(text);
    const content = json?.content
      ?.filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('\n');
    if (typeof content !== 'string') {
      throw new BadRequestException('Anthropic 返回格式异常');
    }
    return content;
  }

  private async callOllama(
    base: string,
    messages: LlmMessage[],
    options: LlmCompletionOptions,
    signal: AbortSignal,
  ): Promise<string> {
    const url = base.endsWith('/api/chat') ? base : `${base}/api/chat`;
    const body: Record<string, unknown> = {
      model: options.modelName,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
      options: { temperature: 1 - (options.temperature ?? 0.7) * 0.5 },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(
        `Ollama 请求失败 (HTTP ${res.status}): ${text.slice(0, 300)}`,
      );
    }
    const json = JSON.parse(text);
    const content = json?.message?.content;
    if (typeof content !== 'string') {
      throw new BadRequestException('Ollama 返回格式异常');
    }
    return content;
  }
}