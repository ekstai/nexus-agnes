import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Link2, FileText, Wand2 } from 'lucide-react';
import { fetchUrlSummary, summarizeText } from '@client/src/api/chat';
import { logger } from '@lark-apaas/client-toolkit/logger';

export interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  preloadEnabled?: boolean;
  onPreloadText?: (text: string) => void;
}

const URL_REGEX = /https?:\/\/[^\s]+/;
const LONG_TEXT_THRESHOLD = 300;

interface PreloadSuggestion {
  type: 'template' | 'url' | 'summary';
  label: string;
  hint: string;
  action: () => void;
}

const TEMPLATES = [
  { label: '头脑风暴', text: '围绕主题进行一次头脑风暴，列出 10 个创新想法：' },
  { label: '翻译', text: '请将以下内容翻译成英文，并给出三种表达：' },
  { label: '写代码', text: '请用 TypeScript 实现以下需求，并附上说明：' },
  { label: '总结', text: '请用 5 点总结以下内容，并给出行动建议：' },
];

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  preloadEnabled = false,
  onPreloadText,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<PreloadSuggestion[]>([]);
  const [extracting, setExtracting] = useState(false);

  const adjustHeight = (): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 5 * 24;
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${scrollHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  // 输入预判：打字即感知链接/长文/模板
  useEffect(() => {
    if (!preloadEnabled) {
      setSuggestions([]);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    const next: PreloadSuggestion[] = [];

    const urlMatch = trimmed.match(URL_REGEX);
    if (urlMatch && trimmed.length < 200) {
      next.push({
        type: 'url',
        label: '识别到链接',
        hint: '点击预读网页摘要',
        action: async () => {
          setExtracting(true);
          try {
            const res = await fetchUrlSummary(urlMatch[0]);
            const text = `（网页摘要）${res.summary}\n\n${trimmed}`;
            setValue(text);
            onPreloadText?.(text);
          } catch (e) {
            logger.error('网页摘要失败', e);
          } finally {
            setExtracting(false);
          }
        },
      });
    } else if (trimmed.length >= LONG_TEXT_THRESHOLD && trimmed.length < 1000) {
      next.push({
        type: 'summary',
        label: '检测到长文本',
        hint: '点击先提取要点再发送',
        action: async () => {
          setExtracting(true);
          try {
            const res = await summarizeText(trimmed);
            setValue(`（要点提取）\n${res.summary}\n\n（原文）\n${trimmed}`);
          } catch (e) {
            logger.error('长文提取失败', e);
          } finally {
            setExtracting(false);
          }
        },
      });
    }

    setSuggestions(next);
  }, [value, preloadEnabled, onPreloadText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(e.target.value);
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (): void => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
    setSuggestions([]);
    adjustHeight();
  };

  return (
    <div className="w-full px-3 py-3 border-t border-border/30 bg-card/60 backdrop-blur-lg">
      <div className="max-w-3xl mx-auto">
        {/* 输入预判建议 */}
        {preloadEnabled && suggestions.length > 0 && !extracting && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] text-primary">
              <Sparkles className="h-3 w-3" />
              预判
            </span>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={s.action}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors"
              >
                {s.type === 'url' ? <Link2 className="h-3 w-3" /> : s.type === 'summary' ? <FileText className="h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
                {s.label}
                <span className="text-[10px] text-muted-foreground">{s.hint}</span>
              </button>
            ))}
          </div>
        )}
        {extracting && (
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 animate-pulse text-primary" />
            正在提取内容…
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl border border-border/20 bg-card/70 backdrop-blur-md shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all">
            <textarea
              ref={textareaRef}
              placeholder="输入消息...（试试粘贴链接或长文本）"
              rows={1}
              disabled={disabled}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '120px', minHeight: '44px' }}
            />
            {preloadEnabled && !value.trim() && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setValue(t.text)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="发送"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-1.5">
          按 Enter 发送，Shift + Enter 换行
          {preloadEnabled && ' · 输入预判已开启'}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;