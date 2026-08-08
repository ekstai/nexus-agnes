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
    pluginKey: 'calculator',
    name: '计算器',
    description: '支持复杂数学表达式的安全计算，包含加减乘除与括号运算',
    category: 'tool',
    icon: 'Calculator',
    version: '1.0.0',
    author: 'Agnes',
  },
  {
    pluginKey: 'translator',
    name: '翻译助手',
    description: '多语言文本互译，支持中英文及常见语种的快速翻译',
    category: 'tool',
    icon: 'Languages',
    version: '1.0.0',
    author: 'Agnes',
  },
  {
    pluginKey: 'weather',
    name: '天气查询',
    description: '查询指定城市的实时天气数据（温度/体感/湿度/风力/实时描述）',
    category: 'life',
    icon: 'CloudSun',
    version: '1.1.0',
    author: 'Agnes',
    configSchema: {
      defaultCity: { type: 'string', label: '默认城市', default: '北京' },
    },
  },
  {
    pluginKey: 'currency-convert',
    name: '实时汇率换算',
    description: '基于实时汇率的货币换算，支持美元、欧元、人民币等数十种货币',
    category: 'life',
    icon: 'DollarSign',
    version: '1.0.0',
    author: 'Agnes',
    configSchema: {
      defaultFrom: { type: 'string', label: '源货币', default: 'USD' },
      defaultTo: { type: 'string', label: '目标货币', default: 'CNY' },
    },
  },
  {
    pluginKey: 'base64-codec',
    name: 'Base64 编解码',
    description: '文本与 Base64 互转（UTF-8），支持数据编码与解码',
    category: 'tool',
    icon: 'Binary',
    version: '1.0.0',
    author: 'Agnes',
  },
  {
    pluginKey: 'uuid-gen',
    name: 'UUID 生成器',
    description: '批量生成 UUID v4，适合唯一标识、追踪号等场景',
    category: 'dev',
    icon: 'Fingerprint',
    version: '1.0.0',
    author: 'Agnes',
    configSchema: {
      count: { type: 'number', label: '生成数量', default: 1 },
    },
  },
  {
    pluginKey: 'json-tool',
    name: 'JSON 工具',
    description: 'JSON 格式化/压缩/校验，快速定位语法错误并美化输出',
    category: 'dev',
    icon: 'Braces',
    version: '1.0.0',
    author: 'Agnes',
  },
  {
    pluginKey: 'timestamp',
    name: '时间戳转换',
    description: 'Unix 时间戳与人类可读日期互转，支持任意时区偏移',
    category: 'tool',
    icon: 'Clock',
    version: '1.0.0',
    author: 'Agnes',
  },
  {
    pluginKey: 'text-stats',
    name: '文本统计',
    description: '统计文本字数、字符数、行数、词数与重复内容占比',
    category: 'tool',
    icon: 'Sigma',
    version: '1.0.0',
    author: 'Agnes',
  },
  {
    pluginKey: 'code-executor',
    name: '代码执行器',
    description: '在受限沙箱环境中运行 JavaScript 代码，支持输出捕获',
    category: 'dev',
    icon: 'Terminal',
    version: '1.0.0',
    author: 'Agnes',
    configSchema: {
      timeoutMs: { type: 'number', label: '超时时间(毫秒)', default: 5000 },
    },
  },
  {
    pluginKey: 'web-search',
    name: '网页搜索',
    description: '搜索互联网获取最新信息，返回标题、摘要与链接',
    category: 'search',
    icon: 'Search',
    version: '1.0.0',
    author: 'Agnes',
    configSchema: {
      searchEngine: {
        type: 'string',
        label: '搜索引擎',
        default: 'bing',
        options: ['bing', 'google', 'duckduckgo'],
      },
      maxResults: { type: 'number', label: '最大结果数', default: 10 },
    },
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
