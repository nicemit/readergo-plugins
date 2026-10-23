import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  definePlugin,
  PluginRuntimeProvider,
  usePlugin,
  usePluginHost,
  useHistory,
  useInteraction,
  type PluginActionsMap,
} from '@readergo/plugin-sdk/v2';
import { WhiteboardNodeCard } from './WhiteboardNodeCard';
import { WhiteboardToolbar } from './WhiteboardToolbar';

export type WhiteboardNode = {
  id: string;
  x: number;
  y: number;
  content: string;
};

export type WhiteboardState = {
  nodes: Record<string, WhiteboardNode>;
  edges: Record<string, { id: string; from: string; to: string }>;
  viewport: { x: number; y: number; zoom: number };
};

type AddNodePayload = WhiteboardNode | { id: string };

function isFullNodePayload(p: AddNodePayload): p is WhiteboardNode {
  return 'content' in p;
}

function clampZoom(z: number): number {
  if (Number.isNaN(z) || z <= 0) return 1;
  return Math.min(4, Math.max(0.25, z));
}

function newNodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** World-space layout for overlap checks and “place to the right” stacking */
const WB_NODE_BOX = {
  width: 200,
  height: 96,
  gap: 28,
} as const;

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  margin: number,
): boolean {
  return !(
    ax + aw + margin <= bx ||
    bx + bw + margin <= ax ||
    ay + ah + margin <= by ||
    by + bh + margin <= ay
  );
}

function overlapsAnyNode(
  x: number,
  y: number,
  nodes: Record<string, WhiteboardNode>,
  excludeId?: string,
): boolean {
  const { width, height, gap } = WB_NODE_BOX;
  for (const n of Object.values(nodes)) {
    if (excludeId && n.id === excludeId) continue;
    if (rectsOverlap(x, y, width, height, n.x, n.y, width, height, gap)) return true;
  }
  return false;
}

/** Nudge placement until it clears other nodes (structured grid-like steps). */
function resolveNonOverlappingPosition(
  x: number,
  y: number,
  nodes: Record<string, WhiteboardNode>,
  excludeId?: string,
): { x: number; y: number } {
  let cx = x;
  let cy = y;
  const stepX = WB_NODE_BOX.width + WB_NODE_BOX.gap;
  const stepY = (WB_NODE_BOX.height + WB_NODE_BOX.gap) * 0.75;
  for (let i = 0; i < 64; i++) {
    if (!overlapsAnyNode(cx, cy, nodes, excludeId)) return { x: cx, y: cy };
    cx += stepX;
    if (i > 0 && i % 4 === 0) cy += stepY;
  }
  return { x: cx, y: cy };
}

function resolveNewNodeWorldPosition(args: {
  nodes: Record<string, WhiteboardNode>;
  selectedId: string | null;
  lastCreated: { x: number; y: number } | null;
  centerWorld: { x: number; y: number };
  /** Optional seed (e.g. double-click); nudged if it overlaps */
  hintWorld?: { x: number; y: number };
}): { x: number; y: number } {
  const { width, height, gap } = WB_NODE_BOX;
  const { nodes, selectedId, lastCreated, centerWorld, hintWorld } = args;
  let x: number;
  let y: number;

  if (selectedId && nodes[selectedId]) {
    const sel = nodes[selectedId];
    x = sel.x + width + gap;
    y = sel.y;
  } else if (hintWorld) {
    x = hintWorld.x - width / 2;
    y = hintWorld.y - height / 2;
  } else if (lastCreated) {
    x = lastCreated.x + width + gap;
    y = lastCreated.y;
  } else {
    x = centerWorld.x - width / 2;
    y = centerWorld.y - height / 2;
  }

  return resolveNonOverlappingPosition(x, y, nodes);
}

function edgeCurvePath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const curve = Math.min(28, dist * 0.22);
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = midX + nx * curve;
  const cy = midY + ny * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

const EDGE_ANCHOR = { ox: 80, oy: 36 } as const;

