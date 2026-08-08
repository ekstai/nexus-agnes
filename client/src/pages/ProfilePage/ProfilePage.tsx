import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  ArrowLeft,
  User,
  MessageSquare,
  Puzzle,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Edit3,
  Camera,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@client/src/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import { data as dataApi } from '@client/src/api';
import { preference as preferenceApi } from '@client/src/api';
import { usePreferenceStore } from '@client/src/stores/preference-store';
import { fileToSquareDataUrl } from '@client/src/utils/avatar';
import type {
  UserStatsResponse,
  UserPreferenceDto,
  DataExportResponse,
  DataImportRequest,
  DataImportResponse,
} from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [preference, setPreference] = useState<UserPreferenceDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingNickname, setEditingNickname] = useState<boolean>(false);
  const [nicknameDraft, setNicknameDraft] = useState<string>('');
  const [savingNickname, setSavingNickname] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<DataImportRequest | null>(
    null,
  );
  const [importResult, setImportResult] = useState<DataImportResponse | null>(
    null,
  );
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false);
  const [showClearDialog, setShowClearDialog] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  const updatePreferenceStore = usePreferenceStore((s) => s.updatePreference);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      const [statsData, prefData] = await Promise.all([
        dataApi.getStats(),
        preferenceApi.getPreference(),
      ]);
      setStats(statsData);
      setPreference(prefData);
    } catch (error: unknown) {
      logger.error('加载个人中心数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string): void => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleBack = (): void => {
    navigate(-1);
  };

  const handleNicknameClick = (): void => {
    if (!preference) return;
    setNicknameDraft(preference.nickname || '');
    setEditingNickname(true);
  };

  const saveNickname = async (): Promise<void> => {
    if (!preference) return;
    const trimmed = nicknameDraft.trim();
    if (trimmed === preference.nickname) {
      setEditingNickname(false);
      return;
    }
    setSavingNickname(true);
    try {
      const updated = await preferenceApi.updatePreference({
        nickname: trimmed,
      });
      setPreference(updated);
      updatePreferenceStore({ nickname: trimmed });
      showToast('昵称已更新');
    } catch (error: unknown) {
      logger.error('更新昵称失败', error);
      showToast('更新失败，请重试');
    } finally {
      setSavingNickname(false);
      setEditingNickname(false);
    }
  };

  const handleNicknameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (e.key === 'Enter') {
      saveNickname();
    } else if (e.key === 'Escape') {
      setEditingNickname(false);
    }
  };

  const handleAvatarClick = (): void => {
    avatarFileRef.current?.click();
  };

  const handleAvatarFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const dataUrl: string = await fileToSquareDataUrl(file);
      const updated: UserPreferenceDto = await preferenceApi.updatePreference({
        avatarUrl: dataUrl,
      });
      setPreference(updated);
      updatePreferenceStore({ avatarUrl: dataUrl });
      showToast('头像已更新');
    } catch (error: unknown) {
      logger.error('更新头像失败', error);
      showToast('头像更新失败，请重试');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const exportData: DataExportResponse = await dataApi.exportData();
      const jsonStr: string = JSON.stringify(exportData, null, 2);
      const blob: Blob = new Blob([jsonStr], { type: 'application/json' });
      const url: string = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      const dateStr: string = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      a.href = url;
      a.download = `agnes-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('数据导出成功');
    } catch (error: unknown) {
      logger.error('导出数据失败', error);
      showToast('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    const reader: FileReader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>): void => {
      try {
        const content: string = ev.target?.result as string;
        const parsed: DataImportRequest = JSON.parse(content);
        if (!parsed.version || !parsed.data) {
          throw new Error('Invalid backup file format');
        }
        setImportPreview(parsed);
        setShowImportDialog(true);
      } catch (error: unknown) {
        logger.error('解析导入文件失败', error);
        showToast('文件格式不正确，请选择有效的备份文件');
      }
    };
    reader.readAsText(file);
    // reset so same file can be selected again
    e.target.value = '';
  };

  const handleImportConfirm = async (): Promise<void> => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const result: DataImportResponse = await dataApi.importData(
        importPreview,
      );
      setImportResult(result);
      showToast('数据导入成功');
      // refresh stats
      const newStats = await dataApi.getStats();
      setStats(newStats);
    } catch (error: unknown) {
      logger.error('导入数据失败', error);
      showToast('导入失败，请重试');
    } finally {
      setImporting(false);
      setShowImportDialog(false);
      setImportPreview(null);
    }
  };

  const handleClearConfirm = async (): Promise<void> => {
    setClearing(true);
    try {
      await dataApi.clearData();
      showToast('数据已清除');
      // refresh
      const newStats = await dataApi.getStats();
      setStats(newStats);
    } catch (error: unknown) {
      logger.error('清除数据失败', error);
      showToast('清除失败，请重试');
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  const statItems: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
  }[] = stats
    ? [
        {
          label: '对话数',
          value: stats.conversationCount,
          icon: <MessageSquare className="w-5 h-5" />,
        },
        {
          label: '消息数',
          value: stats.messageCount,
          icon: <User className="w-5 h-5" />,
        },
        {
          label: '插件数',
          value: stats.pluginCount,
          icon: <Puzzle className="w-5 h-5" />,
        },
        {
          label: '占用空间',
          value: stats.storageUsed,
          icon: <HardDrive className="w-5 h-5" />,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient blobs for liquid glass effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-400/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-cyan-300/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 pb-20">
        {/* Top nav */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="backdrop-blur-md bg-card/40 border border-border/30 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">个人中心</h1>
        </div>

        {/* User profile card */}
        <Card className="mb-6 backdrop-blur-xl bg-card/70 border-border/30 shadow-[0_8px_32px_rgba(0_0_0_0.08)] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <button
                onClick={handleAvatarClick}
                className="relative group flex-shrink-0"
                aria-label="更换头像"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-md border-2 border-border/30 flex items-center justify-center shadow-lg overflow-hidden">
                  {uploadingAvatar ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : preference?.avatarUrl ? (
                    <Image
                      src={preference.avatarUrl}
                      alt="头像"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary/70" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />

              {/* User info */}
              <div className="flex-1 min-w-0 pt-1">
                {editingNickname ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nicknameDraft}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNicknameDraft(e.target.value)
                      }
                      onBlur={saveNickname}
                      onKeyDown={handleNicknameKeyDown}
                      autoFocus
                      className="flex-1 bg-card/50 border border-primary/30 rounded-lg px-3 py-1.5 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      maxLength={30}
                    />
                    {savingNickname && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleNicknameClick}
                    className="flex items-center gap-2 group text-left"
                  >
                    <h2 className="text-xl font-semibold text-foreground truncate">
                      {preference?.nickname || '设置昵称'}
                    </h2>
                    <Edit3 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  用户ID: {preference?.nickname ? `user_${preference.nickname.slice(0, 6)}` : '未设置'}
                </p>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-border/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats?.conversationCount ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  对话次数
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats?.pluginCount ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  安装插件
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data management section */}
        <Card className="mb-6 backdrop-blur-xl bg-card/70 border-border/30 shadow-[0_8px_32px_rgba(0_0_0_0.08)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              数据管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-card/40 backdrop-blur-sm border-border/30 hover:bg-card/50"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Download className="w-5 h-5 text-primary" />
              )}
              <div className="text-left flex-1">
                <div className="font-medium text-foreground">导出数据</div>
                <div className="text-xs text-muted-foreground font-normal">
                  将所有对话、配置导出为 JSON 文件
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-card/40 backdrop-blur-sm border-border/30 hover:bg-card/50"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-primary" />
              )}
              <div className="text-left flex-1">
                <div className="font-medium text-foreground">导入数据</div>
                <div className="text-xs text-muted-foreground font-normal">
                  从备份文件恢复对话和配置
                </div>
              </div>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileSelect}
              className="hidden"
            />

            <AlertDialog
              open={showClearDialog}
              onOpenChange={setShowClearDialog}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 bg-red-50/30 backdrop-blur-sm border-red-200/30 hover:bg-red-50/50 text-destructive"
                >
                  <Trash2 className="w-5 h-5" />
                  <div className="text-left flex-1">
                    <div className="font-medium">清除所有数据</div>
                    <div className="text-xs opacity-70 font-normal">
                      删除所有对话、消息和插件配置
                    </div>
                  </div>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
                <AlertDialogHeader>
                  <AlertDialogTitle>确认清除数据？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除你所有的对话记录、消息、插件配置和模型配置，
                    且无法恢复。建议先导出数据备份。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={clearing}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handleClearConfirm();
                    }}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    disabled={clearing}
                  >
                    {clearing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        清除中...
                      </>
                    ) : (
                      '确认清除'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Usage stats overview */}
        <Card className="backdrop-blur-xl bg-card/70 border-border/30 shadow-[0_8px_32px_rgba(0_0_0_0.08)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              使用统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {statItems.map(
                  (
                    item: {
                      label: string;
                      value: string | number;
                      icon: React.ReactNode;
                    },
                    idx: number,
                  ) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        {item.icon}
                        <span className="text-xs">{item.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {item.value}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import preview dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入数据？</AlertDialogTitle>
            <AlertDialogDescription>
              即将导入以下数据，导入后将与现有数据合并。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {importPreview && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="p-3 rounded-lg bg-card/40 border border-border/20 text-center">
                <div className="text-xl font-bold text-primary">
                  {importPreview.data.conversations?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">对话</div>
              </div>
              <div className="p-3 rounded-lg bg-card/40 border border-border/20 text-center">
                <div className="text-xl font-bold text-primary">
                  {importPreview.data.messages?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">消息</div>
              </div>
              <div className="p-3 rounded-lg bg-card/40 border border-border/20 text-center">
                <div className="text-xl font-bold text-primary">
                  {importPreview.data.modelConfigs?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">模型配置</div>
              </div>
              <div className="p-3 rounded-lg bg-card/40 border border-border/20 text-center">
                <div className="text-xl font-bold text-primary">
                  {importPreview.data.plugins?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">插件</div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleImportConfirm();
              }}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  确认导入
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-foreground/90 text-background text-sm font-medium backdrop-blur-lg shadow-lg animate-in fade-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
