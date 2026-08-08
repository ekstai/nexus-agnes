import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Calculator,
  Languages,
  CloudSun,
  Terminal,
  Search,
  Puzzle,
  Loader2,
  Trash2,
  Settings,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Switch } from '@client/src/components/ui/switch';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Badge } from '@client/src/components/ui/badge';
import * as pluginApi from '@client/src/api/plugin';
import type { PluginDto, PluginConfigResponse } from '@shared/api.interface';

interface PluginDetailModalProps {
  open: boolean;
  plugin: PluginDto | null;
  onClose: () => void;
  onUpdated: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  Languages,
  CloudSun,
  Terminal,
  Search,
};

const categoryLabels: Record<string, string> = {
  tool: '工具类',
  search: '搜索类',
  dev: '开发类',
  life: '生活类',
};

const PluginDetailModal: React.FC<PluginDetailModalProps> = ({
  open,
  plugin,
  onClose,
  onUpdated,
}) => {
  const [installing, setInstalling] = useState<boolean>(false);
  const [uninstalling, setUninstalling] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configData, setConfigData] = useState<PluginConfigResponse | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [installProgress, setInstallProgress] = useState<number>(0);

  const loadConfig = useCallback(async (id: string) => {
    try {
      const data = await pluginApi.getConfig(id);
      setConfigData(data);
      setConfigValues(data.configValues || {});
    } catch (error) {
      logger.error('加载插件配置失败', error);
    }
  }, []);

  useEffect(() => {
    if (open && plugin?.installed && plugin.id) {
      loadConfig(plugin.id);
    } else {
      setConfigData(null);
      setConfigValues({});
    }
    setInstallProgress(0);
  }, [open, plugin, loadConfig]);

  const handleInstall = async () => {
    if (!plugin) return;
    setInstalling(true);
    setInstallProgress(0);

    // 模拟进度动画
    const progressInterval = setInterval(() => {
      setInstallProgress((prev: number) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 20;
      });
    }, 150);

    try {
      await pluginApi.install(plugin.pluginKey);
      setInstallProgress(100);
      setTimeout(() => {
        setInstalling(false);
        onUpdated();
      }, 300);
    } catch (error) {
      logger.error('安装插件失败', error);
      setInstalling(false);
      setInstallProgress(0);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleUninstall = async () => {
    if (!plugin?.id) return;
    setUninstalling(true);
    try {
      await pluginApi.uninstall(plugin.id);
      setUninstalling(false);
      onUpdated();
    } catch (error) {
      logger.error('卸载插件失败', error);
      setUninstalling(false);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    if (!plugin?.id || toggling) return;
    setToggling(true);
    try {
      await pluginApi.setEnabled(plugin.id, checked);
      onUpdated();
    } catch (error) {
      logger.error('切换插件状态失败', error);
    } finally {
      setToggling(false);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues((prev: Record<string, any>) => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async () => {
    if (!plugin?.id) return;
    setSavingConfig(true);
    try {
      await pluginApi.saveConfig(plugin.id, { configValues });
      onUpdated();
    } catch (error) {
      logger.error('保存配置失败', error);
    } finally {
      setSavingConfig(false);
    }
  };

  if (!plugin) return null;

  const IconComponent = iconMap[plugin.icon] || Puzzle;
  const hasConfig = configData && Object.keys(configData.configSchema || {}).length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-xl bg-white/80 border-white/30 shadow-[0_8px_32px_rgba(0_0_0_0.12)] max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center shrink-0">
              <IconComponent className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground">
                {plugin.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[plugin.category] || plugin.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  v{plugin.version} · {plugin.author}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="text-sm text-foreground/80 leading-relaxed">
            {plugin.description}
          </div>

          {installing && (
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-accent/50">
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在安装插件...
              </div>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
            </div>
          )}

          {plugin.installed && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-white/40">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  启用插件
                </span>
                <span className="text-xs text-muted-foreground">
                  关闭后插件将不可用
                </span>
              </div>
              <Switch
                checked={plugin.enabled ?? true}
                onCheckedChange={handleToggleEnabled}
                disabled={toggling}
              />
            </div>
          )}

          {hasConfig && plugin.installed && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/50 border border-white/40">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Settings className="w-4 h-4 text-primary" />
                插件配置
              </div>
              {Object.entries(configData!.configSchema).map(
                ([key, schema]: [string, any]) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <Label htmlFor={`config-${key}`} className="text-xs text-muted-foreground">
                      {schema.label || key}
                    </Label>
                    <Input
                      id={`config-${key}`}
                      type={schema.type === 'number' ? 'number' : 'text'}
                      value={configValues[key] ?? schema.default ?? ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleConfigChange(key, e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>
                ),
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="mt-1 self-end"
              >
                {savingConfig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中
                  </>
                ) : (
                  '保存配置'
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {plugin.installed ? (
            <Button
              variant="destructive"
              onClick={handleUninstall}
              disabled={uninstalling}
              className="w-full sm:w-auto"
            >
              {uninstalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  卸载中
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  卸载
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleInstall}
              disabled={installing}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-cyan-400 border-0 hover:brightness-110"
            >
              {installing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  安装中
                </>
              ) : (
                '安装插件'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PluginDetailModal;
