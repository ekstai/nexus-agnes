import React, { useState } from 'react';
import { Loader2, MessagesSquare, Users } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { debate } from '@client/src/api/chat';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { DebateOpinion } from '@shared/api.interface';

interface DebatePanelProps {
  conversationId?: string;
  messageId?: string;
  content: string;
}

const ROLE_STYLES: Record<DebateOpinion['roleId'], { avatar: string; badge: string }> = {
  optimist: {
    avatar: 'from-emerald-400/40 to-emerald-400/10 border-emerald-400/40',
    badge: 'bg-emerald-400/15 text-emerald-500 border-emerald-400/30',
  },
  risk: {
    avatar: 'from-rose-400/40 to-rose-400/10 border-rose-400/40',
    badge: 'bg-rose-400/15 text-rose-500 border-rose-400/30',
  },
  creative: {
    avatar: 'from-sky-400/40 to-sky-400/10 border-sky-400/40',
    badge: 'bg-sky-400/15 text-sky-500 border-sky-400/30',
  },
};

const DebatePanel: React.FC<DebatePanelProps> = ({ conversationId, messageId, content }) => {
  const [opinions, setOpinions] = useState<DebateOpinion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDebate = async (): Promise<void> => {
    if (!messageId) return;
    setLoading(true);
    setError('');
    try {
      const res = await debate({ conversationId: conversationId ?? '', messageId });
      setOpinions(res.opinions || []);
    } catch (e) {
      logger.error('辩论失败', e);
      setError('辩论召集失败，请确认已配置模型');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/60 backdrop-blur-lg">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">平行宇宙辩论</span>
        <Button size="sm" className="ml-auto" onClick={handleDebate} disabled={loading || !messageId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
          召集辩手
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {error && <div className="text-xs text-destructive text-center py-4">{error}</div>}
        {!loading && opinions.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            召集乐观派、风险派与创意派，
            <br />
            从三个角度审视当前消息
          </div>
        )}
        {opinions.map((o) => (
          <div key={o.roleId} className="rounded-xl border border-border/25 bg-card/50 backdrop-blur-md p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br border flex items-center justify-center ${ROLE_STYLES[o.roleId].avatar}`}>
                <span className="text-xs font-bold">{o.roleName.slice(0, 1)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{o.roleName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{o.roleDesc}</div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ROLE_STYLES[o.roleId].badge}`}>
                {o.roleId === 'optimist' ? '乐观派' : o.roleId === 'risk' ? '风险派' : '创意派'}
              </span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{o.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebatePanel;