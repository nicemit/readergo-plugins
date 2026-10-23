import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import {
  MINDMAP_ROOT_ID,
  childrenOf,
  emptyMindmap,
  normalizeMindmap,
  outlineMindmap,
  type MindmapData,
} from './types';

const NODE_W = 188;
const NODE_H = 36;
const GAP_X = 72;
const GAP_Y = 18;

type Point = { x: number; y: number };

function subtreeHeight(data: MindmapData, id: string, memo: Record<string, number>): number {
  const cached = memo[id];
  if (cached !== undefined) return cached;
  const kids = childrenOf(data, id);
  if (kids.length === 0) {
    memo[id] = NODE_H;
    return NODE_H;
  }
  const height = kids.reduce((sum, kid, index) => {
    return sum + subtreeHeight(data, kid.id, memo) + (index > 0 ? GAP_Y : 0);
  }, 0);
  memo[id] = Math.max(NODE_H, height);
  return memo[id];
}

/** Root stays at y=0. Each parent is centered on its children. */
function layoutMindmap(data: MindmapData): Record<string, Point> {
  const positions: Record<string, Point> = {};
  if (!data.nodes[MINDMAP_ROOT_ID]) return positions;
  const heights: Record<string, number> = {};
  subtreeHeight(data, MINDMAP_ROOT_ID, heights);

  const place = (id: string, x: number, centerY: number) => {
    positions[id] = { x, y: centerY - NODE_H / 2 };
    const kids = childrenOf(data, id);
    if (kids.length === 0) return;
    const stack = kids.reduce((sum, kid, index) => {
      return sum + heights[kid.id] + (index > 0 ? GAP_Y : 0);
    }, 0);
    let cursor = centerY - stack / 2;
    for (const kid of kids) {
      const height = heights[kid.id];
      place(kid.id, x + NODE_W + GAP_X, cursor + height / 2);
      cursor += height + GAP_Y;
    }
  };
  place(MINDMAP_ROOT_ID, 0, 0);
  return positions;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function descendants(data: MindmapData, id: string): string[] {
  const ids: string[] = [];
  const walk = (parentId: string) => {
    for (const child of childrenOf(data, parentId)) {
      ids.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return ids;
}

export function MindmapEditor(props: EditorProps) {
  const note = props.currentNote as { id?: string; data?: unknown } | null | undefined;
  const [data, setData] = useState<MindmapData>(() => normalizeMindmap(note?.data));
  const [selected, setSelected] = useState(MINDMAP_ROOT_ID);
  const [view, setView] = useState({ x: 80, y: 80, zoom: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const incomingRef = useRef('');
  const dataRef = useRef(data);
  const focusRef = useRef(MINDMAP_ROOT_ID);
  const pendingFocusRef = useRef<string | null>(null);
  const onDataChangeRef = useRef(props.onDataChange);
  const onChangeRef = useRef(props.onChange);
  dataRef.current = data;
  onDataChangeRef.current = props.onDataChange;
  onChangeRef.current = props.onChange;

  useEffect(() => {
    const next = normalizeMindmap(note?.data);
    const snap = JSON.stringify(next);
    if (snap === incomingRef.current) return;
    incomingRef.current = snap;
    dataRef.current = next;
    setData(next);
  }, [note?.id, note?.data]);

  useEffect(() => {
    focusRef.current = MINDMAP_ROOT_ID;
    setSelected(MINDMAP_ROOT_ID);
  }, [note?.id]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !note?.id) return;
    setView({
      x: 80,
      y: canvas.clientHeight / 2 - NODE_H / 2,
      zoom: 1,
    });
  }, [note?.id]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setView((current) => {
        const nextZoom = Math.min(1.8, Math.max(0.45, current.zoom * (event.deltaY < 0 ? 1.08 : 0.92)));
        const scale = nextZoom / current.zoom;
        return {
          zoom: nextZoom,
          x: px - (px - current.x) * scale,
          y: py - (py - current.y) * scale,
        };
      });
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);

  const positions = useMemo(() => layoutMindmap(data), [data]);
  const selectedNode = data.nodes[selected] ?? data.nodes[MINDMAP_ROOT_ID];

  const commit = (next: MindmapData) => {
    const snap = JSON.stringify(next);
    incomingRef.current = snap;
    dataRef.current = next;
    setData(next);
    onDataChangeRef.current?.(next);
    onChangeRef.current?.(outlineMindmap(next));
  };

  const focusNode = (id: string) => {
    focusRef.current = id;
    pendingFocusRef.current = id;
    setSelected(id);
  };

  const addChild = (parentId: string) => {
    const current = dataRef.current;
    if (!current.nodes[parentId]) return;
    const id = newId();
    const order = childrenOf(current, parentId).reduce((max, node) => Math.max(max, node.order), 0) + 1;
    commit({
      nodes: {
        ...current.nodes,
        [id]: { id, parentId, text: '', order },
      },
    });
    focusNode(id);
  };

  const addSiblingOf = (id: string) => {
    const node = dataRef.current.nodes[id];
    if (!node || node.parentId === null) {
      addChild(MINDMAP_ROOT_ID);
      return;
    }
    addChild(node.parentId);
  };

  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    pendingFocusRef.current = null;
    const input = canvasRef.current?.querySelector<HTMLInputElement>(`[data-mind-id="${id}"]`);
    input?.focus();
    input?.select();
  }, [data]);

  const removeSelected = () => {
    const current = dataRef.current;
    const node = current.nodes[selected];
    if (!node || node.id === MINDMAP_ROOT_ID) return;
    const drop = new Set([node.id, ...descendants(current, node.id)]);
    const nodes: MindmapData['nodes'] = {};
    for (const [id, row] of Object.entries(current.nodes)) {
      if (!drop.has(id)) nodes[id] = row;
    }
    commit({ nodes });
    setSelected(node.parentId ?? MINDMAP_ROOT_ID);
  };

  const setText = (id: string, text: string) => {
    const current = dataRef.current;
    const node = current.nodes[id];
    if (!node || node.text === text) return;
    commit({
      nodes: {
        ...current.nodes,
        [id]: { ...node, text },
      },
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget && !(event.target instanceof SVGElement)) return;
    panRef.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan) return;
    setView((current) => ({
      ...current,
      x: pan.vx + (event.clientX - pan.x),
      y: pan.vy + (event.clientY - pan.y),
    }));
  };

  const onPointerUp = () => {
    panRef.current = null;
  };

  if (!note?.id) return null;

  const edges = Object.values(data.nodes).flatMap((node) => {
    if (!node.parentId) return [];
    const from = positions[node.parentId];
    const to = positions[node.id];
    if (!from || !to) return [];
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    return [{
      id: node.id,
      d: `M ${x1} ${y1} C ${x1 + 48} ${y1}, ${x2 - 48} ${y2}, ${x2} ${y2}`,
    }];
  });

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          zIndex: 2,
          top: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <button type="button" style={buttonStyle} onClick={() => addChild(focusRef.current)}>
          Add child
        </button>
        <button type="button" style={buttonStyle} onClick={() => addSiblingOf(focusRef.current)}>
          Add sibling
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={removeSelected}
          disabled={!selectedNode || selectedNode.id === MINDMAP_ROOT_ID}
        >
          Delete
        </button>
      </div>
      <div
        ref={canvasRef}
        style={{
          height: '100%',
          cursor: 'grab',
          background: 'hsl(var(--background))',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: 1,
            height: 1,
          }}
        >
          <svg
            aria-hidden
            style={{ position: 'absolute', overflow: 'visible', width: 1, height: 1, pointerEvents: 'none' }}
          >
            {edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.d}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
              />
            ))}
          </svg>
          {Object.values(data.nodes).map((node) => {
            const point = positions[node.id];
            if (!point) return null;
            const active = node.id === selectedNode?.id;
            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: point.x,
                  top: point.y,
                  width: NODE_W,
                  height: NODE_H,
                }}
              >
                <input
                  data-mind-id={node.id}
                  value={node.text}
                  placeholder="New idea"
                  aria-label={node.id === MINDMAP_ROOT_ID ? 'Central idea' : 'Mind map node'}
                  onFocus={() => {
                    focusRef.current = node.id;
                    setSelected(node.id);
                  }}
                  onChange={(event) => {
                    focusRef.current = node.id;
                    setSelected(node.id);
                    setText(node.id, event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Tab' && !event.shiftKey) {
                      event.preventDefault();
                      addChild(node.id);
                      return;
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addChild(node.id);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    borderRadius: 8,
                    border: active
                      ? '1px solid hsl(var(--primary))'
                      : '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    padding: '0 10px',
                    font: 'inherit',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  borderRadius: 6,
  padding: '6px 10px',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
};

export function createMindmapDocument(): { content: string; data: MindmapData } {
  const data = emptyMindmap();
  return { content: outlineMindmap(data), data };
}