function nodeWorldForEdges(
  node: WhiteboardNode,
  dragLive: { id: string; x: number; y: number } | null,
): { x: number; y: number } {
  if (dragLive && dragLive.id === node.id) return { x: dragLive.x, y: dragLive.y };
  return { x: node.x, y: node.y };
}

function isTextInputTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable;
}

function clientToWorld(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  viewport: { x: number; y: number; zoom: number },
): { x: number; y: number } {
  const lx = clientX - canvasRect.left;
  const ly = clientY - canvasRect.top;
  const z = viewport.zoom || 1;
  return {
    x: (lx - viewport.x) / z,
    y: (ly - viewport.y) / z,
  };
}

const initialState: WhiteboardState = {
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
};

const actions: PluginActionsMap<WhiteboardState> = {
  MOVE_NODE: {
    apply: (state: WhiteboardState, payload: { id: string; x: number; y: number }) => {
      const node = state.nodes[payload.id];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [payload.id]: {
            ...node,
            x: payload.x,
            y: payload.y,
          },
        },
      };
    },
    inverse: (payload: { id: string; x: number; y: number }, prevState: WhiteboardState) => {
      const prev = prevState.nodes[payload.id];
      if (!prev) return null;
      return { id: payload.id, x: prev.x, y: prev.y };
    },
  },

  ADD_NODE: {
    apply: (state: WhiteboardState, payload: AddNodePayload) => {
      if (isFullNodePayload(payload)) {
        return {
          ...state,
          nodes: { ...state.nodes, [payload.id]: payload },
        };
      }
      const nextNodes = { ...state.nodes };
      delete nextNodes[payload.id];
      return { ...state, nodes: nextNodes };
    },
    inverse: (payload: AddNodePayload, prevState: WhiteboardState) => {
      if (!isFullNodePayload(payload)) return null;
      if (prevState.nodes[payload.id]) return null;
      return { id: payload.id };
    },
  },

  MOVE_NODES_BATCH: {
    apply: (state: WhiteboardState, payload: { moves: Array<{ id: string; x: number; y: number }> }) => {
      const nextNodes = { ...state.nodes };
      for (const move of payload.moves) {
        const node = nextNodes[move.id];
        if (!node) continue;
        nextNodes[move.id] = { ...node, x: move.x, y: move.y };
      }
      return { ...state, nodes: nextNodes };
    },
    inverse: (payload: { moves: Array<{ id: string; x: number; y: number }> }, prevState: WhiteboardState) => {
      const inverseMoves: Array<{ id: string; x: number; y: number }> = [];
      for (const move of payload.moves) {
        const prev = prevState.nodes[move.id];
        if (!prev) continue;
        inverseMoves.push({ id: move.id, x: prev.x, y: prev.y });
      }
      return inverseMoves.length > 0 ? { moves: inverseMoves } : null;
    },
  },

  DELETE_NODES: {
    apply: (
      state: WhiteboardState,
      payload:
        | { ids: string[] }
        | { deletedNodes: WhiteboardNode[]; deletedEdges: Array<{ id: string; from: string; to: string }> },
    ) => {
      if ('deletedNodes' in payload) {
        const restoredNodes = { ...state.nodes };
        const restoredEdges = { ...state.edges };
        for (const node of payload.deletedNodes) {
          restoredNodes[node.id] = node;
        }
        for (const edge of payload.deletedEdges) {
          restoredEdges[edge.id] = edge;
        }
        return { ...state, nodes: restoredNodes, edges: restoredEdges };
      }

      const ids = new Set(payload.ids);
      if (ids.size === 0) return state;
      const nextNodes = { ...state.nodes };
      for (const id of ids) delete nextNodes[id];
      const nextEdges: WhiteboardState['edges'] = {};
      for (const edge of Object.values(state.edges)) {
        if (ids.has(edge.from) || ids.has(edge.to)) continue;
        nextEdges[edge.id] = edge;
      }
      return { ...state, nodes: nextNodes, edges: nextEdges };
    },
    inverse: (payload: { ids: string[] } | { deletedNodes: WhiteboardNode[] }, prevState: WhiteboardState) => {
      if (!('ids' in payload)) return null;
      const ids = new Set(payload.ids);
      if (ids.size === 0) return null;
      const deletedNodes: WhiteboardNode[] = [];
      const deletedEdges: Array<{ id: string; from: string; to: string }> = [];
      for (const node of Object.values(prevState.nodes)) {
        if (ids.has(node.id)) deletedNodes.push(node);
      }
      for (const edge of Object.values(prevState.edges)) {
        if (ids.has(edge.from) || ids.has(edge.to)) deletedEdges.push(edge);
      }
      return deletedNodes.length > 0 ? { deletedNodes, deletedEdges } : null;
    },
  },

  CONNECT_NODES: {
    apply: (state: WhiteboardState, payload: { from: string; to: string }) => {
      if (payload.from === payload.to) return state;
      if (!state.nodes[payload.from] || !state.nodes[payload.to]) return state;
      const exists = Object.values(state.edges).some(
        (e) =>
          (e.from === payload.from && e.to === payload.to) ||
          (e.from === payload.to && e.to === payload.from),
      );
      if (exists) return state;
      const id = `edge-${payload.from}-${payload.to}`;
      return {
        ...state,
        edges: {
          ...state.edges,
          [id]: { id, from: payload.from, to: payload.to },
        },
      };
    },
    inverse: (payload: { from: string; to: string }, prevState: WhiteboardState) => {
      const existing = Object.values(prevState.edges).find(
        (e) =>
          (e.from === payload.from && e.to === payload.to) ||
          (e.from === payload.to && e.to === payload.from),
      );
      return existing ? null : { id: `edge-${payload.from}-${payload.to}` };
    },
  },

  DISCONNECT_EDGE: {
    apply: (state: WhiteboardState, payload: { id: string } | { edge: { id: string; from: string; to: string } }) => {
      if ('edge' in payload) {
        return { ...state, edges: { ...state.edges, [payload.edge.id]: payload.edge } };
      }
      if (!state.edges[payload.id]) return state;
      const nextEdges = { ...state.edges };
      delete nextEdges[payload.id];
      return { ...state, edges: nextEdges };
    },
    inverse: (payload: { id: string }, prevState: WhiteboardState) => {
      const edge = prevState.edges[payload.id];
      return edge ? { edge } : null;
    },
  },

  SET_NODE_CONTENT: {
    apply: (state: WhiteboardState, payload: { id: string; content: string }) => {
      const node = state.nodes[payload.id];
      if (!node) return state;
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [payload.id]: { ...node, content: payload.content },
        },
      };
    },
    inverse: (payload: { id: string; content: string }, prevState: WhiteboardState) => {
      const prev = prevState.nodes[payload.id];
      if (!prev) return null;
      return { id: payload.id, content: prev.content };
    },
  },

  SET_VIEWPORT: (state: WhiteboardState, viewport: WhiteboardState['viewport']) => ({
    ...state,
    viewport: {
      x: viewport.x,
      y: viewport.y,
      zoom: clampZoom(viewport.zoom),
    },
  }),

  HYDRATE_REPLACE: (_state: WhiteboardState, payload: WhiteboardState) => payload,
};

