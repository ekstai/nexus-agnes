import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, count, inArray } from 'drizzle-orm';
import type {
  DataExportResponse,
  DataImportRequest,
  DataImportResponse,
  UserStatsResponse,
} from '@shared/api.interface';
import {
  conversation,
  message,
  modelConfig,
  plugin,
  userPreference,
} from '@server/database/schema';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async exportData(userId: string): Promise<DataExportResponse> {
    this.logger.log(`Exporting data for user: ${userId}`);

    const [conversations, messages, modelConfigs, plugins, preferences] =
      await Promise.all([
        this.db.select().from(conversation).where(eq(conversation.userId, userId)),
        this.db
          .select()
          .from(message)
          .innerJoin(conversation, eq(message.conversationId, conversation.id))
          .where(eq(conversation.userId, userId)),
        this.db.select().from(modelConfig).where(eq(modelConfig.userId, userId)),
        this.db.select().from(plugin).where(eq(plugin.userId, userId)),
        this.db
          .select()
          .from(userPreference)
          .where(eq(userPreference.userId, userId))
          .limit(1),
      ]);

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        conversations,
        messages: messages.map((m: { message: typeof message.$inferSelect }) => m.message),
        modelConfigs,
        plugins,
        preferences: preferences[0] ?? null,
      },
    };
  }

  async importData(
    userId: string,
    req: DataImportRequest,
  ): Promise<DataImportResponse> {
    this.logger.log(`Importing data for user: ${userId}, merge=${req.merge ?? true}`);

    const merge = req.merge !== false;
    const imported = {
      conversations: 0,
      messages: 0,
      modelConfigs: 0,
      plugins: 0,
    };

    // If not merge, clear existing data first (preserve preferences)
    if (!merge) {
      await this.clearUserData(userId);
    }

    // Import model configs
    if (req.data.modelConfigs && req.data.modelConfigs.length > 0) {
      const configs = req.data.modelConfigs.map((cfg: any) => ({
        name: cfg.name,
        apiUrl: cfg.apiUrl,
        apiKey: cfg.apiKey,
        modelName: cfg.modelName,
        modelType: cfg.modelType ?? 'remote',
        isDefault: cfg.isDefault ?? false,
        userId,
      }));
      const result = await this.db.insert(modelConfig).values(configs).returning();
      imported.modelConfigs = result.length;

      // Build oldId -> newId map for conversation references
      const idMap = new Map<string, string>();
      req.data.modelConfigs.forEach((cfg: any, idx: number) => {
        if (cfg.id && result[idx]) idMap.set(cfg.id, result[idx].id);
      });

      // Import conversations
      if (req.data.conversations && req.data.conversations.length > 0) {
        const convs = req.data.conversations.map((c: any) => ({
          title: c.title ?? '新对话',
          modelConfigId: c.modelConfigId ? idMap.get(c.modelConfigId) ?? null : null,
          userId,
          lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(),
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        }));
        const convResult = await this.db
          .insert(conversation)
          .values(convs)
          .returning();
        imported.conversations = convResult.length;

        // Build conversation id map
        const convIdMap = new Map<string, string>();
        req.data.conversations.forEach((c: any, idx: number) => {
          if (c.id && convResult[idx]) convIdMap.set(c.id, convResult[idx].id);
        });

        // Import messages
        if (req.data.messages && req.data.messages.length > 0) {
          const msgs = req.data.messages
            .filter((m: any) => convIdMap.has(m.conversationId))
            .map((m: any) => ({
              conversationId: convIdMap.get(m.conversationId)!,
              role: m.role,
              content: m.content,
              toolCalls: m.toolCalls ?? null,
              toolCallId: m.toolCallId ?? null,
              toolName: m.toolName ?? null,
              status: m.status ?? 'success',
              orderIndex: m.orderIndex ?? 0,
              createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
            }));
          if (msgs.length > 0) {
            const msgResult = await this.db.insert(message).values(msgs).returning();
            imported.messages = msgResult.length;
          }
        }
      }
    } else if (req.data.conversations && req.data.conversations.length > 0) {
      // No model configs but have conversations
      const convs = req.data.conversations.map((c: any) => ({
        title: c.title ?? '新对话',
        modelConfigId: c.modelConfigId ?? null,
        userId,
        lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(),
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      }));
      const convResult = await this.db
        .insert(conversation)
        .values(convs)
        .returning();
      imported.conversations = convResult.length;

      const convIdMap = new Map<string, string>();
      req.data.conversations.forEach((c: any, idx: number) => {
        if (c.id && convResult[idx]) convIdMap.set(c.id, convResult[idx].id);
      });

      if (req.data.messages && req.data.messages.length > 0) {
        const msgs = req.data.messages
          .filter((m: any) => convIdMap.has(m.conversationId))
          .map((m: any) => ({
            conversationId: convIdMap.get(m.conversationId)!,
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls ?? null,
            toolCallId: m.toolCallId ?? null,
            toolName: m.toolName ?? null,
            status: m.status ?? 'success',
            orderIndex: m.orderIndex ?? 0,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          }));
        if (msgs.length > 0) {
          const msgResult = await this.db.insert(message).values(msgs).returning();
          imported.messages = msgResult.length;
        }
      }
    }

    // Import plugins
    if (req.data.plugins && req.data.plugins.length > 0) {
      const pls = req.data.plugins.map((p: any) => ({
        pluginKey: p.pluginKey,
        name: p.name,
        description: p.description ?? null,
        version: p.version ?? null,
        author: p.author ?? null,
        category: p.category ?? null,
        icon: p.icon ?? null,
        installed: p.installed ?? false,
        enabled: p.enabled ?? true,
        configSchema: p.configSchema ?? null,
        configValues: p.configValues ?? null,
        userId,
      }));
      const plResult = await this.db.insert(plugin).values(pls).returning();
      imported.plugins = plResult.length;
    }

    // Import preferences (always merge mode: only update if provided
    if (req.data.preferences) {
      const pref = req.data.preferences;
      const existing = await this.db
        .select()
        .from(userPreference)
        .where(eq(userPreference.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await this.db
          .update(userPreference)
          .set({
            theme: pref.theme ?? existing[0].theme,
            nickname: pref.nickname ?? existing[0].nickname,
            avatarUrl: pref.avatarUrl ?? existing[0].avatarUrl,
            fontSize: pref.fontSize ?? existing[0].fontSize,
            bubbleStyle: pref.bubbleStyle ?? existing[0].bubbleStyle,
            updatedAt: new Date(),
          })
          .where(eq(userPreference.userId, userId));
      } else {
        await this.db.insert(userPreference).values({
          theme: pref.theme ?? 'liquid-glass',
          nickname: pref.nickname ?? null,
          avatarUrl: pref.avatarUrl ?? null,
          fontSize: pref.fontSize ?? 'medium',
          bubbleStyle: pref.bubbleStyle ?? 'rounded',
          userId,
        });
      }
    }

    return { success: true, imported };
  }

  async clearData(userId: string): Promise<{ success: boolean }> {
    this.logger.log(`Clearing all data for user: ${userId}`);
    await this.clearUserData(userId);
    return { success: true };
  }

  private async clearUserData(userId: string): Promise<void> {
    // Delete messages first (FK depends on conversations)
    const convs = await this.db
      .select({ id: conversation.id })
      .from(conversation)
      .where(eq(conversation.userId, userId));
    const convIds: string[] = convs.map((c: { id: string }) => c.id);

    if (convIds.length > 0) {
      await this.db
        .delete(message)
        .where(inArray(message.conversationId, convIds));
    }

    await this.db.delete(conversation).where(eq(conversation.userId, userId));
    await this.db.delete(modelConfig).where(eq(modelConfig.userId, userId));
    await this.db.delete(plugin).where(eq(plugin.userId, userId));
    // userPreference is preserved
  }

  async getStats(userId: string): Promise<UserStatsResponse> {
    const [convResult, msgResult, pluginResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(conversation)
        .where(eq(conversation.userId, userId)),
      this.db
        .select({ count: count() })
        .from(message)
        .innerJoin(conversation, eq(message.conversationId, conversation.id))
        .where(eq(conversation.userId, userId)),
      this.db
        .select({ count: count() })
        .from(plugin)
        .where(eq(plugin.userId, userId)),
    ]);

    const conversationCount = Number(convResult[0]?.count ?? 0);
    const messageCount = Number(msgResult[0]?.count ?? 0);
    const pluginCount = Number(pluginResult[0]?.count ?? 0);

    // Rough storage estimate: avg 200 bytes per message + 500 per conv + 1KB per plugin
    const bytes =
      messageCount * 200 + conversationCount * 500 + pluginCount * 1024;
    const storageUsed = this.formatBytes(bytes);

    return {
      conversationCount,
      messageCount,
      pluginCount,
      storageUsed,
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
