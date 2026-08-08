import { useState, useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Switch } from '@client/src/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Button } from '@client/src/components/ui/button';
import { Loader2, ListPlus } from 'lucide-react';
import * as modelConfigApi from '@client/src/api/model-config';
import type {
  ModelConfigDto,
  CreateModelConfigRequest,
  UpdateModelConfigRequest,
  ModelType,
  ApiFormat,
  FetchModelsItem,
} from '@shared/api.interface';

interface ModelConfigFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingConfig: ModelConfigDto | null;
  onSave: (
    data: CreateModelConfigRequest | UpdateModelConfigRequest,
    id?: string,
  ) => Promise<void>;
  isSaving: boolean;
}

const ModelConfigForm = ({
  open,
  onOpenChange,
  editingConfig,
  onSave,
  isSaving,
}: ModelConfigFormProps) => {
  const [name, setName] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [modelType, setModelType] = useState<ModelType>('remote');
  const [apiFormat, setApiFormat] = useState<ApiFormat>('openai');
  const [maxTokens, setMaxTokens] = useState<number>(4096);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [thinkingLevel, setThinkingLevel] = useState<number>(50);
  const [modelOptions, setModelOptions] = useState<FetchModelsItem[]>([]);
  const [fetchingModels, setFetchingModels] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');

  const isEditing: boolean = editingConfig !== null;

  useEffect(() => {
    if (open) {
      if (editingConfig) {
        setName(editingConfig.name);
        setApiUrl(editingConfig.apiUrl);
        setApiKey('');
        setModelName(editingConfig.modelName);
        setModelType(editingConfig.modelType);
        setApiFormat(editingConfig.apiFormat ?? 'openai');
        setMaxTokens(editingConfig.maxTokens ?? 4096);
        setIsDefault(editingConfig.isDefault);
        setThinkingLevel(editingConfig.thinkingLevel ?? 50);
      } else {
        setName('');
        setApiUrl('');
        setApiKey('');
        setModelName('');
        setModelType('remote');
        setApiFormat('openai');
        setMaxTokens(4096);
        setSystemPrompt('');
        setIsDefault(false);
        setThinkingLevel(50);
      }
      setModelOptions([]);
      setFetchError('');
    }
  }, [open, editingConfig]);

  const handleFetchModels = async (): Promise<void> => {
    const url = apiUrl.trim();
    const key = apiKey.trim();
    if (!url || (!isEditing && !key)) return;
    setFetchingModels(true);
    setFetchError('');
    try {
      const response = await modelConfigApi.fetchModels({
        apiUrl: url,
        apiKey: key,
      });
      setModelOptions(response.items || []);
      if (response.items?.length === 0) {
        setFetchError('接口返回了 0 个模型，请检查 API 地址');
      } else if (response.items?.length === 1) {
        setModelName(response.items[0].id);
      }
    } catch (error: unknown) {
      logger.error('获取模型列表失败', error);
      setFetchError(error instanceof Error ? error.message : '获取模型列表失败');
      setModelOptions([]);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!name.trim() || !apiUrl.trim() || !modelName.trim()) {
      return;
    }

    if (!isEditing && !apiKey.trim()) {
      return;
    }

    try {
      if (isEditing) {
        const updateData: UpdateModelConfigRequest = {
          name: name.trim(),
          apiUrl: apiUrl.trim(),
          modelName: modelName.trim(),
          modelType,
          apiFormat,
          maxTokens,
          systemPrompt,
          isDefault,
          thinkingLevel,
        };
        if (apiKey.trim()) {
          updateData.apiKey = apiKey.trim();
        }
        await onSave(updateData, editingConfig!.id);
      } else {
        const createData: CreateModelConfigRequest = {
          name: name.trim(),
          apiUrl: apiUrl.trim(),
          apiKey: apiKey.trim(),
          modelName: modelName.trim(),
          modelType,
          apiFormat,
          maxTokens,
          systemPrompt,
          isDefault,
          thinkingLevel,
        };
        await onSave(createData);
      }
      onOpenChange(false);
    } catch (error: unknown) {
      logger.error('Failed to save model config', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑模型配置' : '添加模型配置'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? '修改模型配置信息，API Key 留空则不更新'
              : '配置一个新的 AI 模型接口'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="例如：我的 GPT-4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiUrl">API 地址</Label>
            <Input
              id="apiUrl"
              value={apiUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key {isEditing && <span className="text-muted-foreground">(留空不更新)</span>}
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              placeholder={isEditing ? '••••••••' : 'sk-...'}
              required={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1">
                <Label htmlFor="modelName">模型名称</Label>
                <Input
                  id="modelName"
                  value={modelName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelName(e.target.value)}
                  placeholder="例如：gpt-4o"
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                disabled={fetchingModels || !apiUrl.trim() || (!isEditing && !apiKey.trim())}
                className="shrink-0"
              >
                {fetchingModels ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ListPlus className="mr-1 h-3.5 w-3.5" />
                )}
                获取模型列表
              </Button>
            </div>
            {modelOptions.length > 0 && (
              <div className="pt-1">
                <Label htmlFor="modelPick">已获取到 {modelOptions.length} 个模型</Label>
                <Select
                  value={modelName}
                  onValueChange={(value: string) => setModelName(value)}
                >
                  <SelectTrigger id="modelPick" className="w-full">
                    <SelectValue placeholder="从列表中选择模型" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {modelOptions.map((option: FetchModelsItem) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} ({option.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {fetchError && (
              <p className="text-xs text-destructive">{fetchError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelType">模型类型</Label>
            <Select value={modelType} onValueChange={(value: string) => setModelType(value as ModelType)}>
              <SelectTrigger id="modelType" className="w-full">
                <SelectValue placeholder="选择模型类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">远程模型</SelectItem>
                <SelectItem value="local">本地模型</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiFormat">接口格式</Label>
            <Select value={apiFormat} onValueChange={(value: string) => setApiFormat(value as ApiFormat)}>
              <SelectTrigger id="apiFormat" className="w-full">
                <SelectValue placeholder="选择接口格式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI 兼容 (v1/chat/completions)</SelectItem>
                <SelectItem value="anthropic">Anthropic (v1/messages)</SelectItem>
                <SelectItem value="ollama">Ollama (本地 /api/chat)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              根据你的服务提供商选择对应的 API 格式
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTokens">最大输出 Token</Label>
            <Input
              id="maxTokens"
              type="number"
              min={256}
              max={32768}
              step={256}
              value={maxTokens}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMaxTokens(Math.max(256, Number(e.target.value) || 4096))
              }
            />
            <p className="text-xs text-muted-foreground">
              单次回复允许生成的最大 Token 数，越大回答可以越详细
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="systemPrompt">系统提示词（可选）</Label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSystemPrompt(e.target.value)}
              placeholder="例如：你是一位严谨的中文科技写作专家，回答使用 Markdown 排版…"
              rows={3}
              className="w-full rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
          </div>

          <div className="rounded-lg border border-border/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="thinkingLevel" className="text-sm font-medium">
                思考大小
              </Label>
              <span className="text-sm font-mono text-primary">{thinkingLevel}</span>
            </div>
            <input
              id="thinkingLevel"
              type="range"
              min={0}
              max={100}
              step={5}
              value={thinkingLevel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setThinkingLevel(Number(e.target.value))
              }
              className="w-full accent-[var(--primary)]"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              数值越高，AI 回答思考越深入，耗时越长
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="isDefault" className="text-sm font-medium">
                设为默认
              </Label>
              <p className="text-xs text-muted-foreground">
                新建对话时默认使用此配置
              </p>
            </div>
            <Switch id="isDefault" checked={isDefault} onCheckedChange={setIsDefault} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModelConfigForm;
