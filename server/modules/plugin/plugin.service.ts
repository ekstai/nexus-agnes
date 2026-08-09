import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and } from 'drizzle-orm';
import { plugin } from '@server/database/schema';
import type {
  PluginDto,
  PluginMarketResponse,
  PluginCategory,
  PluginConfigResponse,
} from '@shared/api.interface';

interface BuiltinPluginMeta {
  pluginKey: string;
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;
  version: string;
  author: string;
  configSchema?: Record<string, any>;
  builtin?: boolean;
  platforms?: string[];
}

interface RemoteCatalog {
  version?: number;
  updatedAt?: string;
  plugins?: BuiltinPluginMeta[];
}

const REMOTE_CATALOG_URL =
  'https://raw.githubusercontent.com/ekstai/nexus-agnes/main/plugins/plugins.json';

let remoteCatalogCache: BuiltinPluginMeta[] | null = null;
let remoteCatalogCacheAt = 0;
const REMOTE_CATALOG_TTL_MS = 10 * 60 * 1000;

async function fetchRemoteCatalog(): Promise<BuiltinPluginMeta[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(REMOTE_CATALOG_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as RemoteCatalog;
    if (!data.plugins || !Array.isArray(data.plugins)) {
      return null;
    }
    return data.plugins.filter(
      (p: BuiltinPluginMeta) => p && typeof p.pluginKey === 'string',
    );
  } catch (err) {
    return null;
  }
}

async function getCatalog(): Promise<BuiltinPluginMeta[]> {
  const now = Date.now();
  if (remoteCatalogCache) {
    if (now - remoteCatalogCacheAt < REMOTE_CATALOG_TTL_MS) {
      return remoteCatalogCache;
    }
  }
  const remote = await fetchRemoteCatalog();
  if (remote && remote.length > 0) {
    remoteCatalogCache = remote;
    remoteCatalogCacheAt = now;
    return remote;
  }
  return BUILTIN_PLUGINS;
}

const BUILTIN_PLUGINS: BuiltinPluginMeta[] = [
  {
    pluginKey: 'computer-use',
    name: '电脑控制（Computer Use）',
    description:
      '像 Codex 的 computer use 一样直接操作电脑：截图观察屏幕、移动并点击鼠标、键盘输入、运行命令、打开文件与应用。',
    category: 'tool',
    icon: 'Monitor',
    version: '1.0.0',
    author: 'Agnes',
    builtin: true,
    platforms: ['desktop'],
  },
];

