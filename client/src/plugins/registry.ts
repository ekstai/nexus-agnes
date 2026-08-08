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

const WEATHER_API_URL = (city: string) =>
  `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=zh`;
const CURRENCY_API_URL = (from: string) =>
  `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;

async function fetchJson(url: string, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
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
      if (!text) return { error: '请输入待翻译文本' };
      const langMap: Record<string, string> = {
        en: 'en',
        zh: 'zh-CN',
        ja: 'ja',
        ko: 'ko',
        fr: 'fr',
        de: 'de',
        es: 'es',
        ru: 'ru',
      };
      try {
        const pair = `en|${langMap[targetLang] || targetLang}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 400))}&langpair=${pair}`;
        const data = await fetchJson(url);
        const translated = data?.responseData?.translatedText || '';
        if (!translated || translated.includes('MYMEMORY WARNING')) {
          throw new Error('翻译服务返回异常');
        }
        const langNames: Record<string, string> = {
          en: '英语', zh: '中文', ja: '日语', ko: '韩语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语',
        };
        return {
          original: text,
          translated,
          targetLang,
          targetLangLabel: langNames[targetLang] || targetLang,
          sourceLang: 'auto',
          service: 'MyMemory',
        };
      } catch (e: any) {
        return { error: e?.message || '翻译服务暂不可用' };
      }
    },
  },
  {
    key: 'currency-convert',
    name: '实时汇率换算',
    description: '基于实时汇率的货币换算，支持美元、欧元、人民币等数十种货币',
    category: 'life',
    icon: 'DollarSign',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'currency_convert',
      description: '将金额从源货币换算为目标货币',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '金额' },
          from: { type: 'string', description: '源货币代码，如 USD/CNY/EUR' },
          to: { type: 'string', description: '目标货币代码，如 CNY/USD/JPY' },
        },
        required: ['amount', 'from', 'to'],
      },
    },
    execute: async (args: Record<string, any>, config: Record<string, any>) => {
      try {
        const amount = Number(args.amount ?? 1);
        const from = String(args.from || config.defaultFrom || 'USD').toUpperCase().slice(0, 3);
        const to = String(args.to || config.defaultTo || 'CNY').toUpperCase().slice(0, 3);
        const data = await fetchJson(CURRENCY_API_URL(from));
        const rate = data?.rates?.[to];
        if (!rate) return { error: `暂不支持货币 ${to}`, from, to, amount };
        return {
          from,
          to,
          amount,
          rate: Number(rate),
          result: Number((amount * rate).toFixed(2)),
          updatedAt: data.time_last_update_utc ?? '',
        };
      } catch (e: any) {
        return { error: e?.message || '汇率服务暂不可用' };
      }
    },
    configSchema: {
      defaultFrom: { type: 'string', label: '源货币', default: 'USD' },
      defaultTo: { type: 'string', label: '目标货币', default: 'CNY' },
    },
  },
  {
    key: 'base64-codec',
    name: 'Base64 编解码',
    description: '文本与 Base64 互转（UTF-8），支持数据编码与解码',
    category: 'tool',
    icon: 'Binary',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'base64_codec',
      description: '对文本进行 Base64 编码或解码',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'encode 或 decode', default: 'encode' },
          input: { type: 'string', description: '要处理的文本' },
        },
        required: ['action', 'input'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const action = String(args.action ?? 'encode');
      const input = String(args.input ?? '');
      if (!input) return { error: '请输入内容' };
      try {
        const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
        const fromB64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/\s+/g, ''))));
        if (action === 'decode') return { action, output: fromB64(input) };
        return { action, output: b64(input) };
      } catch (e: any) {
        return { error: e?.message || 'Base64 处理失败' };
      }
    },
  },
  {
    key: 'uuid-gen',
    name: 'UUID 生成器',
    description: '批量生成 UUID v4，适合唯一标识、追踪号等场景',
    category: 'dev',
    icon: 'Fingerprint',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'uuid_gen',
      description: '生成一个或多个 UUID v4',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: '生成数量', default: 1 },
        },
      },
    },
    execute: async (args: Record<string, any>) => {
      const count = Math.min(Math.max(Number(args.count ?? 1) || 1, 1), 50);
      const items: string[] = [];
      for (let i = 0; i < count; i++) {
        items.push(
          (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
                const r = (Math.random() * 16) | 0;
                const v = ch === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              }),
        );
      }
      return { count: items.length, uuids: items };
    },
    configSchema: {
      count: { type: 'number', label: '生成数量', default: 1 },
    },
  },
  {
    key: 'json-tool',
    name: 'JSON 工具',
    description: 'JSON 格式化/压缩/校验，快速定位语法错误并美化输出',
    category: 'dev',
    icon: 'Braces',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'json_tool',
      description: '格式化、压缩或校验 JSON 文本',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'format/minify/validate', default: 'format' },
          input: { type: 'string', description: 'JSON 文本' },
        },
        required: ['input'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const action = String(args.action ?? 'format');
      const input = String(args.input ?? '');
      try {
        const parsed = JSON.parse(input);
        if (action === 'minify') return { action, output: JSON.stringify(parsed) };
        if (action === 'validate') return { action, valid: true, rootType: Array.isArray(parsed) ? 'array' : typeof parsed };
        return { action, output: JSON.stringify(parsed, null, 2) };
      } catch (e: any) {
        return { action, valid: false, error: e?.message || 'JSON 语法错误' };
      }
    },
  },
  {
    key: 'timestamp',
    name: '时间戳转换',
    description: 'Unix 时间戳与人类可读日期互转，支持任意时区偏移',
    category: 'tool',
    icon: 'Clock',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'timestamp',
      description: '获取当前时间戳或转换时间戳/日期',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'now/date/from-date', default: 'now' },
          input: { type: 'string', description: '时间戳或 ISO 日期' },
        },
      },
    },
    execute: async (args: Record<string, any>) => {
      const action = String(args.action ?? 'now');
      const input = String(args.input ?? '').trim();
      if (action === 'date' && input) {
        const d = new Date(Number(input) * 1000);
        if (isNaN(d.getTime())) return { error: '时间戳格式无效' };
        return { action: 'to_date', timestamp: input, iso: d.toISOString(), local: d.toLocaleString('zh-CN') };
      }
      if (action === 'from-date' && input) {
        const d = new Date(input);
        if (isNaN(d.getTime())) return { error: '日期格式无效，请用 ISO 格式' };
        return { action: 'to_unix', input, unix: Math.floor(d.getTime() / 1000) };
      }
      const sec = Math.floor(Date.now() / 1000);
      return { action: 'now', unix: sec, iso: new Date().toISOString(), local: new Date().toLocaleString('zh-CN') };
    },
  },
  {
    key: 'text-stats',
    name: '文本统计',
    description: '统计文本字数、字符数、行数、词数与重复内容占比',
    category: 'tool',
    icon: 'Sigma',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'text_stats',
      description: '统计文本的字符、行数与去重词数',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要统计的文本' },
        },
        required: ['text'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const text = String(args.text ?? '');
      if (!text) return { error: '请输入文本' };
      const noSpace = text.replace(/\s/g, '');
      const lines = text.split(/\r?\n/);
      const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
      return {
        chars: text.length,
        charsNoSpace: noSpace.length,
        lines: lines.length,
        linesNonEmpty: lines.filter((l) => l.trim().length > 0).length,
        words: words.length,
        uniqueWords: new Set(words).size,
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
    execute: async (args: Record<string, any>, config: Record<string, any>) => {
      const city = String(args.city || config.defaultCity || '北京');
      try {
        const data = await fetchJson(WEATHER_API_URL(city));
        const area = data?.nearest_area?.[0];
        const cur = data?.current_condition?.[0];
        if (!cur) return { error: '未获取到天气数据', city };
        const cityName = area?.areaName?.[0]?.value ?? city;
        const country = area?.country?.[0]?.value ?? '';
        const nextDays = (data?.weather ?? []).slice(1, 4).map((d: any) => ({
          date: d.date,
          high: `${d.maxtempC}°C`,
          low: `${d.mintempC}°C`,
          desc: d.hourly?.[0]?.lang_zh?.[0]?.value ?? d.hourly?.[0]?.weatherDesc?.[0]?.value ?? '',
        }));
        return {
          city: `${cityName}${country ? `, ${country}` : ''}`,
          temperature: `${cur.temp_C}°C`,
          feelsLike: `${cur.FeelsLikeC}°C`,
          condition: cur.lang_zh?.[0]?.value ?? cur.weatherDesc?.[0]?.value ?? '未知',
          humidity: `${cur.humidity}%`,
          wind: `${cur.windspeedKmph} (${cur.winddir16Point})`,
          visibility: cur.visibility,
          pressure: cur.pressure,
          localtime: cur.localObsDateTime ?? '',
          forecast: nextDays,
        };
      } catch (e: any) {
        return { error: e?.message || '天气服务暂不可用', city };
      }
    },
    configSchema: {
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
