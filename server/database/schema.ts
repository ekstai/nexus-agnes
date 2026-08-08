/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, integer, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const userPreference = pgTable("user_preference", {
  id: uuid("id").primaryKey().defaultRandom(),
  theme: varchar("theme", { length: 50 }).notNull().default('liquid-glass'),
  nickname: varchar("nickname", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  fontSize: varchar("font_size", { length: 20 }).notNull().default('medium'),
  bubbleStyle: varchar("bubble_style", { length: 20 }).notNull().default('rounded'),
  aiName: varchar("ai_name", { length: 255 }).notNull().default('AI'),
  aiAvatar: varchar("ai_avatar", { length: 500 }),
  showMessageTime: boolean("show_message_time").notNull().default(false),
  showTokenUsage: boolean("show_token_usage").notNull().default(false),
  background: varchar("background", { length: 1000 }),
  featureFlags: jsonb("feature_flags").notNull().default(sql`'{}'::jsonb`),
  workspaceDir: varchar("workspace_dir", { length: 1000 }),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("user_preference_user_id_key").on(table.userId),
]);

export const memory = pgTable("memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull().default('life'),
  starred: boolean("starred").notNull().default(true),
  sourceConversationId: uuid("source_conversation_id"),
  sourceMessageId: uuid("source_message_id"),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_memory_user").on(table.userId),
  index("idx_memory_category").on(table.userId, table.category),
]);

export const plugin = pgTable("plugin", {
  id: uuid("id").primaryKey().defaultRandom(),
  pluginKey: varchar("plugin_key", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }),
  author: varchar("author", { length: 255 }),
  category: varchar("category", { length: 50 }),
  icon: varchar("icon", { length: 255 }),
  installed: boolean("installed").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  configSchema: jsonb("config_schema"),
  configValues: jsonb("config_values"),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const modelConfig = pgTable("model_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  apiUrl: varchar("api_url", { length: 500 }).notNull(),
  apiKey: varchar("api_key", { length: 500 }).notNull(),
  modelName: varchar("model_name", { length: 255 }).notNull(),
  modelType: varchar("model_type", { length: 20 }).notNull().default('remote'),
  apiFormat: varchar("api_format", { length: 20 }).notNull().default('openai'),
  maxTokens: integer("max_tokens").notNull().default(4096),
  systemPrompt: text("system_prompt"),
  isDefault: boolean("is_default").notNull().default(false),
  thinkingLevel: integer("thinking_level").notNull().default(50),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const message = pgTable("message", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  toolCallId: varchar("tool_call_id", { length: 255 }),
  toolName: varchar("tool_name", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default('success'),
  orderIndex: integer("order_index").notNull().default(0),
  tokenUsage: jsonb("token_usage"),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_message_conversation_id").on(table.conversationId),
  foreignKey({
    columns: [table.conversationId],
    foreignColumns: [conversation.id],
    name: "message_conversation_id_fkey",
  }).onDelete("cascade"),
]);

export const conversation = pgTable("conversation", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull().default('新对话'),
  modelConfigId: uuid("model_config_id"),
  userId: varchar("user_id", { length: 255 }).notNull(),
  lastMessageAt: customTimestamptz("last_message_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: customTimestamptz("created_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: customTimestamptz("updated_at", { precision: 6 }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// table aliases
export const conversationTable = conversation;
export const messageTable = message;
export const modelConfigTable = modelConfig;
export const pluginTable = plugin;
export const userPreferenceTable = userPreference;
export const memoryTable = memory;
