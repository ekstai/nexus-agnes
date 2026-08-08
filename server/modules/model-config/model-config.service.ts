import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc } from 'drizzle-orm';
import { encode, decode } from 'js-base64';
import type {
  ModelConfigDto,
  ModelConfigListResponse,
  CreateModelConfigRequest,
  UpdateModelConfigRequest,
  ModelTestResponse,
  FetchModelsRequest,
  FetchModelsResponse,
  FetchModelsItem,
  ModelType,
} from '@shared/api.interface';
import { modelConfig } from '@server/database/schema';

@Injectable()
export class ModelConfigService {
  private readonly logger = new Logger(ModelConfigService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private toDto(row: typeof modelConfig.$inferSelect): ModelConfigDto {
    return {
      id: row.id,
      name: row.name,
      apiUrl: row.apiUrl,
      modelName: row.modelName,
      modelType: row.modelType as ModelType,
      apiFormat: (row.apiFormat ?? 'openai') as ModelConfigDto['apiFormat'],
      maxTokens: row.maxTokens ?? 4096,
      hasSystemPrompt: !!row.systemPrompt,
      isDefault: row.isDefault,
      thinkingLevel: row.thinkingLevel ?? 50,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async clearOtherDefaults(userId: string): Promise<void> {
    await this.db
      .update(modelConfig)
      .set({ isDefault: false })
      .where(eq(modelConfig.userId, userId));
  }

  async list(userId: string): Promise<ModelConfigListResponse> {
    const rows: (typeof modelConfig.$inferSelect)[] = await this.db
      .select()
      .from(modelConfig)
      .where(eq(modelConfig.userId, userId))
      .orderBy(desc(modelConfig.isDefault), desc(modelConfig.createdAt));

    const items: ModelConfigDto[] = rows.map((row: typeof modelConfig.$inferSelect) => this.toDto(row));
    return { items };
  }

  async create(userId: string, dto: CreateModelConfigRequest): Promise<ModelConfigDto> {
    const encodedKey: string = encode(dto.apiKey);

    // If setting as default, clear others first
    if (dto.isDefault) {
      await this.clearOtherDefaults(userId);
    }

    const [row]: (typeof modelConfig.$inferSelect)[] = await this.db
      .insert(modelConfig)
      .values({
        name: dto.name,
        apiUrl: dto.apiUrl,
        apiKey: encodedKey,
        modelName: dto.modelName,
        modelType: dto.modelType,
        apiFormat: dto.apiFormat ?? 'openai',
        maxTokens: dto.maxTokens ?? 4096,
        systemPrompt: dto.systemPrompt ?? null,
        thinkingLevel: dto.thinkingLevel ?? 50,
        isDefault: dto.isDefault ?? false,
        userId,
      })
      .returning();

    return this.toDto(row);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateModelConfigRequest,
  ): Promise<ModelConfigDto> {
    const existing: (typeof modelConfig.$inferSelect)[] = await this.db
      .select()
      .from(modelConfig)
      .where(and(eq(modelConfig.id, id), eq(modelConfig.userId, userId)));

    if (existing.length === 0) {
      throw new NotFoundException('Model config not found');
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.apiUrl !== undefined) updatePayload.apiUrl = dto.apiUrl;
    if (dto.modelName !== undefined) updatePayload.modelName = dto.modelName;
    if (dto.modelType !== undefined) updatePayload.modelType = dto.modelType;
    if (dto.thinkingLevel !== undefined) updatePayload.thinkingLevel = dto.thinkingLevel;
    if (dto.apiFormat !== undefined) updatePayload.apiFormat = dto.apiFormat;
    if (dto.maxTokens !== undefined) updatePayload.maxTokens = dto.maxTokens;
    if (dto.systemPrompt !== undefined) updatePayload.systemPrompt = dto.systemPrompt;

    // apiKey: only update if non-empty string
    if (dto.apiKey !== undefined && dto.apiKey !== '') {
      updatePayload.apiKey = encode(dto.apiKey);
    }

    // Handle isDefault change
    let needsDefaultClear = false;
    if (dto.isDefault !== undefined && dto.isDefault !== existing[0].isDefault) {
      if (dto.isDefault) {
        needsDefaultClear = true;
      }
      updatePayload.isDefault = dto.isDefault;
    }

    if (needsDefaultClear) {
      await this.clearOtherDefaults(userId);
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.toDto(existing[0]);
    }

    const [updated]: (typeof modelConfig.$inferSelect)[] = await this.db
      .update(modelConfig)
      .set(updatePayload)
      .where(and(eq(modelConfig.id, id), eq(modelConfig.userId, userId)))
      .returning();

    return this.toDto(updated);
  }

  async delete(userId: string, id: string): Promise<{ success: boolean }> {
    const result: { id: string }[] = await this.db
      .delete(modelConfig)
      .where(and(eq(modelConfig.id, id), eq(modelConfig.userId, userId)))
      .returning({ id: modelConfig.id });

    if (result.length === 0) {
      throw new NotFoundException('Model config not found');
    }

    return { success: true };
  }

  /**
   * 通过 OpenAI 兼容的 /models 接口获取可用模型列表。
   */
  async fetchModels(dto: FetchModelsRequest): Promise<FetchModelsResponse> {
    const apiUrl: string = dto.apiUrl.replace(/\/+$/, '');
    const modelsUrl: string = apiUrl.endsWith('/v1')
      ? apiUrl + '/models'
      : apiUrl + '/v1/models';

    const controller: AbortController = new AbortController();
    const timeoutId: NodeJS.Timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response: Response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${dto.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText: string = await response.text();
        this.logger.warn(
          `Fetch models failed: ${response.status} ${errorText.slice(0, 200)}`,
        );
        throw new BadRequestException(
          `HTTP ${response.status}: ${errorText.slice(0, 200) || '获取模型列表失败'}`,
        );
      }

      const json: unknown = await response.json();
      const data: any = json as any;
      const rawList: unknown[] = Array.isArray(data?.data) ? data.data : [];
      const items: FetchModelsItem[] = rawList
        .filter((item: any) => item && typeof item.id === 'string')
        .map((item: any) => ({ id: item.id, name: item.name ?? item.id }));

      if (items.length > 0) {
        return { items };
      }

      // 兜底：极少数接口直接返回字符串数组
      if (Array.isArray(json) && (json as string[]).every((x) => typeof x === 'string')) {
        return { items: (json as string[]).map((id: string) => ({ id, name: id })) };
      }

      return { items };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Fetch models error: ${errorMessage}`);
      throw new BadRequestException(`获取模型列表失败：${errorMessage}`);
    }
  }

  async test(userId: string, id: string): Promise<ModelTestResponse> {
    const rows: (typeof modelConfig.$inferSelect)[] = await this.db
      .select()
      .from(modelConfig)
      .where(and(eq(modelConfig.id, id), eq(modelConfig.userId, userId)));

    if (rows.length === 0) {
      throw new NotFoundException('Model config not found');
    }

    const config: typeof modelConfig.$inferSelect = rows[0];
    const apiKey: string = decode(config.apiKey);
    const startTime: number = Date.now();

    try {
      // Try a simple GET to the base URL first (fast connectivity check)
      const controller: AbortController = new AbortController();
      const timeoutId: NodeJS.Timeout = setTimeout(() => controller.abort(), 10000);

      // Try /v1/models endpoint (common OpenAI-compatible endpoint)
      let testUrl: string = config.apiUrl.replace(/\/$/, '');
      if (!testUrl.includes('/v1')) {
        testUrl = testUrl + '/v1/models';
      } else {
        testUrl = testUrl + '/models';
      }

      const response: Response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency: number = Date.now() - startTime;

      if (!response.ok) {
        const errorText: string = await response.text();
        this.logger.warn(`Model config test failed: ${response.status} ${errorText.slice(0, 200)}`);
        return {
          success: false,
          latency,
          error: `HTTP ${response.status}: ${errorText.slice(0, 100) || response.statusText}`,
        };
      }

      return {
        success: true,
        latency,
      };
    } catch (error: unknown) {
      const latency: number = Date.now() - startTime;
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Model config test error: ${errorMessage}`);
      return {
        success: false,
        latency,
        error: errorMessage,
      };
    }
  }
}
