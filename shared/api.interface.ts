export type MessageRole = 'user' | 'assistant' | 'tool';
export type MessageStatus = 'sending' | 'success' | 'error';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'success' | 'error';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
  status: MessageStatus;
  orderIndex: number;
  createdAt: string;
  tokenUsage?: TokenUsage;
}

export interface ConversationDto {
  id: string;
  title: string;
  modelConfigId?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  createdAt: string;
}

export interface ConversationDetailDto extends ConversationDto {
  messages: MessageDto[];
}

export interface ConversationListResponse {
  items: ConversationDto[];
  total: number;
}

export interface CreateConversationRequest {
  title?: string;
  modelConfigId?: string;
}

export interface UpdateConversationRequest {
  title?: string;
  modelConfigId?: string;
}

export type ModelType = 'remote' | 'local';
export type ApiFormat = 'openai' | 'anthropic' | 'ollama';

export interface ModelConfigDto {
  id: string;
  name: string;
  apiUrl: string;
  modelName: string;
  modelType: ModelType;
  apiFormat: ApiFormat;
  maxTokens: number;
  hasSystemPrompt: boolean;
  isDefault: boolean;
  thinkingLevel: number;
  createdAt: string;
}

export interface CreateModelConfigRequest {
  name: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  modelType: ModelType;
  apiFormat?: ApiFormat;
  maxTokens?: number;
  systemPrompt?: string;
  isDefault?: boolean;
  thinkingLevel?: number;
}

export interface UpdateModelConfigRequest {
  name?: string;
  apiUrl?: string;
  apiKey?: string;
  modelName?: string;
  modelType?: ModelType;
  apiFormat?: ApiFormat;
  maxTokens?: number;
  systemPrompt?: string;
  isDefault?: boolean;
  thinkingLevel?: number;
}

export interface ModelConfigListResponse {
  items: ModelConfigDto[];
}

export interface ModelTestResponse {
  success: boolean;
  latency?: number;
  error?: string;
}

export interface FetchModelsRequest {
  apiUrl: string;
  apiKey: string;
}

export interface FetchModelsItem {
  id: string;
  name: string;
}

export interface FetchModelsResponse {
  items: FetchModelsItem[];
}

export type PluginCategory = 'tool' | 'search' | 'dev' | 'life';

export interface PluginDto {
  id?: string;
  pluginKey: string;
  name: string;
  description: string;
  category: PluginCategory;
  icon: string;
  version: string;
  author: string;
  installed: boolean;
  enabled?: boolean;
  installId?: string;
}

export interface PluginMarketResponse {
  items: PluginDto[];
}

export interface PluginConfigResponse {
  configSchema: Record<string, any>;
  configValues: Record<string, any>;
}

export interface SavePluginConfigRequest {
  configValues: Record<string, any>;
}

export type ThemeType =
  | 'liquid-glass'
  | 'porous-glass'
  | 'dark'
  | 'aurora'
  | 'minimal-white';

export type FontSize = 'small' | 'medium' | 'large';
export type BubbleStyle = 'rounded' | 'square' | 'cloud';

export type MemoryCategory = 'work' | 'life' | 'inspiration';

export type FeatureCategory = MemoryCategory;

export interface FeatureFlags {
  canvasEnabled: boolean;
  mindMapEnabled: boolean;
  memoryEnabled: boolean;
  atomicActionsEnabled: boolean;
  debateEnabled: boolean;
  inputPreloadEnabled: boolean;
  timelineEnabled: boolean;
  dragWorkflowEnabled: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  canvasEnabled: false,
  mindMapEnabled: false,
  memoryEnabled: false,
  atomicActionsEnabled: false,
  debateEnabled: false,
  inputPreloadEnabled: false,
  timelineEnabled: false,
  dragWorkflowEnabled: false,
};

export interface UserPreferenceDto {
  theme: ThemeType;
  nickname: string;
  avatarUrl?: string;
  fontSize: FontSize;
  bubbleStyle: BubbleStyle;
  aiName: string;
  aiAvatar?: string;
  showMessageTime: boolean;
  showTokenUsage: boolean;
  background?: string;
  featureFlags: FeatureFlags;
  workspaceDir?: string;
}

export interface UpdatePreferenceRequest {
  theme?: ThemeType;
  nickname?: string;
  avatarUrl?: string;
  fontSize?: FontSize;
  bubbleStyle?: BubbleStyle;
  aiName?: string;
  aiAvatar?: string;
  showMessageTime?: boolean;
  showTokenUsage?: boolean;
  background?: string;
  featureFlags?: Partial<FeatureFlags>;
  workspaceDir?: string;
}

export interface ChatSendRequest {
  conversationId?: string;
  message: string;
  modelConfigId?: string;
  thinkingLevel?: number;
}

export interface ChatStreamChunk {
  type: 'content' | 'tool_call' | 'done' | 'error';
  data: any;
}

export interface ChatToolRequest {
  conversationId: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

export interface ChatToolResponse {
  result: any;
}

export interface UserStatsResponse {
  conversationCount: number;
  messageCount: number;
  pluginCount: number;
  storageUsed: string;
}

export interface DataExportResponse {
  version: string;
  exportedAt: string;
  data: {
    conversations: any[];
    messages: any[];
    modelConfigs: any[];
    plugins: any[];
    preferences: any;
  };
}

export interface DataImportRequest {
  version: string;
  data: {
    conversations?: any[];
    messages?: any[];
    modelConfigs?: any[];
    plugins?: any[];
    preferences?: any;
  };
  merge?: boolean;
}

export interface DataImportResponse {
  success: boolean;
  imported: {
    conversations: number;
    messages: number;
    modelConfigs: number;
    plugins: number;
  };
}

// ---------- Memory (记忆库) ----------
export interface MemoryDto {
  id: string;
  content: string;
  category: FeatureCategory;
  starred: boolean;
  sourceConversationId?: string;
  sourceMessageId?: string;
  createdAt: string;
}

export interface MemoryListResponse {
  items: MemoryDto[];
  total: number;
}

export interface CreateMemoryRequest {
  content: string;
  category?: FeatureCategory;
  starred?: boolean;
  sourceConversationId?: string;
  sourceMessageId?: string;
}

export interface UpdateMemoryRequest {
  content?: string;
  category?: FeatureCategory;
  starred?: boolean;
}

export interface MemoryFlashback {
  id: string;
  content: string;
  category: FeatureCategory;
  createdAt: string;
  agoText: string;
}

export interface MemoryFlashbackResponse {
  items: MemoryFlashback[];
}

// ---------- Debate (平行宇宙) ----------
export interface DebateRequest {
  conversationId: string;
  messageId: string;
}

export interface DebateOpinion {
  roleId: 'optimist' | 'risk' | 'creative';
  roleName: string;
  roleDesc: string;
  content: string;
}

export interface DebateResponse {
  opinions: DebateOpinion[];
}

// ---------- Mind map (思维导图) ----------
export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}

export interface MindMapRequest {
  conversationId: string;
  content: string;
}

export interface MindMapResponse {
  root: MindMapNode;
}

// ---------- Atomic actions ----------
export interface RewriteRequest {
  conversationId: string;
  messageId: string;
}

export interface RewriteResponse {
  message: MessageDto;
}

// ---------- Time machine ----------
export interface TimelineBranchRequest {
  conversationId: string;
  messageId: string;
}

export interface TimelineBranchResponse {
  success: boolean;
}

// ---------- Web fetch / summarize ----------
export interface FetchUrlSummaryRequest {
  url: string;
}

export interface SummarizeRequest {
  text: string;
}

export interface ExtractResponse {
  summary: string;
}
