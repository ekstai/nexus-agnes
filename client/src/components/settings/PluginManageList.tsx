import { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Puzzle, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Switch } from '@client/src/components/ui/switch';
import { Button } from '@client/src/components/ui/button';
import * as pluginApi from '@client/src/api/plugin';
import type { PluginDto } from '@shared/api.interface';

interface PluginManageListProps {
  onGoToMarket?: () => void;
}

const PluginManageList: React.FC<PluginManageListProps> = ({ onGoToMarket }) => {
  const [plugins, setPlugins] = useState<PluginDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchInstalled = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await pluginApi.getMarket();
      const installed = response.items.filter(
        (p: PluginDto) => p.installed,
      );
      setPlugins(installed);
    } catch (error: unknown) {
      logger.error('获取已安装插件列表失败', error);
      toast.error('获取插件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstalled();
  }, []);

  const handleToggle = async (plugin: PluginDto, enabled: boolean): Promise<void> => {
    if (!plugin.installId) return;
    setTogglingId(plugin.installId);
    try {
      await pluginApi.setEnabled(plugin.installId, enabled);
      setPlugins((prev: PluginDto[]) =>
        prev.map((p: PluginDto) =>
          p.installId === plugin.installId ? { ...p, enabled } : p,
        ),
      );
      toast.success(enabled ? '插件已启用' : '插件已禁用');
    } catch (error: unknown) {
      logger.error(`切换插件状态失败: ${plugin.name}`, error);
      toast.error('操作失败，请重试');
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-10 text-center">
        <Puzzle className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="mb-1 text-sm font-medium text-foreground">
          暂无已安装插件
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          去插件市场发现更多有趣的插件
        </p>
        <Button variant="outline" size="sm" onClick={onGoToMarket}>
          <Sparkles className="h-4 w-4" />
          去插件市场
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {plugins.map((plugin: PluginDto) => (
        <div
          key={plugin.installId ?? plugin.pluginKey}
          className="flex items-center gap-3 rounded-xl border border-border/20 bg-card/50 p-3 transition-all hover:bg-card/70"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
            {plugin.icon || <Puzzle className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {plugin.name}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                v{plugin.version}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {plugin.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToMarket}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
            title="查看详情"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <Switch
            checked={plugin.enabled ?? true}
            onCheckedChange={(checked: boolean) => handleToggle(plugin, checked)}
            disabled={togglingId === plugin.installId}
          />
        </div>
      ))}
    </div>
  );
};

export default PluginManageList;
