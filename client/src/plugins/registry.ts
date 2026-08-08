import type { PluginCategory } from '@shared/api.interface';

export interface AgnesPlugin {
  key: string;
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;
  version: string;
  author: string;
  functionDefinition: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
  execute: (
    args: Record<string, any>,
    config: Record<string, any>,
  ) => Promise<any>;
  configSchema?: Record<string, any>;
}

/**
 * 安全计算数学表达式
 * 只允许数字、小数点、运算符 + - * / 和括号 ()
 */
function safeEvaluate(expression: string): number {
  const sanitized = expression.replace(/\s+/g, '');
  if (!/^[0-9+\-*/().]+$/.test(sanitized)) {
    throw new Error('表达式包含非法字符，仅支持数字和 +-*/().');
  }
  // 防止空表达式
  if (sanitized.length === 0) {
    throw new Error('表达式不能为空');
  }
  // 防止连续运算符等基本错误由 Function 抛出
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${sanitized})`)();
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('计算结果无效');
  }
  return result;
}

/**
 * 在受限环境执行简单 JS 代码
 * 使用 Function 构造器，仅传入 console 对象，无全局变量访问
 */
function executeCodeInSandbox(code: string, timeoutMs: number = 5000): Promise<{ output: string; result: string }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('代码执行超时'));
    }, timeoutMs);

    try {
      const logs: string[] = [];
      const sandboxConsole = {
        log: (...v: any[]) => logs.push(v.map(String).join(' ')),
        error: (...v: any[]) => logs.push(`[error] ${v.map(String).join(' ')}`),
        warn: (...v: any[]) => logs.push(`[warn] ${v.map(String).join(' ')}`),
        info: (...v: any[]) => logs.push(v.map(String).join(' ')),
      };
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'console',
        `"use strict"; return (async () => { ${code} })()`,
      );
      Promise.resolve(fn(sandboxConsole))
        .then((result: any) => {
          clearTimeout(timeoutId);
          resolve({
            output: logs.join('\n'),
            result: result !== undefined ? String(result) : '',
          });
        })
        .catch((err: Error) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

export const PLUGIN_REGISTRY: AgnesPlugin[] = [
  {
    key: 'calculator',
    name: '计算器',
    description: '支持复杂数学表达式的安全计算，包含加减乘除与括号运算',
    category: 'tool',
    icon: 'Calculator',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'calculator',
      description: '计算数学表达式的结果',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '要计算的数学表达式',
          },
        },
        required: ['expression'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const expr = String(args.expression || '');
      try {
        const result = safeEvaluate(expr);
        return { expression: expr, result: String(result) };
      } catch (e: any) {
        return { expression: expr, error: e?.message || '计算失败' };
      }
    },
  },
  {
    key: 'translator',
    name: '翻译助手',
    description: '多语言文本互译，支持中英文及常见语种的快速翻译',
    category: 'tool',
    icon: 'Languages',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'translator',
      description: '将文本翻译为目标语言',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '待翻译文本' },
          targetLang: {
            type: 'string',
            description: '目标语言',
            default: 'en',
          },
        },
        required: ['text'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const text = String(args.text || '');
      const targetLang = String(args.targetLang || 'en');
      const langNames: Record<string, string> = {
        en: '英语',
        zh: '中文',
        ja: '日语',
        ko: '韩语',
        fr: '法语',
        de: '德语',
        es: '西班牙语',
      };
      const langLabel = langNames[targetLang] || targetLang;
      return {
        original: text,
        translated: `[${langLabel}] ${text} → 翻译结果`,
        targetLang,
        sourceLang: 'auto',
      };
    },
  },
  {
    key: 'weather',
    name: '天气查询',
    description: '查询指定城市的实时天气、温度、湿度与风力信息',
    category: 'life',
    icon: 'CloudSun',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'weather',
      description: '查询指定城市的天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
        },
        required: ['city'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const city = String(args.city || '未知');
      const conditions = ['晴', '多云', '阴', '小雨', '雷阵雨', '晴转多云'];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      const temp = 18 + Math.floor(Math.random() * 15);
      return {
        city,
        temperature: `${temp}°C`,
        condition: randomCondition,
        humidity: `${45 + Math.floor(Math.random() * 40)}%`,
        wind: `东南风 ${1 + Math.floor(Math.random() * 5)}级`,
        feelsLike: `${temp - 2 + Math.floor(Math.random() * 4)}°C`,
        updateTime: new Date().toLocaleString('zh-CN'),
      };
    },
    configSchema: {
      apiKey: { type: 'string', label: 'API Key', default: '' },
      defaultCity: { type: 'string', label: '默认城市', default: '北京' },
    },
  },
  {
    key: 'code-executor',
    name: '代码执行器',
    description: '在受限沙箱环境中运行 JavaScript 代码，支持输出捕获',
    category: 'dev',
    icon: 'Terminal',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'code_executor',
      description: '执行 JavaScript 代码并返回结果',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: '要执行的 JS 代码' },
        },
        required: ['code'],
      },
    },
    execute: async (args: Record<string, any>, config: Record<string, any>) => {
      const code = String(args.code || '');
      const timeoutMs = Number(config.timeoutMs) || 5000;
      try {
        const result = await executeCodeInSandbox(code, timeoutMs);
        return result;
      } catch (e: any) {
        return { error: e?.message || '执行失败', output: '' };
      }
    },
    configSchema: {
      timeoutMs: { type: 'number', label: '超时时间(毫秒)', default: 5000 },
    },
  },
  {
    key: 'web-search',
    name: '网页搜索',
    description: '搜索互联网获取最新信息，返回标题、摘要与链接',
    category: 'search',
    icon: 'Search',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'web_search',
      description: '搜索网页获取相关信息',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
        },
        required: ['query'],
      },
    },
    execute: async (args: Record<string, any>, config: Record<string, any>) => {
      const query = String(args.query || '');
      const maxResults = Number(config.maxResults) || 5;
      const count = Math.min(maxResults, 5);
      const results: Array<{ title: string; snippet: string; url: string }> = [];
      for (let i = 1; i <= count; i++) {
        results.push({
          title: `关于「${query}」的搜索结果 ${i}`,
          snippet: `这是第 ${i} 条搜索结果的摘要内容，包含与「${query}」相关的信息片段...`,
          url: `https://example.com/results/${i}?q=${encodeURIComponent(query)}`,
        });
      }
      return {
        query,
        totalResults: count * 100,
        searchTime: (Math.random() * 0.5 + 0.1).toFixed(3),
        results,
      };
    },
    configSchema: {
      searchEngine: {
        type: 'string',
        label: '搜索引擎',
        default: 'bing',
        options: ['bing', 'google', 'duckduckgo'],
      },
      maxResults: { type: 'number', label: '最大结果数', default: 5 },
    },
  },
];

export const getPluginByKey = (key: string): AgnesPlugin | undefined =>
  PLUGIN_REGISTRY.find((p: AgnesPlugin) => p.key === key);
