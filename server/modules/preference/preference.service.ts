import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { userPreference } from '@server/database/schema';
import { eq } from 'drizzle-orm';
import type {
  UserPreferenceDto,
  UpdatePreferenceRequest,
  FeatureFlags,
  ThemeType,
  FontSize,
  BubbleStyle,
} from '@shared/api.interface';
import { DEFAULT_FEATURE_FLAGS } from '@shared/api.interface';

const DEFAULT_THEME: ThemeType = 'liquid-glass';
const DEFAULT_FONT_SIZE: FontSize = 'medium';
const DEFAULT_BUBBLE_STYLE: BubbleStyle = 'rounded';
const DEFAULT_NICKNAME = '用户';
const DEFAULT_AI_NAME = 'Nexus Agnes';

@Injectable()
export class PreferenceService {
  private readonly logger = new Logger(PreferenceService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private toDto(record: typeof userPreference.$inferSelect): UserPreferenceDto {
    return {
      theme: record.theme as ThemeType,
      nickname: record.nickname ?? DEFAULT_NICKNAME,
      avatarUrl: record.avatarUrl ?? undefined,
      fontSize: record.fontSize as FontSize,
      bubbleStyle: record.bubbleStyle as BubbleStyle,
      aiName: record.aiName ?? DEFAULT_AI_NAME,
      aiAvatar: record.aiAvatar ?? undefined,
      showMessageTime: record.showMessageTime ?? false,
      showTokenUsage: record.showTokenUsage ?? false,
      background: record.background ?? undefined,
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...((record.featureFlags as Partial<FeatureFlags>) ?? {}) },
      workspaceDir: record.workspaceDir ?? undefined,
    };
  }

  async get(userId: string): Promise<UserPreferenceDto> {
    const records = await this.db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, userId))
      .limit(1);

    if (records.length > 0) {
      return this.toDto(records[0]);
    }

    // Create default record
    const inserted = await this.db
      .insert(userPreference)
      .values({
        userId,
        theme: DEFAULT_THEME,
        nickname: DEFAULT_NICKNAME,
        fontSize: DEFAULT_FONT_SIZE,
        bubbleStyle: DEFAULT_BUBBLE_STYLE,
        aiName: DEFAULT_AI_NAME,
      })
      .returning();

    this.logger.log(`为用户 ${userId} 创建默认偏好记录`);

    return this.toDto(inserted[0]);
  }

  async update(
    userId: string,
    dto: UpdatePreferenceRequest,
  ): Promise<UserPreferenceDto> {
    const updateData: Record<string, unknown> = {};
    if (dto.theme !== undefined) updateData.theme = dto.theme;
    if (dto.nickname !== undefined) updateData.nickname = dto.nickname;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.fontSize !== undefined) updateData.fontSize = dto.fontSize;
    if (dto.bubbleStyle !== undefined) updateData.bubbleStyle = dto.bubbleStyle;
    if (dto.aiName !== undefined) updateData.aiName = dto.aiName;
    if (dto.aiAvatar !== undefined) updateData.aiAvatar = dto.aiAvatar;
    if (dto.showMessageTime !== undefined) updateData.showMessageTime = dto.showMessageTime;
    if (dto.showTokenUsage !== undefined) updateData.showTokenUsage = dto.showTokenUsage;
    if (dto.background !== undefined) updateData.background = dto.background;
    if (dto.workspaceDir !== undefined) updateData.workspaceDir = dto.workspaceDir;
    if (dto.featureFlags !== undefined) {
      const existing = await this.get(userId);
      updateData.featureFlags = {
        ...existing.featureFlags,
        ...dto.featureFlags,
      };
    }

    if (Object.keys(updateData).length === 0) {
      return this.get(userId);
    }

    const result = await this.db
      .update(userPreference)
      .set(updateData)
      .where(eq(userPreference.userId, userId))
      .returning();

    if (result.length === 0) {
      // Record doesn't exist, create with defaults + provided values
      const inserted = await this.db
        .insert(userPreference)
        .values({
          userId,
          theme: (dto.theme ?? DEFAULT_THEME) as string,
          nickname: dto.nickname ?? DEFAULT_NICKNAME,
          avatarUrl: dto.avatarUrl,
          fontSize: (dto.fontSize ?? DEFAULT_FONT_SIZE) as string,
          bubbleStyle: (dto.bubbleStyle ?? DEFAULT_BUBBLE_STYLE) as string,
          aiName: dto.aiName ?? DEFAULT_AI_NAME,
          aiAvatar: dto.aiAvatar,
          showMessageTime: dto.showMessageTime ?? false,
          showTokenUsage: dto.showTokenUsage ?? false,
          background: dto.background,
          workspaceDir: dto.workspaceDir,
          featureFlags: dto.featureFlags ?? DEFAULT_FEATURE_FLAGS,
        })
        .returning();

      this.logger.log(`用户 ${userId} 偏好记录不存在，已创建并更新`);
      return this.toDto(inserted[0]);
    }

    this.logger.log(`用户 ${userId} 偏好已更新`);
    return this.toDto(result[0]);
  }
}
