import React, { useState, useEffect } from 'react';
import { Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getConversations, deleteConversation } from '@client/src/api/chat';
import { useConversationStore } from '@client/src/stores/conversation-store';
import { formatRelativeTime } from '@client/src/utils/relative-time';
import type { ConversationDto } from '@shared/api.interface';

interface ConversationListProps {
  onSelect?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ onSelect }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    conversations,
    setConversations,
    currentConversationId,
    setCurrentConversation,
    setMessages,
  } = useConversationStore();

  const fetchConversations = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await getConversations();
      setConversations(response.items || []);
    } catch (error) {
      logger.error('加载对话列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelect = (conv: ConversationDto): void => {
    setCurrentConversation(conv.id);
    // 清空消息，由 ChatPage 负责加载具体消息
    setMessages([]);
    onSelect?.();
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string
  ): Promise<void> => {
    e.stopPropagation();
    setConfirmId(id);
  };

  const confirmDelete = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      await deleteConversation(id);
      const updated: ConversationDto[] = conversations.filter(
        (c: ConversationDto) => c.id !== id
      );
      setConversations(updated);
      if (currentConversationId === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
    } catch (error) {
      logger.error('删除对话失败', error);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const cancelDelete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setConfirmId(null);
  };

  // 按时间倒序
  const sorted: ConversationDto[] = [...conversations].sort(
    (a: ConversationDto, b: ConversationDto) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-card/40 backdrop-blur-sm border border-border/20 flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">暂无对话</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          点击上方按钮开始新对话
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
      {sorted.map((conv: ConversationDto) => {
        const isActive: boolean = currentConversationId === conv.id;
        const isConfirming: boolean = confirmId === conv.id;

        return (
          <div
            key={conv.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(conv)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(conv);
              }
            }}
            className={[
              'group relative flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer',
              'transition-all duration-200 border',
              isActive
                ? 'bg-primary/15 border-primary/30 text-foreground shadow-sm'
                : 'bg-transparent border-transparent hover:bg-card/60 hover:border-border/40 text-foreground',
            ].join(' ')}
          >
            <div
              className={[
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'bg-card/40 text-muted-foreground group-hover:text-foreground',
              ].join(' ')}
            >
              <MessageSquare className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={[
                    'text-sm font-medium truncate',
                    isActive ? 'text-foreground' : 'text-foreground/90',
                  ].join(' ')}
                >
                  {conv.title || '新对话'}
                </h4>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                  {formatRelativeTime(conv.lastMessageAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.lastMessagePreview || '暂无消息'}
              </p>
            </div>

            {isConfirming ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-end gap-1 px-2 rounded-xl bg-card/90 backdrop-blur-sm"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-2 py-1 text-xs rounded-lg text-muted-foreground hover:bg-card/60 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(conv.id)}
                  disabled={deletingId === conv.id}
                  className="px-2 py-1 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    '删除'
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e: React.MouseEvent) => handleDelete(e, conv.id)}
                className={[
                  'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'text-destructive hover:bg-destructive/10',
                ].join(' ')}
                aria-label="删除对话"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
