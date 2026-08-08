import React, { useState } from 'react';
import { Loader2, GitBranch, Sparkles } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { generateMindMap } from '@client/src/api/chat';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { MindMapNode as MindMapNodeType } from '@shared/api.interface';

interface MindMapViewProps {
  conversationId?: string;
  content: string;
}

interface LayoutNode {
  id: string;
  label: string;
  depth: number;
  offset: number;
  children: LayoutNode[];
}

// 树→层级布局：每个节点水平方向 = depth * 260，垂直方向按 offset 摊开
const toLayout = (node: MindMapNodeType, depth: number, offset: number): LayoutNode => ({
  id: node.id,
  label: node.label,
  depth,
  offset,
  children: node.children.map((c, i) =>
    toLayout(c, depth + 1, offset + (i - (node.children.length - 1) / 2) * 140)
  ),
});

const MindMapView: React.FC<MindMapViewProps> = ({ conversationId, content }) => {
  const [loading, setLoading] = useState(false);
  const [root, setRoot] = useState<LayoutNode | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const res = await generateMindMap({ conversationId: conversationId ?? '', content });
      setRoot(toLayout(res.root, 0, 0));
    } catch (e) {
      logger.error('生成思维导图失败', e);
      setError('生成失败，请确认已配置模型');
    } finally {
      setLoading(false);
    }
  };

  // 收集全部节点与边
  const collect = (n: LayoutNode, nodes: LayoutNode[] = [], edges: { from: LayoutNode; to: LayoutNode }[] = []) => {
    nodes.push(n);
    n.children.forEach((c) => {
      edges.push({ from: n, to: c });
      collect(c, nodes, edges);
    });
    return { nodes, edges };
  };

  const collected = root ? collect(root) : { nodes: [], edges: [] };
  const totalDepth = root ? Math.max(...collected.nodes.map((n) => n.depth)) : 1;
  const width = (totalDepth + 1.5) * 260;
  const height = 900;

  const px = (n: LayoutNode) => (n.depth * 260 + 150);
  const py = (n: LayoutNode) => (n.offset * 70 + 360);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/60 backdrop-blur-lg">
        <GitBranch className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">思维导图</span>
        <Button size="sm" className="ml-auto" onClick={handleGenerate} disabled={loading || !content.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {root ? '重新生成' : '根据当前对话生成'}
        </Button>
      </div>
      <div className="flex-1 relative overflow-auto bg-dot-grid">
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">
            {error}
          </div>
        )}
        {!root && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            点击「根据当前对话生成」展开思维导图
          </div>
        )}
        {loading && !root && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            正在梳理内容脉络…
          </div>
        )}
        {root && collected.nodes.length > 0 && (
          <svg className="absolute top-0 left-0" width={width} height={height}>
            {collected.edges.map(({ from, to }, i) => (
              <path
                key={i}
                d={`M ${px(from) + 60} ${py(from) + 22} C ${px(from) + 130} ${py(from) + 22}, ${px(to) - 70} ${py(to) + 22}, ${px(to)} ${py(to) + 22}`}
                fill="none"
                stroke="rgba(148,163,184,0.5)"
                strokeWidth={2}
              />
            ))}
            {collected.nodes.map((n) => (
              <g key={n.id}>
                <rect
                  x={px(n)}
                  y={py(n)}
                  width={120}
                  height={44}
                  rx={10}
                  fill={n.depth === 0 ? 'rgba(99,102,241,0.25)' : n.depth === 1 ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.12)'}
                  stroke={n.depth === 0 ? 'rgba(99,102,241,0.65)' : n.depth === 1 ? 'rgba(16,185,129,0.5)' : 'rgba(148,163,184,0.4)'}
                  strokeWidth={1.2}
                />
                <text x={px(n) + 60} y={py(n) + 26} textAnchor="middle" fontSize={12} fill="currentColor" className="fill-foreground">
                  {n.label.length > 13 ? `${n.label.slice(0, 13)}…` : n.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
};

export default MindMapView;