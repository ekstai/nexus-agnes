import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Check, X } from 'lucide-react';

export interface ToolCallCardProps {
  toolName: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'success' | 'error';
}

const statusConfig = {
  pending: { label: '等待中', color: 'text-muted-foreground', icon: null },
  running: { label: '执行中', color: 'text-primary', icon: Loader2 },
  success: { label: '已完成', color: 'text-success', icon: Check },
  error: { label: '失败', color: 'text-destructive', icon: X },
};

const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolName,
  args,
  result,
  status,
}) => {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="w-full max-w-[85%] rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-[0_8px_32px_rgba(0_0_0_0.08)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary flex-shrink-0`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </span>
          <span className="font-medium text-foreground truncate">{toolName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm ${config.color}`}>
            {config.label}
          </span>
          {StatusIcon && (
            <StatusIcon
              className={`w-4 h-4 ${config.color} ${status === 'running' ? 'animate-spin' : ''}`}
            />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 py-3 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">参数</div>
            <pre className="text-xs bg-black/5 rounded-lg p-2 overflow-x-auto text-foreground/80 whitespace-pre-wrap break-all">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">结果</div>
              <pre className="text-xs bg-black/5 rounded-lg p-2 overflow-x-auto text-foreground/80 whitespace-pre-wrap break-all">
                {typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCallCard;
