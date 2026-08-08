import React, { useState, useEffect, useCallback } from 'react';
import { Camera, FolderOpen, ImagePlus, FilePlus2, FileText, Loader2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as pluginApi from '@client/src/api/plugin';
import { getPluginByKey } from '@client/src/plugins/registry';
import type { PluginDto } from '@shared/api.interface';

interface AutomationToolboxProps {
  hasConversation: boolean;
  ensureConversation: () => Promise<string | null>;
  onUseEnd: (toolCallId: string, toolName: string, result: any, conversationId?: string) => Promise<void>;
}

interface ToolAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  needsArgs?: boolean;
  color: string;
  promptArgs?: (plugin: PluginDto) => Promise<Record<string, any> | null>;
}

const AutomationToolbox: React.FC<AutomationToolboxProps> = ({
  hasConversation,
  ensureConversation,
  onUseEnd,
}) => {
  const [plugins, setPlugins] = useState<PluginDto[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  const loadBuiltins = useCallback(async (): Promise<void> => {
    try {
      const data = await pluginApi.getMarket();
      const builtins = (data.items || []).filter(
        (p: PluginDto) =>
          p.builtin &&
          (p.installed || p.enabled !== false) &&
          (p.pluginKey === 'system-file-tools' || p.pluginKey === 'system-camera'),
      );
      setPlugins(builtins);
    } catch (error) {
      logger.error('加载内置插件失败', error);
    }
  }, []);

  useEffect(() => {
    void loadBuiltins();
    const interval = window.setInterval(() => void loadBuiltins(), 30000);
    return () => window.clearInterval(interval);
  }, [loadBuiltins]);

  const actionsFor = (plugin: PluginDto): BuiltAction[] => {
    if (plugin.pluginKey === 'system-camera') {
      return [
        {
          key: 'capture',
          label: '拍照',
          icon: <Camera className="w-4 h-4" />,
          color: 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
          args: { action: 'capture' },
        },
        {
          key: 'read',
          label: '读取照片',
          icon: <ImagePlus className="w-4 h-4" />,
          color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 hover:bg-cyan-500/20',
          args: { action: 'read' },
        },
      ];
    }
    return [
      {
        key: 'create-file',
        label: '创建文件',
        icon: <FilePlus2 className="w-4 h-4" />,
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/20',
        args: {},
        prompt: async (): Promise<Record<string, any> | null> => {
          const fileName = window.prompt('输入文件名(如 note.txt):', 'agnes-note.txt');
          if (fileName === null) return null;
          const content = window.prompt('输入文件内容:', '');
          if (content === null) return null;
          return { action: 'create-file', fileName, content };
        },
      },
      {
        key: 'read-text',
        label: '读取文件',
        icon: <FileText className="w-4 h-4" />,
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20',
        args: { action: 'read-text' },
      },
      {
        key: 'read-photo',
        label: '读取照片',
        icon: <ImagePlus className="w-4 h-4" />,
        color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 hover:bg-cyan-500/20',
        args: { action: 'read-photo' },
      },
      {
        key: 'open-folder',
        label: '打开工作目录',
        icon: <FolderOpen className="w-4 h-4" />,
        color: 'bg-violet-500/10 text-violet-600 border-violet-500/30 hover:bg-violet-500/20',
        args: { action: 'open-folder' },
      },
    ];
  };

  const runAction = async (plugin: PluginDto, action: BuiltAction): Promise<void> => {
    if (running) return;
    let cid = hasConversation ? null : await ensureConversation();
    if (!cid && hasConversation) {
      cid = await ensureConversation();
    }
    if (!cid) {
      window.alert('无法创建对话，请重试');
      return;
    }
    const reg = getPluginByKey(plugin.pluginKey);
    if (!reg) {
      window.alert('本地插件实现不存在，请更新应用');
      return;
    }
    let args: Record<string, any> = action.args;
    if (action.prompt) {
      const picked = await action.prompt(plugin);
      if (!picked) return;
      args = picked;
    }
    setRunning(action.key);
    const toolCallId = `local_${Date.now()}_${++local_seq}`;
    try {
      const config: Record<string, any> = {};
      const result = await reg.execute(args, config);
      await onUseEnd(toolCallId, plugin.pluginKey, result, cid);
    } catch (error) {
      logger.error('工具执行失败', error);
      await onUseEnd(
        toolCallId,
        plugin.pluginKey,
        { error: error instanceof Error ? error.message : String(error) },
        cid,
      ).catch(() => {});
    } finally {
      setRunning(null);
    }
  };

  if (plugins.length === 0) return null;

  return (
    <div className="flex-shrink-0 flex items-center gap-1.5 overflow-x-auto px-3 py-1.5 border-t border-border/20 bg-card/40 backdrop-blur-md scrollbar-hide">
      <span className="text-[11px] text-muted-foreground shrink-0">自动化</span>
      {plugins.flatMap((p) =>
        actionsFor(p).map((a) => (
          <button
            key={`${p.pluginKey}-${a.key}`}
            type="button"
            disabled={running !== null}
            onClick={() => void runAction(p, a)}
            className={[
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors',
              a.color,
              running !== null ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {running === a.key ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              a.icon
            )}
            {a.label}
          </button>
        )),
      )}
    </div>
  );
};

interface BuiltAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  args?: Record<string, any>;
  prompt?: (plugin: PluginDto) => Promise<Record<string, any> | null>;
}

let local_seq = 0;

export default AutomationToolbox;