type HandlersGetter = ReturnType<typeof useInteraction>['getNodeHandlers'];

type RuntimeActions = ReturnType<typeof usePlugin<WhiteboardState, typeof actions>>['actions'];

function WhiteboardNodesLayer({
  getNodeHandlers,
  selectedId,
  setSelectedId,
  runtimeActions,
  onConnectStart,
  onNodeHover,
}: {
  getNodeHandlers: HandlersGetter;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  runtimeActions: RuntimeActions;
  onConnectStart: (nodeId: string, clientX: number, clientY: number) => void;
  onNodeHover: (id: string | null) => void;
}) {
  const { state: nodes } = usePlugin<WhiteboardState, typeof actions, WhiteboardState['nodes']>((s) => s.nodes);
  const { state: viewport } = usePlugin<WhiteboardState, typeof actions, WhiteboardState['viewport']>((s) => s.viewport);

  const onContentCommit = useCallback(
    (id: string, content: string) => {
      runtimeActions.SET_NODE_CONTENT({ id, content });
    },
    [runtimeActions],
  );

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);

  return (
    <>
      {nodeList.map((node) => (
        <WhiteboardNodeCard
          key={node.id}
          node={node}
          zoom={viewport.zoom}
          selected={selectedId === node.id}
          onHoverChange={(hovered) => onNodeHover(hovered ? node.id : null)}
          onPointerDown={(e) => {
            e.stopPropagation();
            setSelectedId(node.id);
            getNodeHandlers(node.id).onPointerDown(e);
          }}
          onConnectStart={onConnectStart}
          onDelete={(id) => {
            runtimeActions.DELETE_NODES({ ids: [id] });
            if (selectedId === id) setSelectedId(null);
          }}
          onContentCommit={onContentCommit}
        />
      ))}
    </>
  );
}

