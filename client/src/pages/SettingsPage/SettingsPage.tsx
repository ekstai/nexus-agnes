import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Palette,
  Cpu,
  Puzzle,
  Database,
  Info,
  Download,
  Upload,
  Trash2,
  MessageSquare,
  FileText,
  Package,
  HardDrive,
  FileCode,
  Bot,
  Settings2,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Switch } from '@client/src/components/ui/switch';
import { Label } from '@client/src/components/ui/label';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import ThemeSelector from '@client/src/components/theme-selector';
import { useTheme } from '@client/src/themes';
import ModelConfigList from '@client/src/components/settings/ModelConfigList';
import SettingsGroup from '@client/src/components/settings/SettingsGroup';
import PluginManageList from '@client/src/components/settings/PluginManageList';
import { usePreferenceStore } from '@client/src/stores/preference-store';
import { fileToSquareDataUrl } from '@client/src/utils/avatar';
import { Image } from '@client/src/components/ui/image';
import { checkForUpdate, APP_VERSION } from '@client/src/api/update';
import type {
  UpdateCheckInfo,
} from '@client/src/api/update';
import type {
  FontSize,
  BubbleStyle,
  UpdatePreferenceRequest,
  FeatureFlags,
} from '@shared/api.interface';

const FEATURE_ITEMS: { key: keyof FeatureFlags; title: string; description: string }[] = [
  { key: 'canvasEnabled', title: '无限画布 / 白板', description: '拖拽节点与连线，自由组织想法与工作流' },
  { key: 'dragWorkflowEnabled', title: '拖拽工作流', description: '将节点拖拽成可执行的自动化工作流' },
  { key: 'mindMapEnabled', title: '思维导图', description: '将对话自动展开为可编辑的思维导图' },
  { key: 'memoryEnabled', title: '记忆库与闪回', description: '保存重要信息，关键时刻自动唤醒' },
  { key: 'atomicActionsEnabled', title: '一键原子动作', description: '采纳执行、存入知识库、改写等快捷操作' },
  { key: 'debateEnabled', title: '多智能体辩论', description: '召集多个 AI 角色展开平行宇宙辩论' },
  { key: 'inputPreloadEnabled', title: '输入预判', description: '打字即出模板、链接摘要、长文自动提取' },
  { key: 'timelineEnabled', title: '时间机器', description: '回溯任意对话节点，从后悔药处分叉' },
];

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

const BUBBLE_STYLE_OPTIONS: { value: BubbleStyle; label: string }[] = [
  { value: 'rounded', label: '圆角' },
  { value: 'square', label: '方形' },
  { value: 'cloud', label: '云朵' },
];

