import React, { useState, useEffect, useCallback } from 'react';
import { Star, Trash2, Sparkles, Search, Inbox, Briefcase, Lightbulb, Heart } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import * as memoryApi from '@client/src/api/memory';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { MemoryDto, FeatureCategory } from '@shared/api.interface';

const CATEGORIES: { key: FeatureCategory | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'work', label: '工作' },
  { key: 'life', label: '生活' },
  { key: 'inspiration', label: '灵感' },
];

const CategoryIcon = ({ category }: { category: FeatureCategory }) => {
  if (category === 'work') return <Briefcase className="h-4 w-4" />;
  if (category === 'life') return <Heart className="h-4 w-4" />;
  return <Lightbulb className="h-4 w-4" />;
};

const MemoryPanel: React.FC<{ conversationId?: string; messageId?: string; onSaveFromMessage?: () => void }> = ({
  conversationId,
  messageId,
  onSaveFromMessage,
}) => {
  const [items, setItems] = useState<MemoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<FeatureCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [flashbackActive, setFlashbackActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await memoryApi.list(category === 'all' ? undefined : category);
      setItems(res.items || []);
    } catch (e) {
      logger.error('加载记忆失败', e);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStar = async (m: MemoryDto): Promise<void> => {
    try {
      await memoryApi.toggleStar(m.id);
      load();
    } catch (e) {
      logger.error('标记失败', e);
    }
  };

  const handleDelete = async (m: MemoryDto): Promise<void> => {
    try {
      await memoryApi.remove(m.id);
      load();
    } catch (e) {
      logger.error('删除失败', e);
    }
  };

  const handleFlashback = async (): Promise<void> => {
    setFlashbackActive(true);
    try {
      const q = search.trim() || '最近的重要事项';
      const res = await memoryApi.flashback(q);
      if (res.items?.length > 0) {
        setItems((prev) => {
          const merged = [...res.items.map((f) => ({
            id: f.id,
            content: f.content,
            category: f.category as FeatureCategory,
            starred: false,
            sourceConversationId: undefined,
            sourceMessageId: undefined,
            createdAt: f.createdAt,
          } as MemoryDto)), ...prev];
          return merged.filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
        });
      }
    } catch (e) {
      logger.error('闪回失败', e);
    } finally {
      setFlashbackActive(false);
    }
  };

  const filtered = items.filter((m) =>
    m.content.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/60 backdrop-blur-lg">
        <Inbox className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">记忆库</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={handleFlashback} disabled={flashbackActive}>
          <Sparkles className="h-4 w-4" />
          记忆闪回
        </Button>
      </div>

      <div className="px-3 py-2 space-y-2 border-b border-border/20">
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                category === c.key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground border border-transparent hover:bg-card'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索记忆…"
            className="w-full rounded-lg bg-card/40 border border-border/30 pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary/40 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {loading && <div className="text-center text-xs text-muted-foreground py-6">加载中…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6">暂无记忆</div>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="group rounded-xl border border-border/25 bg-card/50 backdrop-blur-md p-3 space-y-1.5">
            <p className="text-sm text-foreground leading-relaxed">{m.content}</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                <CategoryIcon category={m.category} /> {m.category}
              </span>
              <span>{new Date(m.createdAt).toLocaleString()}</span>
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleStar(m)}
                  className={`p-1 rounded-md hover:bg-card transition-colors ${m.starred ? 'text-amber-400' : 'text-muted-foreground'}`}
                  aria-label="星标"
                >
                  <Star className={`h-4 w-4 ${m.starred ? 'fill-amber-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="p-1 rounded-md hover:bg-card transition-colors text-muted-foreground hover:text-destructive"
                  aria-label="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {conversationId && messageId && onSaveFromMessage && (
        <div className="px-3 py-2 border-t border-border/20">
          <Button size="sm" className="w-full" onClick={onSaveFromMessage}>
            <Star className="h-4 w-4" /> 将当前回复存入记忆
          </Button>
        </div>
      )}
    </div>
  );
};

export default MemoryPanel;