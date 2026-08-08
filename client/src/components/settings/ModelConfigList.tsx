import { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@client/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import ModelConfigForm from './ModelConfigForm';
import * as modelConfigApi from '@client/src/api/model-config';
import type {
  ModelConfigDto,
  CreateModelConfigRequest,
  UpdateModelConfigRequest,
  ModelTestResponse,
} from '@shared/api.interface';

const ModelConfigList = () => {
  const [configs, setConfigs] = useState<ModelConfigDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfigDto | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ModelTestResponse | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchConfigs = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await modelConfigApi.list();
      setConfigs(response.items);
    } catch (error: unknown) {
      logger.error('Failed to fetch model configs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleAdd = (): void => {
    setEditingConfig(null);
    setFormOpen(true);
  };

  const handleEdit = (config: ModelConfigDto): void => {
    setEditingConfig(config);
    setFormOpen(true);
  };

  const handleSave = async (
    data: CreateModelConfigRequest | UpdateModelConfigRequest,
    id?: string,
  ): Promise<void> => {
    setIsSaving(true);
    try {
      if (id) {
        await modelConfigApi.update(id, data as UpdateModelConfigRequest);
      } else {
        await modelConfigApi.create(data as CreateModelConfigRequest);
      }
      await fetchConfigs();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await modelConfigApi.remove(id);
      setDeleteConfirmId(null);
      await fetchConfigs();
    } catch (error: unknown) {
      logger.error('Failed to delete model config', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (config: ModelConfigDto): Promise<void> => {
    if (config.isDefault) return;
    try {
      await modelConfigApi.update(config.id, { isDefault: true });
      await fetchConfigs();
    } catch (error: unknown) {
      logger.error('Failed to set default model config', error);
    }
  };

  const handleTest = async (config: ModelConfigDto): Promise<void> => {
    setTestingId(config.id);
    setTestResult(null);
    setTestDialogOpen(true);
    try {
      const result: ModelTestResponse = await modelConfigApi.test(config.id);
      setTestResult(result);
    } catch (error: unknown) {
      logger.error('Failed to test model config', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setTestingId(null);
    }
  };

  const maskApiUrl = (url: string): string => {
    if (url.length <= 30) return url;
    return url.slice(0, 27) + '...';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          管理你的 AI 模型接口配置
        </p>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4" />
          添加模型
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-12 text-center">
          <Zap className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="mb-1 text-sm font-medium text-foreground">暂无模型配置</p>
          <p className="mb-4 text-xs text-muted-foreground">
            添加你的第一个 AI 模型配置开始使用
          </p>
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            添加模型
          </Button>
        </div>
      ) : (
        <div className="space-y-3" data-ai-section-type="card-list">
          {configs.map((config: ModelConfigDto) => (
            <Card
              key={config.id}
              className="border-border/30 bg-card/60 backdrop-blur-md transition-all hover:bg-card/80"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-medium">
                      {config.name}
                    </CardTitle>
                    {config.isDefault && (
                      <Badge variant="default" className="text-[10px]">
                        <Star className="mr-1 h-3 w-3 fill-current" />
                        默认
                      </Badge>
                    )}
                  </div>
                  <Badge variant={config.modelType === 'remote' ? 'secondary' : 'outline'}>
                    {config.modelType === 'remote' ? '远程' : '本地'}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  <span className="font-mono">{maskApiUrl(config.apiUrl)}</span>
                  {' · '}
                  {config.modelName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(config)}
                    className="text-xs"
                  >
                    <Zap className="mr-1 h-3.5 w-3.5" />
                    测试
                  </Button>
                  {!config.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(config)}
                      className="text-xs"
                    >
                      <Star className="mr-1 h-3.5 w-3.5" />
                      设为默认
                    </Button>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(config)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(config.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ModelConfigForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingConfig={editingConfig}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>连通性测试</DialogTitle>
            <DialogDescription>
              测试模型接口是否可以正常访问
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {testingId ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">正在测试连接...</p>
              </div>
            ) : testResult ? (
              <div className="flex flex-col items-center justify-center py-4">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="mb-3 h-12 w-12 text-success" />
                    <p className="mb-1 text-base font-medium text-foreground">
                      连接成功
                    </p>
                    <p className="text-sm text-muted-foreground">
                      延迟：{testResult.latency}ms
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="mb-3 h-12 w-12 text-destructive" />
                    <p className="mb-1 text-base font-medium text-foreground">
                      连接失败
                    </p>
                    <p className="max-w-full break-words text-center text-sm text-muted-foreground">
                      {testResult.error || '未知错误'}
                    </p>
                    {testResult.latency !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        耗时：{testResult.latency}ms
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button onClick={() => setTestDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open: boolean) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后无法恢复，确定要删除此模型配置吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModelConfigList;