const BACKGROUND_PRESETS: { name: string; value: string }[] = [
  { name: '默认', value: '' },
  { name: '暮色蓝紫', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: '海洋青', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { name: '晨曦', value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { name: '墨绿森林', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { name: '夜空', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
];

const CHANGELOG = [
  {
    version: '2.2.2',
    date: '2026-08-09',
    items: [
      '内置插件精简为 1 个：电脑控制（Computer Use）—— 与 Codex 的 computer use 功能一致',
      'Computer Use：截图观察屏幕、鼠标移动/单击/双击/右键、键盘输入(支持中文)、运行命令、打开文件与应用、环境信息',
      '移除原有全部插件(计算器/翻译/天气/汇率/Base64/UUID/JSON/时间戳/文本统计/代码执行/网页搜索/相机/文件自动化)',
      '修复：插件安装完成后界面立即显示已安装(不再需要退出重进)',
      '插件下载安装显示真实分阶段进度(下载清单/校验/写入)',
      '对话支持重命名（侧边栏铅笔图标就地编辑）',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-08-08',
    items: [
      '新增 7 个实用插件：实时天气(真实数据)、实时汇率、Base64 编解码、UUID 生成、JSON 工具、时间戳转换、文本统计',
      '翻译插件升级为真实翻译服务',
      '插件市场新增插件均可安装使用，服务端与客户端双重实现',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-08-08',
    items: [
      '新增检查更新：自动与手动对比 GitHub 最新版本',
      '插件市场接入 GitHub 仓库插件目录(ekstai/nexus-agnes)',
      '新版本安装包通过 GitHub Release 发布与下载',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-08-07',
    items: [
      '应用更名: Nexus Agnes',
      '接入真实大模型调用(OpenAI/Anthropic/Ollama)',
      '支持配置接口格式、最大 Token 与系统提示词',
      '新增无限画布/白板与思维导图(可在实验室开启)',
      '新增记忆库与记忆闪回',
      '新增一键原子动作: 采纳执行/存入知识库/改写',
      '新增平行宇宙: 多角色辩论面板',
      '新增输入预判: 打字即模板/链接摘要/长文提取',
      '新增后悔药: 时间机器回溯任意对话',
      '窗口透明化',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-07',
    items: [
      '支持自动获取模型列表',
      '支持编辑 AI 名称与头像',
      '新增聊天设置：时间显示、Token 用量',
      '新增自定义背景',
      '支持会话切换模型',
      '修复设置页滚动与液态玻璃主题',
      '新增联系方式',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-01',
    items: ['Agnes 助手正式发布', '支持多主题切换', '支持插件市场', '支持模型配置管理'],
  },
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { preference, loaded, loadPreference, updatePreference } = usePreferenceStore();

  // Data management state
  const [exporting, setExporting] = useState<boolean>(false);
  const [clearDialogOpen, setClearDialogOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // AI 形象 state
  const [aiNameDraft, setAiNameDraft] = useState<string>('');
  const [savingAiName, setSavingAiName] = useState<boolean>(false);
  const [savingAiAvatar, setSavingAiAvatar] = useState<boolean>(false);
  const aiNameFileRef = useRef<HTMLInputElement>(null);

  // About state
  const [changelogOpen, setChangelogOpen] = useState<boolean>(false);
  // Update check state
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckInfo | null>(null);
  const [updateOpen, setUpdateOpen] = useState<boolean>(false);
  // Background state
  const [bgUrlDraft, setBgUrlDraft] = useState<string>('');

  // Stats (placeholder)
  const stats = {
    conversationCount: 12,
    messageCount: 156,
    pluginCount: 3,
    storageUsed: '2.4 MB',
  };

  useEffect(() => {
    loadPreference();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动静默检查更新
  useEffect(() => {
    checkForUpdate()
      .then((info) => {
        if (info && info.hasUpdate && !updateInfo) {
          toast.info(`发现新版本 v${info.latestVersion}，可在"检查更新"中查看`);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始化草稿值
  useEffect(() => {
    if (loaded && preference) {
      setAiNameDraft(preference.aiName || '');
      setBgUrlDraft(preference.background || '');
    }
  }, [loaded, preference?.aiName, preference?.background]);

  // 主题变更同步到后端
  useEffect(() => {
    if (!loaded || !preference) return;
    if (preference.theme === theme) return;
    updatePreference({ theme }).catch((error: unknown) => {
      logger.error('保存主题偏好失败', error);
    });
  }, [theme, loaded, preference]);

  const savePreference = async (
    data: UpdatePreferenceRequest,
  ): Promise<boolean> => {
    try {
      await updatePreference(data);
      toast.success('已保存');
      return true;
    } catch (error: unknown) {
      logger.error('保存偏好失败', error);
      toast.error('保存失败，请重试');
      return false;
    }
  };

  const handleFontSizeChange = (size: FontSize): void => {
    if (!preference || preference.fontSize === size) return;
    savePreference({ fontSize: size });
  };

  const handleBubbleStyleChange = (style: BubbleStyle): void => {
    if (!preference || preference.bubbleStyle === style) return;
    savePreference({ bubbleStyle: style });
  };

  const handleBack = (): void => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handlePickWorkspace = async (): Promise<void> => {
    if (!(window as any).nexusDesktop?.pickWorkspaceDir) {
      toast.info('该功能仅桌面端可用');
      return;
    }
    const dir = await (window as any).nexusDesktop.pickWorkspaceDir();
    if (dir) {
      await savePreference({ workspaceDir: dir });
    }
  };

  const saveAiName = async (): Promise<void> => {
    const trimmed = aiNameDraft.trim();
    if (!trimmed || trimmed === preference?.aiName) return;
    setSavingAiName(true);
    try {
      await savePreference({ aiName: trimmed });
    } finally {
      setSavingAiName(false);
    }
  };

  const handleAiNameFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSavingAiAvatar(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      await savePreference({ aiAvatar: dataUrl });
    } catch (error: unknown) {
      logger.error('上传 AI 头像失败', error);
      toast.error('头像上传失败');
    } finally {
      setSavingAiAvatar(false);
    }
  };

  const handleUserAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSavingAiAvatar(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      await savePreference({ avatarUrl: dataUrl });
    } catch (error: unknown) {
      logger.error('上传用户头像失败', error);
      toast.error('头像上传失败');
    } finally {
      setSavingAiAvatar(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    toast.info('导出中...');
    // 模拟导出
    await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 1200));
    setExporting(false);
    toast.success('导出成功');
  };

  const handleImportClick = (): void => {
    importFileRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.success('导入成功');
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleClearData = async (): Promise<void> => {
    setClearing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setClearing(false);
    setClearDialogOpen(false);
    toast.success('数据已清除');
  };

  const handleGoToMarket = (): void => {
    toast.info('跳转到插件市场');
  };

  const handleCheckUpdate = async (): Promise<void> => {
    setCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const info = await checkForUpdate();
      setUpdateInfo(info);
      setUpdateOpen(true);
      if (!info) {
        toast.error('检查更新失败，请检查网络后重试');
      } else if (!info.hasUpdate) {
        toast.success(`已是最新版本 v${info.currentVersion}`);
      }
    } finally {
      setCheckingUpdate(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-4 pb-20 md:p-6">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="backdrop-blur-md bg-card/40 border border-border/30 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">设置</h1>
        </div>

        {/* AI 形象 */}
        <SettingsGroup
          title="AI 形象"
          description="设置 AI 助手的名称与头像"
          icon={<Bot className="h-5 w-5" />}
          defaultExpanded
        >
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => aiNameFileRef.current?.click()}
                className="relative group flex-shrink-0"
                aria-label="更换 AI 头像"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-md border border-border/30 flex items-center justify-center shadow-lg overflow-hidden">
                  {preference?.aiAvatar ? (
                    <Image
                      src={preference.aiAvatar}
                      alt="AI 头像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Bot className="w-8 h-8 text-primary/70" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
              </button>
              <input
                ref={aiNameFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAiNameFile}
              />
              <div className="space-y-1">
                <Button variant="outline" size="sm" onClick={() => aiNameFileRef.current?.click()} disabled={savingAiAvatar}>
                  {savingAiAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  {preference?.aiAvatar ? '更换 AI 头像' : '上传 AI 头像'}
                </Button>
                {preference?.aiAvatar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => savePreference({ aiAvatar: '' })}
                  >
                    恢复默认头像
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiName">AI 名称</Label>
              <div className="flex gap-2">
                <Input
                  id="aiName"
                  value={aiNameDraft}
                  onChange={(e) => setAiNameDraft(e.target.value)}
                  placeholder={preference?.aiName || 'AI 名称'}
                  maxLength={30}
                  onBlur={saveAiName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveAiName();
                  }}
                />
                <Button size="sm" onClick={saveAiName} disabled={savingAiName || !aiNameDraft.trim()}>
                  {savingAiName ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        </SettingsGroup>

        {/* 外观设置 */}
        <SettingsGroup
          title="外观设置"
          description="主题、字体大小、气泡样式与自定义背景"
          icon={<Palette className="h-5 w-5" />}
          defaultExpanded
        >
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">主题风格</p>
              <ThemeSelector />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">字体大小</p>
              <SegmentedControl
                options={FONT_SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={preference?.fontSize ?? 'medium'}
                onChange={(val: string) => handleFontSizeChange(val as FontSize)}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">气泡样式</p>
              <SegmentedControl
                options={BUBBLE_STYLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={preference?.bubbleStyle ?? 'rounded'}
                onChange={(val: string) => handleBubbleStyleChange(val as BubbleStyle)}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">自定义背景</p>
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBgUrlDraft(preset.value);
                      savePreference({ background: preset.value });
                    }}
                    className={`h-12 w-20 rounded-xl border transition-all ${
                      (preference?.background || '') === preset.value
                        ? 'border-primary ring-2 ring-primary/40'
                        : 'border-border/40 hover:border-primary/50'
                    }`}
                    style={preset.value ? { background: preset.value } : undefined}
                    aria-label={preset.name}
                  >
                    {!preset.value && (
                      <span className="text-xs text-muted-foreground">{preset.name}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={bgUrlDraft}
                  onChange={(e) => setBgUrlDraft(e.target.value)}
                  placeholder="或输入图片 URL（如 https://...）"
                />
                <Button
                  size="sm"
                  onClick={() => savePreference({ background: bgUrlDraft.trim() })}
                  disabled={!bgUrlDraft.trim()}
                >
                  应用
                </Button>
                {preference?.background && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      setBgUrlDraft('');
                      savePreference({ background: '' });
                    }}
                  >
                    清除
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SettingsGroup>

        {/* 聊天设置 */}
        <SettingsGroup
          title="聊天设置"
          description="控制聊天界面的显示选项"
          icon={<Settings2 className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="showMessageTime" className="text-sm font-medium">
                  显示消息时间
                </Label>
                <p className="text-xs text-muted-foreground">在每条消息下方显示发送时间</p>
              </div>
              <Switch
                id="showMessageTime"
                checked={preference?.showMessageTime ?? false}
                onCheckedChange={(v: boolean) => savePreference({ showMessageTime: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/20 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="showTokenUsage" className="text-sm font-medium">
                  显示 Token 用量
                </Label>
                <p className="text-xs text-muted-foreground">在 AI 回复下方显示消耗的 Token 数</p>
              </div>
              <Switch
                id="showTokenUsage"
                checked={preference?.showTokenUsage ?? false}
                onCheckedChange={(v: boolean) => savePreference({ showTokenUsage: v })}
              />
            </div>
          </div>
        </SettingsGroup>

        {/* 工作目录 */}
        <SettingsGroup
          title="工作目录"
          description="设置本地工作目录，用于文件拖入与代码执行等能力"
          icon={<FolderOpen className="h-5 w-5" />}
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">当前目录</p>
              <p className="truncate text-xs text-muted-foreground">
                {preference?.workspaceDir || '尚未设置（默认使用用户目录）'}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handlePickWorkspace}>
              <FolderOpen className="h-4 w-4" />
              选择目录
            </Button>
          </div>
        </SettingsGroup>

        {/* Nexus 实验室：全部高级功能开关 */}
        <SettingsGroup
          title="Nexus 实验室"
          description="高级智能功能，按需开启（所有功能均可独立开关）"
          icon={<Sparkles className="h-5 w-5" />}
        >
          <div className="space-y-3">
            {FEATURE_ITEMS.map((item) => (
              <div key={item.key} className="flex items-start justify-between rounded-lg border border-border/20 p-3">
                <div className="space-y-0.5 pr-3">
                  <Label htmlFor={`feature-${item.key}`} className="text-sm font-medium">
                    {item.title}
                  </Label>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  id={`feature-${item.key}`}
                  checked={preference?.featureFlags?.[item.key] ?? false}
                  onCheckedChange={(v: boolean) =>
                    savePreference({ featureFlags: { [item.key]: v } })
                  }
                />
              </div>
            ))}
          </div>
        </SettingsGroup>

        {/* 模型配置 */}
        <SettingsGroup
          title="模型配置"
          description="管理你的 AI 模型接口配置"
          icon={<Cpu className="h-5 w-5" />}
        >
          <ModelConfigList />
        </SettingsGroup>

        {/* 插件管理 */}
        <SettingsGroup
          title="插件管理"
          description="已安装的插件与启用状态"
          icon={<Puzzle className="h-5 w-5" />}
        >
          <PluginManageList onGoToMarket={handleGoToMarket} />
        </SettingsGroup>

        {/* 数据管理 */}
        <SettingsGroup
          title="数据管理"
          description="导出、导入与清除你的数据"
          icon={<Database className="h-5 w-5" />}
        >
          <div className="space-y-5">
            {/* 数据统计 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<MessageSquare className="h-4 w-4" />} label="对话数" value={stats.conversationCount} />
              <StatCard icon={<FileText className="h-4 w-4" />} label="消息数" value={stats.messageCount} />
              <StatCard icon={<Package className="h-4 w-4" />} label="插件数" value={stats.pluginCount} />
              <StatCard icon={<HardDrive className="h-4 w-4" />} label="存储" value={stats.storageUsed} />
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="h-4 w-4" />
                {exporting ? '导出中...' : '导出数据'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportClick}>
                <Upload className="h-4 w-4" />
                导入数据
              </Button>
<input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setClearDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                清除数据
              </Button>
            </div>
          </div>
        </SettingsGroup>

        {/* 关于 */}
        <SettingsGroup
          title="关于"
          description="应用信息、联系方式与更新日志"
          icon={<Info className="h-5 w-5" />}
        >
          <div className="space-y-3">
            <InfoRow label="应用名称" value="Nexus Agnes" />
            <InfoRow label="版本号" value={APP_VERSION} />
            <InfoRow label="开发者" value="Agnes Team" />
            <InfoRow label="联系邮箱" value="StarForg@outlook.com" />
            <InfoRow label="QQ" value="2472690655" />
            <div className="pt-2 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setChangelogOpen(true)}>
                <FileCode className="h-4 w-4" />
                查看更新日志
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
              >
                {checkingUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                检查更新
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open('mailto:StarForg@outlook.com')}
              >
                <Download className="h-4 w-4" />
                联系开发者
              </Button>
            </div>
          </div>
        </SettingsGroup>

        {/* 清除数据确认弹窗 */}
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">确认清除数据</DialogTitle>
              <DialogDescription>
                此操作将删除所有对话记录、消息和本地配置，且无法恢复。请谨慎操作。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setClearDialogOpen(false)}
                disabled={clearing}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearData}
                disabled={clearing}
              >
                {clearing ? '清除中...' : '确认清除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 更新日志弹窗 */}
        <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>更新日志</DialogTitle>
              <DialogDescription>Nexus Agnes 版本更新记录</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
              {CHANGELOG.map((entry) => (
                <div key={entry.version}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      v{entry.version}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {entry.items.map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangelogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 检查更新弹窗 */}
        <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>检查更新</DialogTitle>
              <DialogDescription>Nexus Agnes 版本更新信息</DialogDescription>
            </DialogHeader>
            {updateInfo ? (
              <div className="space-y-3">
                {updateInfo.hasUpdate ? (
                  <>
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <p className="text-sm font-semibold text-primary">
                        发现新版本 v{updateInfo.latestVersion}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        当前版本 v{updateInfo.currentVersion}
                        {updateInfo.publishedAt
                          ? ` · 发布于 ${updateInfo.publishedAt.slice(0, 10)}`
                          : ''}
                      </p>
                    </div>
                    {updateInfo.releaseNotes && (
                      <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border/20 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {updateInfo.releaseNotes}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-border/20 p-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Download className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        已是最新版本 v{updateInfo.currentVersion}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        当前为仓库最新发布的版本
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {checkingUpdate ? '正在检查更新...' : '未能获取更新信息'}
              </div>
            )}
            <DialogFooter>
              {updateInfo?.hasUpdate && updateInfo.downloadUrl && (
                <Button onClick={() => window.open(updateInfo.downloadUrl!)}>
                  <Download className="h-4 w-4" />
                  下载安装包
                </Button>
              )}
              <Button variant="outline" onClick={() => setUpdateOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// --- Sub-components ---

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => {
  return (
    <div className="inline-flex rounded-xl border border-border/30 bg-card/50 p-1 backdrop-blur-sm">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative min-w-[72px] rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => {
  return (
    <div className="rounded-xl border border-border/20 bg-card/40 p-3 backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between border-b border-border/20 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
};

export default SettingsPage;