function WhiteboardRuntimeView() {
  const { actions: runtimeActions } = usePlugin<WhiteboardState, typeof actions, null>(() => null);
  const { state: viewport } = usePlugin<WhiteboardState, typeof actions, WhiteboardState['viewport']>(
    (s) => s.viewport,
  );
  const { state: nodes } = usePlugin<WhiteboardState, typeof actions, WhiteboardState['nodes']>((s) => s.nodes);
  const { state: edgesState } = usePlugin<WhiteboardState, typeof actions, WhiteboardState['edges']>((s) => s.edges);
  const { undo, redo } = useHistory<WhiteboardState, typeof actions>();
  const { engine, processHydration, registerInteractionGetter } = usePluginHost<WhiteboardState, typeof actions>();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [dragLive, setDragLive] = useState<{ id: string; x: number; y: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const lastCreatedWorldRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportElRef = useRef<HTMLDivElement>(null);
  const viewportCommittedRef = useRef(viewport);
  viewportCommittedRef.current = viewport;

  const panAccumRef = useRef({ dx: 0, dy: 0 });
  const spaceDownRef = useRef(false);
  const canvasPointerMoveRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
  } | null>(null);

  const syncViewportTransform = useCallback(() => {
    const el = viewportElRef.current;
    if (!el) return;
    const v = viewportCommittedRef.current;
    const p = panAccumRef.current;
    el.style.transform = `translate(${v.x + p.dx}px, ${v.y + p.dy}px) scale(${v.zoom})`;
  }, []);

  useLayoutEffect(() => {
    syncViewportTransform();
  }, [viewport, syncViewportTransform]);

  const paintViewport = useCallback((x: number, y: number, zoom: number) => {
    const el = viewportElRef.current;
    const z = clampZoom(zoom);
    if (el) {
      el.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
    }
  }, []);

  const endPan = useCallback(() => {
    const p = panAccumRef.current;
    if (p.dx === 0 && p.dy === 0) {
      if (canvasRef.current) {
        canvasRef.current.style.cursor = spaceDownRef.current ? 'grab' : '';
      }
      return;
    }
    const v = viewportCommittedRef.current;
    const nx = v.x + p.dx;
    const ny = v.y + p.dy;
    const nz = v.zoom;
    runtimeActions.SET_VIEWPORT({ x: nx, y: ny, zoom: nz });
    panAccumRef.current = { dx: 0, dy: 0 };
    paintViewport(nx, ny, nz);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = spaceDownRef.current ? 'grab' : '';
    }
  }, [runtimeActions, paintViewport]);

  const { getNodeHandlers, getInteractionState } = useInteraction(engine, {
    onDragWorldPosition: setDragLive,
    onCommit: ({ id, startX, startY, currentX, currentY }) => {
      const committed = engine.getState();
      const node = committed.nodes[id];
      if (!node) return;

      const z = committed.viewport.zoom || 1;
      const dx = (currentX - startX) / z;
      const dy = (currentY - startY) / z;
      runtimeActions.MOVE_NODE({ id, x: node.x + dx, y: node.y + dy });
      processHydration();
    },
  });

  useEffect(() => {
    registerInteractionGetter(getInteractionState);
  }, [getInteractionState, registerInteractionGetter]);

  useEffect(() => {
    if (selectedId && nodes[selectedId] === undefined) {
      setSelectedId(null);
    }
  }, [nodes, selectedId]);

  const addNodeResolved = useCallback(
    (hintWorld?: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const v = viewportCommittedRef.current;
      const p = panAccumRef.current;
      const effective = { x: v.x + p.dx, y: v.y + p.dy, zoom: v.zoom };
      const centerWorld = clientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, effective);
      const committed = engine.getState();
      const { x, y } = resolveNewNodeWorldPosition({
        nodes: committed.nodes,
        selectedId,
        lastCreated: lastCreatedWorldRef.current,
        centerWorld,
        hintWorld,
      });
      const id = newNodeId();
      runtimeActions.ADD_NODE({ id, x, y, content: 'New note' });
      lastCreatedWorldRef.current = { x, y };
      setSelectedId(id);
    },
    [engine, runtimeActions, selectedId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        spaceDownRef.current = true;
        if (canvasRef.current && !canvasPointerMoveRef.current) {
          canvasRef.current.style.cursor = 'grab';
        }
      }

      if (event.key === 'n' || event.key === 'N') {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        addNodeResolved();
      }

      if (event.key === 'Enter') {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        addNodeResolved();
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedId) return;
        event.preventDefault();
        runtimeActions.DELETE_NODES({ ids: [selectedId] });
        setSelectedId(null);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceDownRef.current = false;
        if (canvasRef.current && !canvasPointerMoveRef.current) {
          canvasRef.current.style.cursor = '';
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [runtimeActions, selectedId, addNodeResolved]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier) return;
      const key = event.key.toLowerCase();
      if (key !== 'z') return;
      if (isTextInputTarget(event.target)) return;

      event.preventDefault();
      if (event.shiftKey) {
        redo();
        processHydration();
      } else {
        undo();
        processHydration();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, processHydration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      if (!canvas.contains(event.target as Node)) return;
      if (isTextInputTarget(event.target)) return;
      event.preventDefault();
      const v = viewportCommittedRef.current;
      const p = panAccumRef.current;
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      const nz = clampZoom(v.zoom * factor);
      if (nz === v.zoom) return;
      const rect = canvas.getBoundingClientRect();
      const lx = event.clientX - rect.left;
      const ly = event.clientY - rect.top;
      const cx = v.x + p.dx;
      const cy = v.y + p.dy;
      // Keep world-point under cursor stable across zoom changes.
      const wx = (lx - cx) / v.zoom;
      const wy = (ly - cy) / v.zoom;
      const nx = lx - wx * nz;
      const ny = ly - wy * nz;
      runtimeActions.SET_VIEWPORT({ x: nx, y: ny, zoom: nz });
      panAccumRef.current = { dx: 0, dy: 0 };
      paintViewport(nx, ny, nz);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [runtimeActions, paintViewport]);

  const handleUndo = useCallback(() => {
    undo();
    processHydration();
  }, [undo, processHydration]);

  const handleRedo = useCallback(() => {
    redo();
    processHydration();
  }, [redo, processHydration]);

  const handleAddNodeToolbar = useCallback(() => {
    addNodeResolved();
  }, [addNodeResolved]);

  const onCanvasPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const sess = canvasPointerMoveRef.current;
      if (!sess || event.pointerId !== sess.pointerId) return;
      panAccumRef.current = {
        dx: event.clientX - sess.originX,
        dy: event.clientY - sess.originY,
      };
      syncViewportTransform();
    },
    [syncViewportTransform],
  );

  const onCanvasPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const sess = canvasPointerMoveRef.current;
      if (!sess || event.pointerId !== sess.pointerId) return;
      canvasRef.current?.releasePointerCapture(event.pointerId);
      canvasPointerMoveRef.current = null;
      endPan();
    },
    [endPan],
  );

  const handleConnectStart = useCallback((fromId: string, clientX: number, clientY: number) => {
    setConnecting({ fromId, x: clientX, y: clientY });
  }, []);

  const connectingFromRef = useRef<string | null>(null);
  useEffect(() => {
    connectingFromRef.current = connecting?.fromId ?? null;
  }, [connecting?.fromId]);

  useEffect(() => {
    if (!connecting?.fromId) return;
    const fromId = connecting.fromId;

    const onMove = (event: globalThis.PointerEvent) => {
      setConnecting((prev) =>
        prev && prev.fromId === fromId
          ? { ...prev, x: event.clientX, y: event.clientY }
          : prev,
      );
    };

    const onUp = (event: globalThis.PointerEvent) => {
      const activeFrom = connectingFromRef.current;
      if (!activeFrom) {
        setConnecting(null);
        return;
      }

      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      let toId = target?.closest('[data-whiteboard-node-id]')?.getAttribute('data-whiteboard-node-id');

      // Fat-finger fallback: nearest node center in screen space within 48px.
      if (!toId && canvasRef.current) {
        const cards = canvasRef.current.querySelectorAll<HTMLElement>('[data-whiteboard-node-id]');
        let best: string | null = null;
        let bestDist = 48;
        cards.forEach((el) => {
          const id = el.getAttribute('data-whiteboard-node-id');
          if (!id || id === activeFrom) return;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const d = Math.hypot(event.clientX - cx, event.clientY - cy);
          if (d < bestDist) {
            bestDist = d;
            best = id;
          }
        });
        toId = best;
      }

      if (toId && toId !== activeFrom) {
        runtimeActions.CONNECT_NODES({ from: activeFrom, to: toId });
      }
      setConnecting(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // Restart listeners only when a new connect session starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting?.fromId, runtimeActions]);

  const handleCanvasPointerDownPatched = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-whiteboard-node]')) {
        return;
      }

      const shouldPan =
        event.button === 1 ||
        (event.button === 0 && spaceDownRef.current) ||
        event.pointerType === 'touch' ||
        event.pointerType === 'pen';

      if (shouldPan) {
        event.preventDefault();
        canvasPointerMoveRef.current = {
          pointerId: event.pointerId,
          originX: event.clientX,
          originY: event.clientY,
        };
        panAccumRef.current = { dx: 0, dy: 0 };
        try {
          canvasRef.current?.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing';
        }
        return;
      }

      if (event.button === 0) {
        setSelectedId(null);
      }
    },
    [],
  );

  const handleCanvasDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-whiteboard-node]')) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const v = viewportCommittedRef.current;
      const p = panAccumRef.current;
      const effective = { x: v.x + p.dx, y: v.y + p.dy, zoom: v.zoom };
      const hint = clientToWorld(event.clientX, event.clientY, rect, effective);
      addNodeResolved(selectedId ? undefined : hint);
    },
    [addNodeResolved, selectedId],
  );

  const handleZoomIn = useCallback(() => {
    const v = viewportCommittedRef.current;
    const p = panAccumRef.current;
    const nx = v.x + p.dx;
    const ny = v.y + p.dy;
    const nz = clampZoom(v.zoom * 1.15);
    runtimeActions.SET_VIEWPORT({ x: nx, y: ny, zoom: nz });
    panAccumRef.current = { dx: 0, dy: 0 };
    paintViewport(nx, ny, nz);
  }, [runtimeActions, paintViewport]);

  const handleZoomOut = useCallback(() => {
    const v = viewportCommittedRef.current;
    const p = panAccumRef.current;
    const nx = v.x + p.dx;
    const ny = v.y + p.dy;
    const nz = clampZoom(v.zoom / 1.15);
    runtimeActions.SET_VIEWPORT({ x: nx, y: ny, zoom: nz });
    panAccumRef.current = { dx: 0, dy: 0 };
    paintViewport(nx, ny, nz);
  }, [runtimeActions, paintViewport]);

  const handleResetView = useCallback(() => {
    panAccumRef.current = { dx: 0, dy: 0 };
    runtimeActions.SET_VIEWPORT({ x: 0, y: 0, zoom: 1 });
    paintViewport(0, 0, 1);
  }, [runtimeActions, paintViewport]);

  const nodeCount = Object.keys(nodes).length;
  const zoomPercent = Math.round(viewport.zoom * 100);
  const edges = Object.values(edgesState || {});

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-950">
      <WhiteboardToolbar
        onAddNode={handleAddNodeToolbar}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        zoomPercent={zoomPercent}
      />
      <div
        ref={canvasRef}
        role="application"
        aria-label="Whiteboard canvas"
        className="relative min-h-0 flex-1 cursor-default overflow-hidden bg-slate-950 touch-none"
        style={{
          touchAction: 'none',
          backgroundImage: [
            'radial-gradient(circle at center, rgba(148, 163, 184, 0.09) 1px, transparent 1px)',
            'linear-gradient(to right, rgba(148, 163, 184, 0.04) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(148, 163, 184, 0.04) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '24px 24px, 40px 40px, 40px 40px',
          backgroundPosition: '0 0, 0 0, 0 0',
        }}
        onPointerDown={handleCanvasPointerDownPatched}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onDoubleClick={handleCanvasDoubleClick}
      >
        <div
          ref={viewportElRef}
          className="pointer-events-auto absolute inset-0"
          style={{ transformOrigin: '0 0' }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {edges.map((edge) => {
              const from = nodes[edge.from];
              const to = nodes[edge.to];
              if (!from || !to) return null;
              const fw = nodeWorldForEdges(from, dragLive);
              const tw = nodeWorldForEdges(to, dragLive);
              const x1 = fw.x + EDGE_ANCHOR.ox;
              const y1 = fw.y + EDGE_ANCHOR.oy;
              const x2 = tw.x + EDGE_ANCHOR.ox;
              const y2 = tw.y + EDGE_ANCHOR.oy;
              const d = edgeCurvePath(x1, y1, x2, y2);
              const touchesSelected =
                !!selectedId && (edge.from === selectedId || edge.to === selectedId);
              const touchesHovered =
                !!hoveredNodeId && (edge.from === hoveredNodeId || edge.to === hoveredNodeId);
              const emphasized = touchesSelected || touchesHovered;
              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={emphasized ? 'rgba(56, 189, 248, 0.88)' : 'rgba(56, 189, 248, 0.32)'}
                  strokeWidth={emphasized ? 1.75 : 1.1}
                  strokeLinecap="round"
                />
              );
            })}
            {connecting && (() => {
              const from = nodes[connecting.fromId];
              const canvas = canvasRef.current;
              if (!from || !canvas) return null;
              const v = viewportCommittedRef.current;
              const p = panAccumRef.current;
              const effective = { x: v.x + p.dx, y: v.y + p.dy, zoom: v.zoom };
              const rect = canvas.getBoundingClientRect();
              const endW = clientToWorld(connecting.x, connecting.y, rect, effective);
              const fw = nodeWorldForEdges(from, dragLive);
              const x1 = fw.x + EDGE_ANCHOR.ox;
              const y1 = fw.y + EDGE_ANCHOR.oy;
              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={endW.x}
                  y2={endW.y}
                  stroke="rgba(14,165,233,0.85)"
                  strokeWidth={1.35}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>
          <WhiteboardNodesLayer
            getNodeHandlers={getNodeHandlers}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            runtimeActions={runtimeActions}
            onConnectStart={handleConnectStart}
            onNodeHover={setHoveredNodeId}
          />
        </div>
        {nodeCount === 0 ? (
          <p className="pointer-events-none absolute left-1/2 top-1/2 z-[1] max-w-sm -translate-x-1/2 -translate-y-1/2 px-4 text-center text-sm text-slate-500">
            Tap <span className="text-sky-300">Add</span> for a card, or double-tap empty space.
            Select a card and drag the blue port to link. Drag empty space to pan.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const WhiteboardPlugin = definePlugin({
  id: 'whiteboard',
  initialState,
  actions,
  render: WhiteboardRuntimeView,
});

export function WhiteboardView() {
  const Render = WhiteboardPlugin.render;
  return (
    <PluginRuntimeProvider plugin={WhiteboardPlugin}>
      <Render />
    </PluginRuntimeProvider>
  );
}
