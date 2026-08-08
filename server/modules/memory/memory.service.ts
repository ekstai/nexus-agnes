import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc } from 'drizzle-orm';
import { memory } from '@server/database/schema';
import type {
  MemoryDto,
  MemoryListResponse,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryFlashbackResponse,
  MemoryFlashback,
} from '@shared/api.interface';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private toDto(row: typeof memory.$inferSelect): MemoryDto {
    return {
      id: row.id,
      content: row.content,
      category: row.category as MemoryDto['category'],
      starred: row.starred,
      sourceConversationId: row.sourceConversationId ?? undefined,
      sourceMessageId: row.sourceMessageId ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(userId: string, category?: string): Promise<MemoryListResponse> {
    const rows = await this.db
      .select()
      .from(memory)
      .where(category ? and(eq(memory.userId, userId), eq(memory.category, category)) : eq(memory.userId, userId))
      .orderBy(desc(memory.starred), desc(memory.createdAt));
    return {
      items: rows.map((r) => this.toDto(r)),
      total: rows.length,
    };
  }

  async create(userId: string, dto: CreateMemoryRequest): Promise<MemoryDto> {
    const [row] = await this.db
      .insert(memory)
      .values({
        userId,
        content: dto.content,
        category: dto.category ?? 'life',
        starred: dto.starred ?? true,
        sourceConversationId: dto.sourceConversationId,
        sourceMessageId: dto.sourceMessageId,
      })
      .returning();
    return this.toDto(row);
  }

  async update(userId: string, id: string, dto: UpdateMemoryRequest): Promise<MemoryDto> {
    const rows = await this.db
      .select()
      .from(memory)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('Memory not found');
    }
    const data: Record<string, unknown> = {};
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.starred !== undefined) data.starred = dto.starred;
    const [updated] = await this.db
      .update(memory)
      .set(data)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .returning();
    return this.toDto(updated);
  }

  async toggleStar(userId: string, id: string): Promise<MemoryDto> {
    const rows = await this.db
      .select()
      .from(memory)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('Memory not found');
    }
    const [updated] = await this.db
      .update(memory)
      .set({ starred: !rows[0].starred })
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .returning();
    return this.toDto(updated);
  }

  async delete(userId: string, id: string): Promise<{ success: boolean }> {
    const res = await this.db
      .delete(memory)
      .where(and(eq(memory.id, id), eq(memory.userId, userId)))
      .returning({ id: memory.id });
    if (res.length === 0) {
      throw new NotFoundException('Memory not found');
    }
    return { success: true };
  }

  /**
   * Flashback: find similar past memories matching the current query.
   * Simple keyword-overlap scoring.
   */
  async flashback(userId: string, query: string): Promise<MemoryFlashbackResponse> {
    const rows = await this.db
      .select()
      .from(memory)
      .where(eq(memory.userId, userId))
      .orderBy(desc(memory.createdAt))
      .limit(500);

    const qTokens = this.tokenize(query);
    const now = Date.now();
    const scored = rows
      .map((row) => ({
        row,
        score: this.overlapScore(qTokens, this.tokenize(row.content)),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      items: scored.map(({ row }) => ({
        id: row.id,
        content: row.content.slice(0, 160),
        category: row.category as MemoryDto['category'],
        createdAt: row.createdAt.toISOString(),
        agoText: this.agoText(now, row.createdAt.getTime()),
      })),
    };
  }

  private tokenize(text: string): string[] {
    const lower = text.toLowerCase();
    const cn = lower.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const en = lower.match(/[a-z0-9]{3,}/g) || [];
    return [...cn, ...en];
  }

  private overlapScore(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setB = new Set(b);
    const hit = a.filter((t) => setB.has(t)).length;
    return hit / Math.sqrt(a.length * b.length);
  }

  private agoText(nowMs: number, tsMs: number): string {
    const diff = nowMs - tsMs;
    if (diff < 0) return '刚刚';
    const min = Math.floor(diff / 60000);
    const hour = Math.floor(min / 60);
    const day = Math.floor(hour / 24);
    const week = Math.floor(day / 7);
    const month = Math.floor(day / 30);
    if (month >= 1) return `${month}个月前`;
    if (week >= 1) return `${week}周前`;
    if (day >= 1) return `${day}天前`;
    if (hour >= 1) return `${hour}小时前`;
    return `${Math.max(1, min)}分钟前`;
  }
}