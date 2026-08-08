import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { conversation, message } from '@server/database/schema';
import type {
  ConversationDto,
  ConversationDetailDto,
  ConversationListResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
  MessageDto,
} from '@shared/api.interface';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async list(userId: string): Promise<ConversationListResponse> {
    const rows = await this.db
      .select()
      .from(conversation)
      .where(eq(conversation.userId, userId))
      .orderBy(desc(conversation.lastMessageAt));

    const totalResult = await this.db
      .select({ count: count() })
      .from(conversation)
      .where(eq(conversation.userId, userId));
    const total: number = Number(totalResult[0]?.count ?? 0);

    const items: ConversationDto[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      modelConfigId: row.modelConfigId ?? undefined,
      lastMessageAt: row.lastMessageAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total };
  }

  async create(userId: string, dto: CreateConversationRequest): Promise<ConversationDto> {
    const now = new Date();
    const rows = await this.db
      .insert(conversation)
      .values({
        title: dto.title ?? '新对话',
        modelConfigId: dto.modelConfigId,
        userId,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to create conversation');
    }

    this.logger.log(`Created conversation ${row.id} for user ${userId}`);

    return {
      id: row.id,
      title: row.title,
      modelConfigId: row.modelConfigId ?? undefined,
      lastMessageAt: row.lastMessageAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getDetail(userId: string, id: string): Promise<ConversationDetailDto> {
    const convRows = await this.db
      .select()
      .from(conversation)
      .where(and(eq(conversation.id, id), eq(conversation.userId, userId)));

    const convRow = convRows[0];
    if (!convRow) {
      throw new NotFoundException('Conversation not found');
    }

    const msgRows = await this.db
      .select()
      .from(message)
      .where(eq(message.conversationId, id))
      .orderBy(asc(message.orderIndex));

    const messages: MessageDto[] = msgRows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as MessageDto['role'],
      content: row.content,
      toolCalls: (row.toolCalls as MessageDto['toolCalls']) ?? undefined,
      toolCallId: row.toolCallId ?? undefined,
      toolName: row.toolName ?? undefined,
      status: row.status as MessageDto['status'],
      orderIndex: row.orderIndex,
      createdAt: row.createdAt.toISOString(),
      tokenUsage: (row.tokenUsage as MessageDto['tokenUsage']) ?? undefined,
    }));

    return {
      id: convRow.id,
      title: convRow.title,
      modelConfigId: convRow.modelConfigId ?? undefined,
      lastMessageAt: convRow.lastMessageAt.toISOString(),
      createdAt: convRow.createdAt.toISOString(),
      messages,
    };
  }

  async update(userId: string, id: string, dto: UpdateConversationRequest): Promise<ConversationDto> {
    const existing = await this.db
      .select()
      .from(conversation)
      .where(and(eq(conversation.id, id), eq(conversation.userId, userId)));

    if (!existing[0]) {
      throw new NotFoundException('Conversation not found');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.modelConfigId !== undefined) updateData.modelConfigId = dto.modelConfigId;

    const rows = await this.db
      .update(conversation)
      .set(updateData)
      .where(and(eq(conversation.id, id), eq(conversation.userId, userId)))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new Error('Failed to update conversation');
    }

    return {
      id: row.id,
      title: row.title,
      modelConfigId: row.modelConfigId ?? undefined,
      lastMessageAt: row.lastMessageAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async delete(userId: string, id: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(conversation)
      .where(and(eq(conversation.id, id), eq(conversation.userId, userId)));

    if (!existing[0]) {
      throw new NotFoundException('Conversation not found');
    }

    // Cascade delete handled by FK, but explicitly delete messages first for clarity
    await this.db.delete(message).where(eq(message.conversationId, id));
    await this.db
      .delete(conversation)
      .where(and(eq(conversation.id, id), eq(conversation.userId, userId)));

    this.logger.log(`Deleted conversation ${id} for user ${userId}`);
  }

  /**
   * Update lastMessageAt timestamp (used by chat service).
   * Internal method, no auth check — caller is responsible.
   */
  async touchLastMessageAt(conversationId: string): Promise<void> {
    await this.db
      .update(conversation)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversation.id, conversationId));
  }
}
