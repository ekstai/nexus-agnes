import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Menu, MoreHorizontal, Loader2, LayoutGrid, GitBranch, Inbox, Users, AlertTriangle, X, Minus, Maximize2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import MessageBubble from '@client/src/components/chat/MessageBubble';
import ChatInput from '@client/src/components/chat/ChatInput';
import CanvasBoard from '@client/src/components/chat/CanvasBoard';
import MindMapView from '@client/src/components/chat/MindMapView';
import MemoryPanel from '@client/src/components/chat/MemoryPanel';
import DebatePanel from '@client/src/components/chat/DebatePanel';
import {
  sendMessage,
  getConversation,
  createConversation,
  updateConversation,
  rewriteMessage,
  timelineBranch,
  saveClientToolResult,
} from '@client/src/api/chat';
import AutomationToolbox from '@client/src/components/chat/AutomationToolbox';
import * as memoryApi from '@client/src/api/memory';
import * as modelConfigApi from '@client/src/api/model-config';
import { useConversationStore } from '@client/src/stores/conversation-store';
import { usePreferenceStore } from '@client/src/stores/preference-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { MessageDto, ModelConfigDto } from '@shared/api.interface';

interface OutletContext {
  setMobileOpen: (open: boolean) => void;
}

type PanelMode = 'none' | 'canvas' | 'mindmap' | 'memory' | 'debate';