@Injectable()
export class PluginService {
  private readonly logger = new Logger(PluginService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getMarket(userId: string): Promise<PluginMarketResponse> {
    const catalog = await getCatalog();
    const installedRecords = await this.db
      .select()
      .from(plugin)
      .where(eq(plugin.userId, userId));

    const installedMap = new Map<string, typeof installedRecords[number]>();
    for (const record of installedRecords) {
      installedMap.set(record.pluginKey, record);
    }

    const items: PluginDto[] = catalog.map((meta: BuiltinPluginMeta) => {
      if (meta.builtin) {
        return {
          id: `builtin-${meta.pluginKey}`,
          pluginKey: meta.pluginKey,
          name: meta.name,
          description: meta.description,
          category: meta.category,
          icon: meta.icon,
          version: meta.version,
          author: meta.author,
          installed: true,
          enabled: true,
          installId: `builtin-${meta.pluginKey}`,
          builtin: true,
          platforms: meta.platforms ?? ['desktop'],
        };
      }
      const record = installedMap.get(meta.pluginKey);
      if (record && record.installed) {
        return {
          id: record.id,
          pluginKey: record.pluginKey,
          name: record.name,
          description: record.description ?? meta.description,
          category: record.category as PluginCategory,
          icon: record.icon ?? meta.icon,
          version: record.version ?? meta.version,
          author: record.author ?? meta.author,
          installed: true,
          enabled: record.enabled,
          installId: record.id,
        };
      }
      return {
        pluginKey: meta.pluginKey,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        icon: meta.icon,
        version: meta.version,
        author: meta.author,
        installed: false,
      };
    });

    return { items };
  }

  async install(userId: string, pluginKey: string): Promise<PluginDto> {
    const meta = (await getCatalog()).find((p) => p.pluginKey === pluginKey);
    if (!meta) {
      throw new NotFoundException(`插件 ${pluginKey} 不存在`);
    }

    // Check if already installed
    const existing = await this.db
      .select()
      .from(plugin)
      .where(
        and(
          eq(plugin.userId, userId),
          eq(plugin.pluginKey, pluginKey),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].installed) {
      const record = existing[0];
      return {
        id: record.id,
        pluginKey: record.pluginKey,
        name: record.name,
        description: record.description ?? '',
        category: record.category as PluginCategory,
        icon: record.icon ?? '',
        version: record.version ?? '',
        author: record.author ?? '',
        installed: true,
        enabled: record.enabled,
        installId: record.id,
      };
    }

    if (existing.length > 0) {
      // Re-enable
      const [updated] = await this.db
        .update(plugin)
        .set({ installed: true, enabled: true })
        .where(eq(plugin.id, existing[0].id))
        .returning();
      return {
        id: updated.id,
        pluginKey: updated.pluginKey,
        name: updated.name,
        description: updated.description ?? '',
        category: updated.category as PluginCategory,
        icon: updated.icon ?? '',
        version: updated.version ?? '',
        author: updated.author ?? '',
        installed: true,
        enabled: updated.enabled,
        installId: updated.id,
      };
    }

    const [inserted] = await this.db
      .insert(plugin)
      .values({
        pluginKey: meta.pluginKey,
        name: meta.name,
        description: meta.description,
        category: meta.category,
        icon: meta.icon,
        version: meta.version,
        author: meta.author,
        installed: true,
        enabled: true,
        configSchema: meta.configSchema ?? {},
        configValues: {},
        userId,
      })
      .returning();

    this.logger.log(`用户 ${userId} 安装插件 ${pluginKey}`);

    return {
      id: inserted.id,
      pluginKey: inserted.pluginKey,
      name: inserted.name,
      description: inserted.description ?? '',
      category: inserted.category as PluginCategory,
      icon: inserted.icon ?? '',
      version: inserted.version ?? '',
      author: inserted.author ?? '',
      installed: true,
      enabled: inserted.enabled,
      installId: inserted.id,
    };
  }

  async uninstall(userId: string, id: string): Promise<{ success: boolean }> {
    const result = await this.db
      .delete(plugin)
      .where(
        and(
          eq(plugin.id, id),
          eq(plugin.userId, userId),
        ),
      )
      .returning({ id: plugin.id });

    if (result.length === 0) {
      throw new NotFoundException('插件记录不存在');
    }

    this.logger.log(`用户 ${userId} 卸载插件 ${id}`);
    return { success: true };
  }

  async setEnabled(
    userId: string,
    id: string,
    enabled: boolean,
  ): Promise<PluginDto> {
    const result = await this.db
      .update(plugin)
      .set({ enabled })
      .where(
        and(
          eq(plugin.id, id),
          eq(plugin.userId, userId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('插件记录不存在');
    }

    const record = result[0];
    this.logger.log(
      `用户 ${userId} ${enabled ? '启用' : '禁用'}插件 ${id}`,
    );

    return {
      id: record.id,
      pluginKey: record.pluginKey,
      name: record.name,
      description: record.description ?? '',
      category: record.category as PluginCategory,
      icon: record.icon ?? '',
      version: record.version ?? '',
      author: record.author ?? '',
      installed: record.installed,
      enabled: record.enabled,
      installId: record.id,
    };
  }

  async getConfig(
    userId: string,
    id: string,
  ): Promise<PluginConfigResponse> {
    const records = await this.db
      .select()
      .from(plugin)
      .where(
        and(
          eq(plugin.id, id),
          eq(plugin.userId, userId),
        ),
      )
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundException('插件记录不存在');
    }

    const record = records[0];
    const meta = (await getCatalog()).find((p) => p.pluginKey === record.pluginKey);
    const configSchema = (record.configSchema as Record<string, any>) ?? meta?.configSchema ?? {};
    const configValues = (record.configValues as Record<string, any>) ?? {};

    return { configSchema, configValues };
  }

  async saveConfig(
    userId: string,
    id: string,
    configValues: Record<string, any>,
  ): Promise<{ success: boolean; configValues: Record<string, any> }> {
    const result = await this.db
      .update(plugin)
      .set({ configValues })
      .where(
        and(
          eq(plugin.id, id),
          eq(plugin.userId, userId),
        ),
      )
      .returning({ configValues: plugin.configValues });

    if (result.length === 0) {
      throw new NotFoundException('插件记录不存在');
    }

    this.logger.log(`用户 ${userId} 保存插件配置 ${id}`);

    return {
      success: true,
      configValues: (result[0].configValues as Record<string, any>) ?? {},
    };
  }
}
