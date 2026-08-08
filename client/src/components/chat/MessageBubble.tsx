import React, { useState } from 'react';
import { Streamdown } from '@client/src/components/ui/streamdown';
import ToolCallCard from './ToolCallCard';
import { Image } from '@client/src/components/ui/image';
import { PencilLine, Copy, Bookmark, History } from 'lucide-react';
import type { ToolCall, TokenUsage } from '@shared/api.interface';

export interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  createdAt?: string;
  tokenUsage?: TokenUsage;
  showTime?: boolean;
  showTokenUsage?: boolean;
  userAvatar?: string;
  aiAvatar?: string;
  aiName?: string;
  messageId?: string;
  conversationId?: string;
  atomicActionsEnabled?: boolean;
  onSaveToMemory?: (messageId: string, content: string) => void;
  onRewrite?: (messageId: string) => Promise<void>;
  onBranch?: (messageId: string) => Promise<void>;
}

const BotIcon = ({ className }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
    <path d="M4 14a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" />
    <circle cx="9" cy="17" r="1" />
    <circle cx="15" cy="17" r="1" />
  </svg>
);

const formatTime = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const hm = `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  if (sameDay) return hm;
  const md = `${date.getMonth() + 1}-${date.getDate()}`;
  return `${md} ${hm}`;
};

const UserAvatar = ({ avatar }: { avatar?: string }) => {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt="用户"
        className="h-8 w-8 rounded-full border border-white/20 object-cover"
      />
    );
  }
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/15 backdrop-blur-md border border-white/20 flex items-center justify-center">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
};

const AiAvatar = ({ avatar }: { avatar?: string }) => {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt="AI"
        className="h-8 w-8 rounded-full border border-white/20 object-cover"
      />
    );
  }
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
      <BotIcon className="text-primary" />
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  toolCalls,
  createdAt,
  tokenUsage,
  showTime = false,
  showTokenUsage = false,
  userAvatar,
  aiAvatar,
  aiName = 'AI',
  messageId,
  conversationId,
  atomicActionsEnabled = false,
  onSaveToMemory,
  onRewrite,
  onBranch,
}) => {
  const [saved, setSaved] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewritten, setRewritten] = useState(false);
  const [branching, setBranching] = useState(false);
  const [branched, setBranched] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const ActionBar = () => {
    if (!atomicActionsEnabled || role !== 'assistant' || !messageId || !content) return null;
    return (
      <div className="flex items-center gap-1 pl-1 pt-1">
        <button
          type="button"
          onClick={() => {
            onSaveToMemory?.(messageId, content);
            setSaved(true);
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="存入记忆库"
        >
          <Bookmark className="h-3 w-3" />
          {saved ? '已存' : '存记忆'}
        </button>
        <button
          type="button"
          disabled={rewriting}
          onClick={async () => {
            setRewriting(true);
            try {
              await onRewrite?.(messageId);
              setRewritten(true);
            } finally {
              setRewriting(false);
            }
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          title="改写"
        >
          <PencilLine className="h-3 w-3" />
          {rewriting ? '…' : rewritten ? '已改写' : '改写'}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="复制内容（采纳执行）"
        >
          <Copy className="h-3 w-3" />
          {copied ? '已复制' : '复制'}
        </button>
        <button
          type="button"
          disabled={branching}
          onClick={async () => {
            setBranching(true);
            try {
              await onBranch?.(messageId);
              setBranched(true);
            } finally {
              setBranching(false);
            }
          }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          title="从这里回溯（时间机器）"
        >
          <History className="h-3 w-3" />
          {branching ? '…' : branched ? '已回溯' : '回溯'}
        </button>
      </div>
    );
  };

  if (role === 'user') {
    return (
      <div className="flex justify-end w-full gap-2">
        <div className="max-w-[85%] flex flex-col items-end">
          {content && (
            <div className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2.5 shadow-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {content}
              </p>
            </div>
          )}
          {toolCalls && toolCalls.length > 0 && (
            <div className="mt-2 space-y-2">
              {toolCalls.map((tc: ToolCall) => (
                <ToolCallCard
                  key={tc.id}
                  toolName={tc.name}
                  args={tc.args}
                  result={tc.result}
                  status={tc.status}
                />
              ))}
            </div>
          )}
          {showTime && createdAt && (
            <span className="mt-1 text-[11px] text-muted-foreground/70">
              {formatTime(createdAt)}
            </span>
          )}
        </div>
        <UserAvatar avatar={userAvatar} />
      </div>
    );
  }

  if (role === 'tool') {
    return (
      <div className="flex justify-start w-full">
        <div className="max-w-[85%]">
          <ToolCallCard
            toolName={content || '工具调用'}
            args={toolCalls?.[0]?.args || {}}
            result={toolCalls?.[0]?.result}
            status={toolCalls?.[0]?.status || 'success'}
          />
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex justify-start w-full gap-2">
      <AiAvatar avatar={aiAvatar} />
      <div className="max-w-[80%] space-y-2">
        <div className="text-xs font-medium text-muted-foreground">{aiName}</div>
        {content && (
          <div className="rounded-2xl rounded-tl-md border border-white/20 bg-white/60 backdrop-blur-md shadow-[0_8px_32px_rgba(0_0_0_0.08)] px-4 py-2.5">
            <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none">
              <Streamdown>{content}</Streamdown>
            </div>
          </div>
        )}
        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-2">
            {toolCalls.map((tc: ToolCall) => (
              <ToolCallCard
                key={tc.id}
                toolName={tc.name}
                args={tc.args}
                result={tc.result}
                status={tc.status}
              />
            ))}
          </div>
        )}
        {(showTime || showTokenUsage) && (
          <div className="flex items-center gap-2 pl-1 text-[11px] text-muted-foreground/70">
            {showTime && createdAt && <span>{formatTime(createdAt)}</span>}
            {showTime && showTokenUsage && tokenUsage && <span>·</span>}
            {showTokenUsage && tokenUsage && (
              <span>
                {tokenUsage.totalTokens} tokens（提示 {tokenUsage.promptTokens} / 回复{' '}
                {tokenUsage.completionTokens}）
              </span>
            )}
          </div>
        )}
        <ActionBar />
      </div>
    </div>
  );
};

export default MessageBubble;