const ChatPage: React.FC = () => {
  const { setMobileOpen } = useOutletContext<OutletContext>();
  const {
    currentConversationId,
    messages,
    isSending,
    setMessages,
    setCurrentConversation,
    setIsSending,
    addMessage,
    updateMessage,
    conversations,
    setConversations,
  } = useConversationStore();
  const { preference } = usePreferenceStore();

  const [loadingConv, setLoadingConv] = useState<boolean>(false);
  const [modelConfigs, setModelConfigs] = useState<ModelConfigDto[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelMode>('none');
  const [modelError, setModelError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const flags = preference?.featureFlags;
  const canvasOn = flags?.canvasEnabled ?? false;
  const mindMapOn = flags?.mindMapEnabled ?? false;
  const memoryOn = flags?.memoryEnabled ?? false;
  const debateOn = flags?.debateEnabled ?? false;
  const atomicOn = flags?.atomicActionsEnabled ?? false;
  const preloadOn = flags?.inputPreloadEnabled ?? false;
  const timelineOn = flags?.timelineEnabled ?? false;

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // 加载模型配置列表
  useEffect(() => {
    const loadModelConfigs = async (): Promise<void> => {
      try {
        const response = await modelConfigApi.list();
        setModelConfigs(response.items || []);
        const defaultOne = response.items?.find((c) => c.isDefault) || response.items?.[0];
        if (defaultOne) {
          setCurrentModelId((prev) => prev ?? defaultOne.id);
        }
      } catch (error) {
        logger.error('加载模型配置失败', error);
      }
    };
    loadModelConfigs();
  }, []);

  // 切换对话时加载消息
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      return;
    }

    let cancelled: boolean = false;

    const loadConversation = async (): Promise<void> => {
      setLoadingConv(true);
      try {
        const detail = await getConversation(currentConversationId);
        if (!cancelled) {
          setMessages(detail.messages || []);
          if (detail.modelConfigId) {
            setCurrentModelId(detail.modelConfigId);
          }
        }
      } catch (error) {
        logger.error('加载对话详情失败', error);
        if (!cancelled) {
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingConv(false);
        }
      }
    };

    loadConversation();

    return () => {
      cancelled = true;
    };
  }, [currentConversationId, setMessages]);

  const generateTempId = (): string =>
    `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const handleModelChange = async (modelConfigId: string): Promise<void> => {
    setCurrentModelId(modelConfigId);
    if (currentConversationId) {
      try {
        await updateConversation(currentConversationId, { modelConfigId });
        const list = conversations.map((c) =>
          c.id === currentConversationId ? { ...c, modelConfigId } : c
        );
        setConversations(list);
      } catch (error) {
        logger.error('切换模型失败', error);
      }
    }
  };

  const handleEnsureConversation = async (): Promise<string | null> => {
    if (currentConversationId) return currentConversationId;
    try {
      const conv = await createConversation({ title: '自动化操作' });
      setCurrentConversation(conv.id);
      setMessages([]);
      return conv.id;
    } catch (error) {
      logger.error('创建对话失败', error);
      return null;
    }
  };

  const handleUseEnd = async (
    toolCallId: string,
    toolName: string,
    result: unknown,
    conversationId?: string,
  ): Promise<void> => {
    const cid = conversationId || currentConversationId;
    if (!cid) return;
    try {
      await saveClientToolResult({
        conversationId: cid,
        toolCallId,
        toolName,
        result,
      });
      const detail = await getConversation(cid);
      setMessages(detail.messages || []);
    } catch (error) {
      logger.error('保存工具结果失败', error);
    }
  };

  const handleSend = async (text: string): Promise<void> => {
    if (!text.trim() || isSending) return;
    setModelError(null);

    const userMsg: MessageDto = {
      id: generateTempId(),
      conversationId: currentConversationId || '',
      role: 'user',
      content: text,
      status: 'success',
      orderIndex: messages.length,
      createdAt: new Date().toISOString(),
    };

    const loadingMsg: MessageDto = {
      id: generateTempId(),
      conversationId: currentConversationId || '',
      role: 'assistant',
      content: '',
      status: 'sending',
      orderIndex: messages.length + 1,
      createdAt: new Date().toISOString(),
    };

    addMessage(userMsg);
    addMessage(loadingMsg);
    setIsSending(true);

    try {
      const response = await sendMessage({
        conversationId: currentConversationId || undefined,
        message: text,
        modelConfigId: currentModelId ?? undefined,
      });

      if (!currentConversationId && response.conversationId) {
        setCurrentConversation(response.conversationId);
        try {
          const newConv = await createConversation({
            title: text.slice(0, 20),
            modelConfigId: currentModelId ?? undefined,
          });
          setConversations([newConv, ...conversations]);
        } catch (e) {
          logger.warn('创建对话标题失败', e);
        }
      }

      updateMessage(loadingMsg.id, response.message);
    } catch (error: any) {
      logger.error('发送消息失败', error);
      const isModelError =
        error?.response?.status === 400 &&
        (String(error?.response?.data?.message ?? '').includes('模型') ||
          String(error?.response?.data?.message ?? '').includes('模型配置') ||
          String(error?.response?.data?.message ?? '').includes('调用失败'));
      if (isModelError) {
        setModelError(String(error?.response?.data?.message ?? '模型调用失败，请检查配置'));
        updateMessage(loadingMsg.id, { status: 'error', content: '' });
      } else {
        updateMessage(loadingMsg.id, {
          status: 'error',
          content: '抱歉，消息发送失败，请重试。',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveToMemory = async (messageId: string, content: string): Promise<void> => {
    try {
      await memoryApi.create({
        content: content.slice(0, 2000),
        category: 'inspiration',
        sourceConversationId: currentConversationId || undefined,
        sourceMessageId: messageId,
      });
      logger.info('已存入记忆库', messageId);
    } catch (error) {
      logger.error('存入记忆库失败', error);
    }
  };

  const handleRewrite = async (messageId: string): Promise<void> => {
    try {
      await rewriteMessage({
        conversationId: currentConversationId || '',
        messageId,
      });
    } catch (error) {
      logger.error('改写失败', error);
    }
  };

  const handleBranch = async (messageId: string): Promise<void> => {
    if (!currentConversationId) return;
    try {
      await timelineBranch({
        conversationId: currentConversationId,
        messageId,
      });
      const detail = await getConversation(currentConversationId);
      setMessages(detail.messages || []);
    } catch (error) {
      logger.error('回溯失败', error);
    }
  };

  const panelTabs: { mode: PanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'canvas', label: '画布', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { mode: 'mindmap', label: '导图', icon: <GitBranch className="h-3.5 w-3.5" /> },
    { mode: 'memory', label: '记忆', icon: <Inbox className="h-3.5 w-3.5" /> },
    { mode: 'debate', label: '辩论', icon: <Users className="h-3.5 w-3.5" /> },
  ];
  const visibleTabs = panelTabs.filter((t) => {
    if (t.mode === 'canvas') return canvasOn;
    if (t.mode === 'mindmap') return mindMapOn;
    if (t.mode === 'memory') return memoryOn;
    if (t.mode === 'debate') return debateOn;
    return false;
  });

  const latestAssistantContent: string =
    [...messages].reverse().find((m) => m.role === 'assistant' && m.content)?.content || '';
  const lastAssistantMessageId: string =
    [...messages].reverse().find((m) => m.role === 'assistant' && m.content)?.id || '';
  const lastUserMessage: string =
    [...messages].reverse().find((m) => m.role === 'user' && m.content)?.content || '';

  const currentTitle: string =
    conversations.find((c) => c.id === currentConversationId)?.title ||
    (currentConversationId ? '对话中' : '新对话');

  const currentModelName: string =
    modelConfigs.find((m) => m.id === currentModelId)?.name || '选择模型';

  return (
    <div className="flex flex-col h-screen w-full bg-transparent">
      {/* 顶部导航栏 */}
      <header className="flex-shrink-0 app-drag flex items-center justify-between px-4 h-14 gap-2 border-b border-border/30 bg-card/60 backdrop-blur-lg z-10">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 app-no-drag rounded-full flex items-center justify-center hover:bg-card active:scale-95 transition-all md:hidden"
          aria-label="菜单"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{currentTitle}</h1>
          <p className="text-xs text-muted-foreground">Nexus Agnes</p>
        </div>
        <div className="hidden md:flex items-center app-no-drag">
          <Select value={currentModelId ?? undefined} onValueChange={handleModelChange}>
            <SelectTrigger className="w-[170px] h-9 bg-card/40 border-border/30 text-sm">
              <SelectValue placeholder={currentModelName} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {modelConfigs.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  暂无模型配置，请先到设置中添加
                </div>
              )}
              {modelConfigs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name}（{config.modelName}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => (window as any).nexusDesktop?.minimize?.()}
          className="hidden md:flex w-8 h-8 app-no-drag rounded-lg items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
          aria-label="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => (window as any).nexusDesktop?.maximize?.()}
          className="hidden md:flex w-8 h-8 app-no-drag rounded-lg items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
          aria-label="最大化"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => (window as any).nexusDesktop?.close?.()}
          className="hidden md:flex w-8 h-8 app-no-drag rounded-lg items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="w-10 h-10 app-no-drag rounded-full flex items-center justify-center hover:bg-card active:scale-95 transition-all md:hidden"
          aria-label="更多"
        >
          <MoreHorizontal className="w-5 h-5 text-foreground" />
        </button>
      </header>

      {/* 功能面板开关条 */}
      {visibleTabs.length > 0 && (
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border/20 bg-card/40 backdrop-blur-md">
          {visibleTabs.map((t) => (
            <button
              key={t.mode}
              type="button"
              onClick={() => setPanel(panel === t.mode ? 'none' : t.mode)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                panel === t.mode
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          {panel !== 'none' && (
            <button
              type="button"
              onClick={() => setPanel('none')}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-full hover:bg-card"
            >
              <X className="h-3.5 w-3.5" /> 关闭
            </button>
          )}
        </div>
      )}

      {/* 功能面板 */}
      {panel !== 'none' && (
        <div className="flex-shrink-0 h-[300px] border-b border-border/20">
          {panel === 'canvas' && <CanvasBoard />}
          {panel === 'mindmap' && (
            <MindMapView conversationId={currentConversationId ?? undefined} content={latestAssistantContent || lastUserMessage} />
          )}
          {panel === 'memory' && (
            <MemoryPanel
              conversationId={currentConversationId ?? undefined}
              messageId={lastAssistantMessageId || undefined}
              onSaveFromMessage={() => {
                if (latestAssistantContent) {
                  handleSaveToMemory(lastAssistantMessageId, latestAssistantContent);
                }
              }}
            />
          )}
          {panel === 'debate' && (
            <DebatePanel
              conversationId={currentConversationId ?? undefined}
              messageId={lastAssistantMessageId || undefined}
              content={latestAssistantContent}
            />
          )}
        </div>
      )}

      {/* 模型错误提示 */}
      {modelError && (
        <div className="flex-shrink-0 mx-4 mt-2 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 backdrop-blur-md px-3 py-2 text-xs text-amber-600">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{modelError}</span>
          <button
            type="button"
            onClick={() => setModelError(null)}
            className="p-1 rounded-md hover:bg-amber-400/20"
            aria-label="关闭"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 消息列表区 */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loadingConv && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {!loadingConv && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pt-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-md border border-border/20 flex items-center justify-center mb-4 shadow-lg">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                <path d="M4 14a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" />
                <circle cx="9" cy="17" r="1" />
                <circle cx="15" cy="17" r="1" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {preference?.aiName || 'Nexus Agnes'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              你好，我是 {preference?.aiName || 'Agnes'}，很高兴认识你。有什么我可以帮你的吗？
            </p>
          </div>
        )}

        {!loadingConv &&
          messages.map((msg: MessageDto) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              toolCalls={msg.toolCalls}
              createdAt={msg.createdAt}
              tokenUsage={msg.tokenUsage}
              showTime={preference?.showMessageTime}
              showTokenUsage={preference?.showTokenUsage}
              userAvatar={preference?.avatarUrl}
              aiAvatar={preference?.aiAvatar}
              aiName={preference?.aiName || 'AI'}
              messageId={msg.id}
              conversationId={currentConversationId ?? undefined}
              atomicActionsEnabled={atomicOn}
              onSaveToMemory={handleSaveToMemory}
              onRewrite={handleRewrite}
              onBranch={timelineOn ? handleBranch : undefined}
            />
          ))}

        {isSending && messages.length > 0 && (
          <div className="flex justify-start w-full gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-md border border-border/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-md border border-border/20 bg-card/60 backdrop-blur-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 底部输入区 */}
      <footer className="flex-shrink-0">
        <AutomationToolbox
          hasConversation={!!currentConversationId}
          ensureConversation={handleEnsureConversation}
          onUseEnd={handleUseEnd}
        />
        <ChatInput onSend={handleSend} disabled={isSending} preloadEnabled={preloadOn} />
      </footer>
    </div>
  );
};

export default ChatPage;