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

interface ComputerUseBridge {
  screenshot?: () => Promise<{ ok: boolean; dataUrl?: string; error?: string }>;
  mouse?: (opts: {
    x: number;
    y: number;
    action?: 'click' | 'double-click' | 'right-click' | 'down' | 'up';
  }) => Promise<{ ok: boolean; error?: string }>;
  type?: (text: string) => Promise<{ ok: boolean; error?: string }>;
  key?: (name: string) => Promise<{ ok: boolean; error?: string }>;
  shell?: (
    command: string,
    cwd?: string,
  ) => Promise<{ ok: boolean; stdout?: string; stderr?: string; code?: number; error?: string }>;
  open?: (target: string) => Promise<{ ok: boolean; error?: string }>;
  info?: () => Promise<{
    ok: boolean;
    name?: string;
    version?: string;
    width?: number;
    height?: number;
    os?: string;
    error?: string;
  }>;
}

function getBridge(): ComputerUseBridge | null {
  try {
    const b = (window as any).nexusDesktop?.computerUse;
    return b && typeof b === 'object' ? (b as ComputerUseBridge) : null;
  } catch {
    return null;
  }
}

/**
 * 电脑控制插件（功能对齐 Codex 中的 computer use）：
 * 截屏观察桌面 / 移动鼠标 / 点击 / 键盘输入 / 运行命令 / 打开文件与应用
 * 仅桌面 App(Electron) 可用。
 */
export const PLUGIN_REGISTRY: AgnesPlugin[] = [
  {
    key: 'computer-use',
    name: '电脑控制（Computer Use）',
    description:
      '像 Codex 的 computer use 一样直接操作电脑：截图观察屏幕、移动并点击鼠标、键盘输入、运行命令、打开文件与应用。',
    category: 'tool',
    icon: 'Monitor',
    version: '1.0.0',
    author: 'Agnes',
    functionDefinition: {
      name: 'computer_use',
      description:
        '在用户电脑上执行操作：screenshot 截图、click 点击(x,y)、type 输入文字、key 按键、shell 运行命令、open 打开文件/应用、info 环境信息',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description:
              'screenshot / click / type / key / shell / open / info',
          },
          x: { type: 'number', description: '鼠标 X 坐标(click 时必填)' },
          y: { type: 'number', description: '鼠标 Y 坐标(click 时必填)' },
          clickType: {
            type: 'string',
            description: 'click 类型: click(默认) / double-click / right-click',
          },
          text: { type: 'string', description: 'type 时输入的文本' },
          keyName: {
            type: 'string',
            description:
              'key 时的按键: enter/esc/tab/space/backspace/delete/home/end/pageup/pagedown/up/down/left/right',
          },
          command: { type: 'string', description: 'shell 时运行的命令' },
          cwd: { type: 'string', description: 'shell 工作目录(可选)' },
          target: { type: 'string', description: 'open 时打开的文件或应用' },
        },
        required: ['action'],
      },
    },
    execute: async (args: Record<string, any>) => {
      const bridge = getBridge();
      if (!bridge) {
        return {
          error: '电脑控制(Computer Use)仅在桌面应用内可用',
          hint: '请在 Windows/Mac 桌面端使用本能力',
        };
      }
      const action = String(args.action || '');
      try {
        switch (action) {
          case 'screenshot':
            return await bridge.screenshot!();
          case 'click': {
            const x = Math.round(Number(args.x));
            const y = Math.round(Number(args.y));
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return { ok: false, error: 'click 需要有效的 x/y 坐标' };
            }
            return await bridge.mouse!({
              x,
              y,
              action: String(args.clickType || 'click') as any,
            });
          }
          case 'type':
            return await bridge.type!(String(args.text ?? ''));
          case 'key':
            return await bridge.key!(String(args.keyName ?? ''));
          case 'shell':
            return await bridge.shell!(String(args.command ?? ''), args.cwd ? String(args.cwd) : undefined);
          case 'open':
            return await bridge.open!(String(args.target ?? ''));
          case 'info':
            return await bridge.info!();
          default:
            return { ok: false, error: `未知操作: ${action}` };
        }
      } catch (e: any) {
        return { ok: false, error: e?.message || String(e) };
      }
    },
    configSchema: {
      allowShell: {
        type: 'string',
        label: '允许 shell 命令(桌面端)',
        default: 'true',
      },
    },
  },
];

export const getPluginByKey = (key: string): AgnesPlugin | undefined =>
  PLUGIN_REGISTRY.find((p: AgnesPlugin) => p.key === key);