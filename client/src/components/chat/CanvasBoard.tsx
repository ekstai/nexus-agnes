import React, { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';

interface CanvasNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

const NODE_COLORS = [
  'from-primary/25 to-primary/10 border-primary/30',
  'from-emerald-400/25 to-emerald-400/10 border-emerald-400/30',
  'from-amber-400/25 to-amber-400/10 border-amber-400/30',
  'from-rose-400/25 to-rose-400/10 border-rose-400/30',
  'from-sky-400/25 to-sky-400/10 border-sky-400/30',
];

const CanvasBoard: React.FC = () => {
  const [nodes, setNodes] = useState<CanvasNode[]>([
    { id: 'n1', label: '主题：Nexus Agnes', x: 320, y: 180, color: NODE_COLORS[0] },
    { id: 'n2', label: '拖拽我试试', x: 620, y: 320, color: NODE_COLORS[1] },
  ]);
  const [zoom, setZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; moved: boolean; on: boolean } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const addNode = (): void => {
    const center = boardRef.current?.getBoundingClientRect();
    setNodes((prev) => [
      ...prev,
      {
        id: `n${Date.now()}`,
        label: '新想法',
        x: (center?.width ?? 800) / 2 + (Math.random() * 120 - 60),
        y: (center?.height ?? 400) / 2 + (Math.random() * 120 - 60),
        color: NODE_COLORS[prev.length % NODE_COLORS.length],
      },
    ]);
  };

  const removeNode = (id: string): void => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, node: CanvasNode): void => {
    e.preventDefault();
    dragRef.current = { id: node.id, offsetX: e.clientX - node.x, offsetY: e.clientY - node.y, moved: false, on: true };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragRef.current?.on) return;
    const dx = e.clientX - dragRef.current.offsetX;
    const dy = e.clientY - dragRef.current.offsetY;
    if (Math.abs(dx - (nodes.find((n) => n.id === dragRef.current!.id)?.x ?? 0)) > 2) {
      dragRef.current.moved = true;
    }
    setNodes((prev) =>
      prev.map((n) => (n.id === dragRef.current?.id ? { ...n, x: dx / zoom, y: dy / zoom } : n))
    );
  };

  const onPointerUp = (): void => {
    if (dragRef.current) dragRef.current.on = false;
    dragRef.current = null;
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape' && editingId) setEditingId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/60 backdrop-blur-lg">
        <Button size="sm" variant="outline" onClick={addNode}>
          <Plus className="h-4 w-4" /> 添加节点
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Move className="h-3.5 w-3.5" /> 拖动节点自由布局
          </span>
        </div>
      </div>

      {/* 无限画布 */}
      <div
        ref={boardRef}
        className="flex-1 relative overflow-hidden bg-dot-grid"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute top-0 left-0 w-[2000px] h-[2000px] origin-top-left transition-transform duration-100"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* 连线：按创建顺序连接相邻节点 */}
          {nodes.slice(0, -1).map((a, i) => {
            const b = nodes[i + 1];
            if (!b) return null;
            const ax = (a.x + 100) * zoom;
            const ay = (a.y + 45) * zoom;
            const bx = b.x * zoom;
            const by = (b.y + 45) * zoom;
            const mx = (ax + bx) / 2;
            return (
              <svg key={`edge-${a.id}-${b.id}`} className="absolute top-0 left-0 w-[2000px] h-[2000px]" style={{ pointerEvents: 'none' }}>
                <path
                  d={`M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`}
                  fill="none"
                  stroke="rgba(148,163,184,0.4)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <circle cx={ax} cy={ay} r={3} fill="rgba(148,163,184,0.6)" />
                <circle cx={bx} cy={by} r={3} fill="rgba(148,163,184,0.6)" />
              </svg>
            );
          })}
          {nodes.map((node) => (
            <div
              key={node.id}
              onPointerDown={(e) => onPointerDown(e, node)}
              className={`absolute rounded-xl border bg-gradient-to-br ${node.color} backdrop-blur-md shadow-lg px-4 py-3 min-w-[150px] cursor-grab active:cursor-grabbing select-none`}
              style={{ left: node.x, top: node.y, width: 200 }}
            >
              {editingId === node.id ? (
                <input
                  autoFocus
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onBlur={() => {
                    if (draftLabel.trim()) {
                      setNodes((prev) =>
                        prev.map((n) => (n.id === node.id ? { ...n, label: draftLabel.trim() } : n))
                      );
                    }
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="w-full text-sm font-medium bg-transparent outline-none border-b border-primary/40 text-foreground"
                />
              ) : (
                <div
                  className="text-sm font-medium text-foreground break-words"
                  onDoubleClick={() => {
                    setEditingId(node.id);
                    setDraftLabel(node.label);
                  }}
                >
                  {node.label}
                </div>
              )}
              <button
                type="button"
                aria-label="删除节点"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNode(node.id);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CanvasBoard;