import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import {
  Plus,
  CornerDownRight,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Palette,
  Layout,
  Download,
  Copy,
  FileText,
  HelpCircle,
  X,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  MINDMAP_ROOT_ID,
  BRANCH_PALETTE,
  childrenOf,
  emptyMindmap,
  getBranchColor,
  normalizeMindmap,
  outlineMindmap,
  parseMindmapOutline,
  type MindNode,
  type MindmapData,
  type MindmapLayout,
} from './types';

// Dimensions
const ROOT_W = 200;
const ROOT_H = 44;
const NODE_W = 180;
const NODE_H = 38;
const GAP_X = 68;
const GAP_Y = 16;
const GAP_Y_VERTICAL = 48;
const GAP_X_VERTICAL = 24;

type Point = { x: number; y: number; width: number; height: number; direction?: 'right' | 'left' | 'down' };

type LayoutEdge = {
  id: string;
  d: string;
  color: string;
};

type NodePlacement = Point & {
  node: MindNode;
  color: string;
  isRoot: boolean;
  hasChildren: boolean;
  childCount: number;
  direction: 'right' | 'left' | 'down';
};

function visibleChildrenOf(data: MindmapData, id: string): MindNode[] {
  const node = data.nodes[id];
  if (node?.collapsed) return [];
  return childrenOf(data, id);
}

function countAllDescendants(data: MindmapData, id: string): number {
  const kids = childrenOf(data, id);
  return kids.reduce((sum, kid) => sum + 1 + countAllDescendants(data, kid.id), 0);
}

function subtreeHeight(data: MindmapData, id: string, memo: Record<string, number>): number {
  if (memo[id] !== undefined) return memo[id];
  const node = data.nodes[id];
  const h = id === MINDMAP_ROOT_ID ? ROOT_H : NODE_H;
  if (!node || node.collapsed) {
    memo[id] = h;
    return h;
  }
  const kids = childrenOf(data, id);
  if (kids.length === 0) {
    memo[id] = h;
    return h;
  }
  const height = kids.reduce((sum, kid, index) => {
    return sum + subtreeHeight(data, kid.id, memo) + (index > 0 ? GAP_Y : 0);
  }, 0);
  memo[id] = Math.max(h, height);
  return memo[id];
}

function subtreeWidthVertical(data: MindmapData, id: string, memo: Record<string, number>): number {
  if (memo[id] !== undefined) return memo[id];
  const node = data.nodes[id];
  const w = id === MINDMAP_ROOT_ID ? ROOT_W : NODE_W;
  if (!node || node.collapsed) {
    memo[id] = w;
    return w;
  }
  const kids = childrenOf(data, id);
  if (kids.length === 0) {
    memo[id] = w;
    return w;
  }
  const width = kids.reduce((sum, kid, index) => {
    return sum + subtreeWidthVertical(data, kid.id, memo) + (index > 0 ? GAP_X_VERTICAL : 0);
  }, 0);
  memo[id] = Math.max(w, width);
  return memo[id];
}

/** Compute placements & curved bezier edges based on layout mode */
function computeLayout(data: MindmapData): {
  placements: Record<string, NodePlacement>;
  edges: LayoutEdge[];
} {
  const placements: Record<string, NodePlacement> = {};
  const edges: LayoutEdge[] = [];
  const root = data.nodes[MINDMAP_ROOT_ID];
  if (!root) return { placements, edges };

  const layout: MindmapLayout = data.layout || 'balanced';

  // 1. BALANCED (Classic bi-directional mindmap)
  if (layout === 'balanced') {
    const heights: Record<string, number> = {};
    const rootKids = visibleChildrenOf(data, MINDMAP_ROOT_ID);
    const rightKids = rootKids.filter((_, idx) => idx % 2 === 0);
    const leftKids = rootKids.filter((_, idx) => idx % 2 === 1);

    placements[MINDMAP_ROOT_ID] = {
      x: -ROOT_W / 2,
      y: -ROOT_H / 2,
      width: ROOT_W,
      height: ROOT_H,
      node: root,
      color: getBranchColor(MINDMAP_ROOT_ID, data),
      isRoot: true,
      hasChildren: childrenOf(data, MINDMAP_ROOT_ID).length > 0,
      childCount: countAllDescendants(data, MINDMAP_ROOT_ID),
      direction: 'right',
    };

    // Right subtree
    const placeRight = (id: string, x: number, centerY: number) => {
      const node = data.nodes[id];
      if (!node) return;
      const color = getBranchColor(id, data);
      const allKids = childrenOf(data, id);
      const isCollapsed = Boolean(node.collapsed);
      placements[id] = {
        x,
        y: centerY - NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
        node,
        color,
        isRoot: false,
        hasChildren: allKids.length > 0,
        childCount: countAllDescendants(data, id),
        direction: 'right',
      };

      if (isCollapsed) return;
      const kids = allKids;
      if (kids.length === 0) return;
      const stack = kids.reduce((sum, kid, idx) => sum + subtreeHeight(data, kid.id, heights) + (idx > 0 ? GAP_Y : 0), 0);
      let cursor = centerY - stack / 2;
      for (const kid of kids) {
        const h = subtreeHeight(data, kid.id, heights);
        const childCenterY = cursor + h / 2;
        placeRight(kid.id, x + NODE_W + GAP_X, childCenterY);
        cursor += h + GAP_Y;

        // Edge
        const x1 = x + NODE_W;
        const y1 = centerY;
        const x2 = x + NODE_W + GAP_X;
        const y2 = childCenterY;
        const dx = GAP_X * 0.55;
        edges.push({
          id: kid.id,
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          color: getBranchColor(kid.id, data),
        });
      }
    };

    // Left subtree
    const placeLeft = (id: string, x: number, centerY: number) => {
      const node = data.nodes[id];
      if (!node) return;
      const color = getBranchColor(id, data);
      const allKids = childrenOf(data, id);
      const isCollapsed = Boolean(node.collapsed);
      placements[id] = {
        x: x - NODE_W,
        y: centerY - NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
        node,
        color,
        isRoot: false,
        hasChildren: allKids.length > 0,
        childCount: countAllDescendants(data, id),
        direction: 'left',
      };

      if (isCollapsed) return;
      const kids = allKids;
      if (kids.length === 0) return;
      const stack = kids.reduce((sum, kid, idx) => sum + subtreeHeight(data, kid.id, heights) + (idx > 0 ? GAP_Y : 0), 0);
      let cursor = centerY - stack / 2;
      for (const kid of kids) {
        const h = subtreeHeight(data, kid.id, heights);
        const childCenterY = cursor + h / 2;
        placeLeft(kid.id, x - NODE_W - GAP_X, childCenterY);
        cursor += h + GAP_Y;

        // Edge
        const x1 = x - NODE_W;
        const y1 = centerY;
        const x2 = x - NODE_W - GAP_X;
        const y2 = childCenterY;
        const dx = GAP_X * 0.55;
        edges.push({
          id: kid.id,
          d: `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`,
          color: getBranchColor(kid.id, data),
        });
      }
    };

    // Populate Right Branches
    if (rightKids.length > 0) {
      const rightStack = rightKids.reduce(
        (sum, kid, idx) => sum + subtreeHeight(data, kid.id, heights) + (idx > 0 ? GAP_Y : 0),
        0,
      );
      let rCursor = -rightStack / 2;
      for (const kid of rightKids) {
        const h = subtreeHeight(data, kid.id, heights);
        const childCenterY = rCursor + h / 2;
        placeRight(kid.id, ROOT_W / 2 + GAP_X, childCenterY);
        rCursor += h + GAP_Y;

        // Root to Right Edge
        const x1 = ROOT_W / 2;
        const y1 = 0;
        const x2 = ROOT_W / 2 + GAP_X;
        const y2 = childCenterY;
        const dx = GAP_X * 0.55;
        edges.push({
          id: kid.id,
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          color: getBranchColor(kid.id, data),
        });
      }
    }

    // Populate Left Branches
    if (leftKids.length > 0) {
      const leftStack = leftKids.reduce(
        (sum, kid, idx) => sum + subtreeHeight(data, kid.id, heights) + (idx > 0 ? GAP_Y : 0),
        0,
      );
      let lCursor = -leftStack / 2;
      for (const kid of leftKids) {
        const h = subtreeHeight(data, kid.id, heights);
        const childCenterY = lCursor + h / 2;
        placeLeft(kid.id, -ROOT_W / 2 - GAP_X, childCenterY);
        lCursor += h + GAP_Y;

        // Root to Left Edge
        const x1 = -ROOT_W / 2;
        const y1 = 0;
        const x2 = -ROOT_W / 2 - GAP_X;
        const y2 = childCenterY;
        const dx = GAP_X * 0.55;
        edges.push({
          id: kid.id,
          d: `M ${x1} ${y1} C ${x1 - dx} ${y1}, ${x2 + dx} ${y2}, ${x2} ${y2}`,
          color: getBranchColor(kid.id, data),
        });
      }
    }

    return { placements, edges };
  }

  // 2. HORIZONTAL RIGHT
  if (layout === 'right') {
    const heights: Record<string, number> = {};
    placements[MINDMAP_ROOT_ID] = {
      x: 0,
      y: -ROOT_H / 2,
      width: ROOT_W,
      height: ROOT_H,
      node: root,
      color: getBranchColor(MINDMAP_ROOT_ID, data),
      isRoot: true,
      hasChildren: childrenOf(data, MINDMAP_ROOT_ID).length > 0,
      childCount: countAllDescendants(data, MINDMAP_ROOT_ID),
      direction: 'right',
    };

    const place = (id: string, x: number, centerY: number) => {
      const node = data.nodes[id];
      if (!node) return;
      const isR = id === MINDMAP_ROOT_ID;
      const w = isR ? ROOT_W : NODE_W;
      const h = isR ? ROOT_H : NODE_H;
      const color = getBranchColor(id, data);
      const allKids = childrenOf(data, id);
      const isCollapsed = Boolean(node.collapsed);

      placements[id] = {
        x,
        y: centerY - h / 2,
        width: w,
        height: h,
        node,
        color,
        isRoot: isR,
        hasChildren: allKids.length > 0,
        childCount: countAllDescendants(data, id),
        direction: 'right',
      };

      if (isCollapsed) return;
      const kids = allKids;
      if (kids.length === 0) return;
      const stack = kids.reduce((sum, kid, idx) => sum + subtreeHeight(data, kid.id, heights) + (idx > 0 ? GAP_Y : 0), 0);
      let cursor = centerY - stack / 2;
      for (const kid of kids) {
        const kidH = subtreeHeight(data, kid.id, heights);
        const childCenterY = cursor + kidH / 2;
        place(kid.id, x + w + GAP_X, childCenterY);
        cursor += kidH + GAP_Y;

        // Edge
        const x1 = x + w;
        const y1 = centerY;
        const x2 = x + w + GAP_X;
        const y2 = childCenterY;
        const dx = GAP_X * 0.55;
        edges.push({
          id: kid.id,
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          color: getBranchColor(kid.id, data),
        });
      }
    };

    const rootStack = subtreeHeight(data, MINDMAP_ROOT_ID, heights);
    place(MINDMAP_ROOT_ID, 0, 0);
    return { placements, edges };
  }

  // 3. VERTICAL DOWN (Org Chart / Top-Down Tree)
  const widths: Record<string, number> = {};
  placements[MINDMAP_ROOT_ID] = {
    x: -ROOT_W / 2,
    y: 0,
    width: ROOT_W,
    height: ROOT_H,
    node: root,
    color: getBranchColor(MINDMAP_ROOT_ID, data),
    isRoot: true,
    hasChildren: childrenOf(data, MINDMAP_ROOT_ID).length > 0,
    childCount: countAllDescendants(data, MINDMAP_ROOT_ID),
    direction: 'down',
  };

  const placeVertical = (id: string, centerX: number, y: number) => {
    const node = data.nodes[id];
    if (!node) return;
    const isR = id === MINDMAP_ROOT_ID;
    const w = isR ? ROOT_W : NODE_W;
    const h = isR ? ROOT_H : NODE_H;
    const color = getBranchColor(id, data);
    const allKids = childrenOf(data, id);
    const isCollapsed = Boolean(node.collapsed);

    placements[id] = {
      x: centerX - w / 2,
      y,
      width: w,
      height: h,
      node,
      color,
      isRoot: isR,
      hasChildren: allKids.length > 0,
      childCount: countAllDescendants(data, id),
      direction: 'down',
    };

    if (isCollapsed) return;
    const kids = allKids;
    if (kids.length === 0) return;
    const stack = kids.reduce(
      (sum, kid, idx) => sum + subtreeWidthVertical(data, kid.id, widths) + (idx > 0 ? GAP_X_VERTICAL : 0),
      0,
    );
    let cursor = centerX - stack / 2;
    for (const kid of kids) {
      const kidW = subtreeWidthVertical(data, kid.id, widths);
      const childCenterX = cursor + kidW / 2;
      placeVertical(kid.id, childCenterX, y + h + GAP_Y_VERTICAL);
      cursor += kidW + GAP_X_VERTICAL;

      // Vertical Edge
      const x1 = centerX;
      const y1 = y + h;
      const x2 = childCenterX;
      const y2 = y + h + GAP_Y_VERTICAL;
      const dy = GAP_Y_VERTICAL * 0.55;
      edges.push({
        id: kid.id,
        d: `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`,
        color: getBranchColor(kid.id, data),
      });
    }
  };

  placeVertical(MINDMAP_ROOT_ID, 0, 0);
  return { placements, edges };
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
  const note = props.currentNote as { id?: string; data?: unknown; content?: string; title?: string } | null | undefined;
  const [data, setData] = useState<MindmapData>(() => normalizeMindmap(note?.data, note?.content));
  const [selected, setSelected] = useState(MINDMAP_ROOT_ID);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo / Redo stacks
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef<MindmapData[]>([]);
  const redoStackRef = useRef<MindmapData[]>([]);

  // Clipboard for copy/paste subtree
  const clipboardRef = useRef<{ rootId: string; nodes: Record<string, MindNode> } | null>(null);

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

  // Show temporary toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((cur) => (cur === msg ? null : cur)), 2500);
  };

  useEffect(() => {
    const next = normalizeMindmap(note?.data, note?.content);
    const snap = JSON.stringify(next);
    if (snap === incomingRef.current) return;
    incomingRef.current = snap;
    dataRef.current = next;
    setData(next);
  }, [note?.id, note?.data, note?.content]);

  useEffect(() => {
    focusRef.current = MINDMAP_ROOT_ID;
    setSelected(MINDMAP_ROOT_ID);
  }, [note?.id]);

  // Center view on mount
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !note?.id) return;
    setView({
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
      zoom: 1,
    });
  }, [note?.id]);

  // Wheel zoom
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setView((current) => {
        const nextZoom = Math.min(2.2, Math.max(0.35, current.zoom * (event.deltaY < 0 ? 1.09 : 0.91)));
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

  const { placements, edges } = useMemo(() => computeLayout(data), [data]);
  const selectedNode = data.nodes[selected] ?? data.nodes[MINDMAP_ROOT_ID];

  const commit = (next: MindmapData, recordHistory = true) => {
    if (recordHistory) {
      undoStackRef.current.push(dataRef.current);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
    }
    const snap = JSON.stringify(next);
    incomingRef.current = snap;
    dataRef.current = next;
    setData(next);
    onDataChangeRef.current?.(next);
    onChangeRef.current?.(outlineMindmap(next));
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(dataRef.current);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    commit(prev, false);
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(dataRef.current);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    commit(next, false);
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
      ...current,
      nodes: {
        ...current.nodes,
        // Auto-unfold parent if collapsed
        ...(current.nodes[parentId]?.collapsed ? { [parentId]: { ...current.nodes[parentId], collapsed: false } } : {}),
        [id]: { id, parentId, text: '', order },
      },
    });
    focusNode(id);
  };

  const addSiblingOf = (id: string, above = false) => {
    const current = dataRef.current;
    const node = current.nodes[id];
    if (!node || node.parentId === null) {
      addChild(MINDMAP_ROOT_ID);
      return;
    }
    const newSiblingId = newId();
    const parentId = node.parentId;
    const siblings = childrenOf(current, parentId);
    const baseOrder = node.order;

    const updatedNodes: Record<string, MindNode> = { ...current.nodes };
    if (above) {
      for (const sib of siblings) {
        if (sib.order >= baseOrder) {
          updatedNodes[sib.id] = { ...sib, order: sib.order + 1 };
        }
      }
      updatedNodes[newSiblingId] = { id: newSiblingId, parentId, text: '', order: baseOrder };
    } else {
      for (const sib of siblings) {
        if (sib.order > baseOrder) {
          updatedNodes[sib.id] = { ...sib, order: sib.order + 1 };
        }
      }
      updatedNodes[newSiblingId] = { id: newSiblingId, parentId, text: '', order: baseOrder + 1 };
    }

    commit({
      ...current,
      nodes: updatedNodes,
    });
    focusNode(newSiblingId);
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
    commit({ ...current, nodes });
    setSelected(node.parentId ?? MINDMAP_ROOT_ID);
  };

  const toggleCollapse = (id: string) => {
    const current = dataRef.current;
    const node = current.nodes[id];
    if (!node || childrenOf(current, id).length === 0) return;
    commit({
      ...current,
      nodes: {
        ...current.nodes,
        [id]: { ...node, collapsed: !node.collapsed },
      },
    });
  };

  const setText = (id: string, text: string) => {
    const current = dataRef.current;
    const node = current.nodes[id];
    if (!node || node.text === text) return;
    commit({
      ...current,
      nodes: {
        ...current.nodes,
        [id]: { ...node, text },
      },
    });
  };

  const setNodeColor = (color: string) => {
    if (!selectedNode || selectedNode.id === MINDMAP_ROOT_ID) return;
    const current = dataRef.current;
    commit({
      ...current,
      nodes: {
        ...current.nodes,
        [selectedNode.id]: { ...selectedNode, color },
      },
    });
    setColorMenuOpen(false);
  };

  const setLayout = (layout: MindmapLayout) => {
    const current = dataRef.current;
    commit({
      ...current,
      layout,
    });
  };

  const copyBranch = () => {
    if (!selectedNode) return;
    const current = dataRef.current;
    const subIds = [selectedNode.id, ...descendants(current, selectedNode.id)];
    const nodesMap: Record<string, MindNode> = {};
    for (const id of subIds) {
      if (current.nodes[id]) nodesMap[id] = { ...current.nodes[id] };
    }
    clipboardRef.current = { rootId: selectedNode.id, nodes: nodesMap };
    showToast('Branch copied to clipboard');
  };

  const pasteBranch = () => {
    const clip = clipboardRef.current;
    if (!clip || !selectedNode) return;
    const current = dataRef.current;
    const idMap: Record<string, string> = {};
    const newNodes: Record<string, MindNode> = { ...current.nodes };

    for (const oldId of Object.keys(clip.nodes)) {
      idMap[oldId] = newId();
    }

    for (const [oldId, node] of Object.entries(clip.nodes)) {
      const freshId = idMap[oldId];
      const parentId = oldId === clip.rootId ? selectedNode.id : idMap[node.parentId!];
      newNodes[freshId] = {
        ...node,
        id: freshId,
        parentId,
      };
    }

    commit({ ...current, nodes: newNodes });
    showToast('Branch pasted');
  };

  const centerOnRoot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setView({
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
      zoom: 1,
    });
  };

  const copyMarkdownOutline = () => {
    const outline = outlineMindmap(data);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(outline);
      showToast('Markdown outline copied to clipboard');
    }
  };

  const handleImportOutline = () => {
    if (!importText.trim()) return;
    const parsed = parseMindmapOutline(importText);
    commit({ ...parsed, layout: data.layout || 'balanced' });
    setImportModalOpen(false);
    setImportText('');
    showToast('Mindmap generated from outline');
    centerOnRoot();
  };

  const exportAsSvg = () => {
    if (!canvasRef.current) return;
    // Compute bounding box
    const pts = Object.values(placements);
    if (pts.length === 0) return;
    const minX = Math.min(...pts.map((p) => p.x)) - 60;
    const minY = Math.min(...pts.map((p) => p.y)) - 60;
    const maxX = Math.max(...pts.map((p) => p.x + p.width)) + 60;
    const maxY = Math.max(...pts.map((p) => p.y + p.height)) + 60;
    const w = maxX - minX;
    const h = maxY - minY;

    let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`;
    svgStr += `<style>text{font-family:system-ui,-apple-system,sans-serif;}</style>`;
    svgStr += `<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="#0f172a" />`;

    // Edges
    for (const e of edges) {
      svgStr += `<path d="${e.d}" fill="none" stroke="${e.color || '#64748b'}" stroke-width="2" stroke-linecap="round" />`;
    }

    // Nodes
    for (const p of pts) {
      const rx = 10;
      const fill = p.isRoot ? '#1e293b' : '#1e293b';
      const stroke = p.color || '#3b82f6';
      svgStr += `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />`;
      const textX = p.x + 12;
      const textY = p.y + p.height / 2 + 5;
      const sanitized = p.node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || 'Node';
      svgStr += `<text x="${textX}" y="${textY}" fill="#f8fafc" font-size="${p.isRoot ? 15 : 13}" font-weight="${p.isRoot ? 'bold' : 'normal'}">${sanitized}</text>`;
    }
    svgStr += `</svg>`;

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note?.title || 'mindmap'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported SVG graphic');
  };

  // Keyboard navigation when focusing canvas
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // Check if an input is currently being typed in
    const isTyping = document.activeElement instanceof HTMLInputElement;

    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if ((e.key === 'Z' || e.key === 'y') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRedo();
      return;
    }
    if (e.key === 'c' && (e.ctrlKey || e.metaKey) && !isTyping) {
      e.preventDefault();
      copyBranch();
      return;
    }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey) && !isTyping) {
      e.preventDefault();
      pasteBranch();
      return;
    }
    if (e.key === '?' && !isTyping) {
      e.preventDefault();
      setShortcutsOpen((cur) => !cur);
      return;
    }
    if ((e.key === '0' || e.key === 'f') && !isTyping) {
      e.preventDefault();
      centerOnRoot();
      return;
    }

    if (!isTyping) {
      if (e.key === 'Tab') {
        e.preventDefault();
        addChild(focusRef.current);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        addSiblingOf(focusRef.current, e.shiftKey);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        const input = canvasRef.current?.querySelector<HTMLInputElement>(`[data-mind-id="${selected}"]`);
        input?.focus();
        input?.select();
        return;
      }

      // Arrow navigation
      const current = dataRef.current;
      const activePlacement = placements[selected];
      if (!activePlacement) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedNode?.parentId) {
          const siblings = childrenOf(current, selectedNode.parentId);
          const idx = siblings.findIndex((s) => s.id === selected);
          if (idx > 0) focusNode(siblings[idx - 1].id);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedNode?.parentId) {
          const siblings = childrenOf(current, selectedNode.parentId);
          const idx = siblings.findIndex((s) => s.id === selected);
          if (idx >= 0 && idx < siblings.length - 1) focusNode(siblings[idx + 1].id);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (selected === MINDMAP_ROOT_ID) {
          const rootKids = visibleChildrenOf(current, MINDMAP_ROOT_ID);
          const rightKids = rootKids.filter((_, idx) => idx % 2 === 0);
          if (rightKids[0]) focusNode(rightKids[0].id);
        } else if (activePlacement.direction === 'right') {
          const kids = visibleChildrenOf(current, selected);
          if (kids[0]) focusNode(kids[0].id);
        } else if (activePlacement.direction === 'left') {
          if (selectedNode?.parentId) focusNode(selectedNode.parentId);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selected === MINDMAP_ROOT_ID) {
          const rootKids = visibleChildrenOf(current, MINDMAP_ROOT_ID);
          const leftKids = rootKids.filter((_, idx) => idx % 2 === 1);
          if (leftKids[0]) focusNode(leftKids[0].id);
        } else if (activePlacement.direction === 'left') {
          const kids = visibleChildrenOf(current, selected);
          if (kids[0]) focusNode(kids[0].id);
        } else if (activePlacement.direction === 'right') {
          if (selectedNode?.parentId) focusNode(selectedNode.parentId);
        }
        return;
      }
    }
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

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        outline: 'none',
        background: 'hsl(var(--background))',
        userSelect: 'none',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--primary))',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Check size={14} color="hsl(var(--primary))" />
          {toastMessage}
        </div>
      )}

      {/* Top Floating Command Bar */}
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          top: 14,
          left: 14,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          background: 'rgba(23, 23, 23, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid hsl(var(--border))',
          borderRadius: 10,
          padding: '4px 6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <button
          type="button"
          style={cmdBtnStyle}
          onClick={() => addChild(focusRef.current)}
          title="Add Child Node (Tab)"
        >
          <Plus size={14} />
          <span>Child</span>
          <span style={badgeStyle}>Tab</span>
        </button>

        <button
          type="button"
          style={cmdBtnStyle}
          onClick={() => addSiblingOf(focusRef.current)}
          title="Add Sibling Node (Enter)"
        >
          <CornerDownRight size={14} />
          <span>Sibling</span>
          <span style={badgeStyle}>↵</span>
        </button>

        <div style={separatorStyle} />

        <button
          type="button"
          style={{
            ...cmdBtnStyle,
            opacity: !selectedNode || selectedNode.id === MINDMAP_ROOT_ID ? 0.4 : 1,
            cursor: !selectedNode || selectedNode.id === MINDMAP_ROOT_ID ? 'not-allowed' : 'pointer',
          }}
          onClick={removeSelected}
          disabled={!selectedNode || selectedNode.id === MINDMAP_ROOT_ID}
          title="Delete Node (Del / Backspace)"
        >
          <Trash2 size={14} />
          <span style={badgeStyle}>Del</span>
        </button>

        {/* Color Palette Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            style={{
              ...cmdBtnStyle,
              opacity: selectedNode?.id === MINDMAP_ROOT_ID ? 0.4 : 1,
            }}
            onClick={() => setColorMenuOpen((cur) => !cur)}
            disabled={selectedNode?.id === MINDMAP_ROOT_ID}
            title="Set Branch Color"
          >
            <Palette size={14} />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: selectedNode ? getBranchColor(selectedNode.id, data) : '#3b82f6',
              }}
            />
          </button>

          {colorMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 36,
                left: 0,
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                padding: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                zIndex: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              {BRANCH_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNodeColor(c)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: c,
                    border: selectedNode?.color === c ? '2px solid white' : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={separatorStyle} />

        {/* Layout Switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: 2 }}>
          <button
            type="button"
            style={{
              ...layoutToggleStyle,
              background: (data.layout || 'balanced') === 'balanced' ? 'hsl(var(--primary))' : 'transparent',
              color: (data.layout || 'balanced') === 'balanced' ? '#fff' : 'inherit',
            }}
            onClick={() => setLayout('balanced')}
            title="Balanced Layout (Left & Right)"
          >
            Balanced
          </button>
          <button
            type="button"
            style={{
              ...layoutToggleStyle,
              background: data.layout === 'right' ? 'hsl(var(--primary))' : 'transparent',
              color: data.layout === 'right' ? '#fff' : 'inherit',
            }}
            onClick={() => setLayout('right')}
            title="Horizontal Tree (Right Only)"
          >
            Right
          </button>
          <button
            type="button"
            style={{
              ...layoutToggleStyle,
              background: data.layout === 'down' ? 'hsl(var(--primary))' : 'transparent',
              color: data.layout === 'down' ? '#fff' : 'inherit',
            }}
            onClick={() => setLayout('down')}
            title="Vertical Tree (Org Chart)"
          >
            Vertical
          </button>
        </div>

        <div style={separatorStyle} />

        {/* Undo / Redo */}
        <button
          type="button"
          style={{ ...iconBtnStyle, opacity: canUndo ? 1 : 0.4 }}
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          style={{ ...iconBtnStyle, opacity: canRedo ? 1 : 0.4 }}
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* Top-Right Tools & Export Bar */}
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          top: 14,
          right: 14,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          background: 'rgba(23, 23, 23, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid hsl(var(--border))',
          borderRadius: 10,
          padding: '4px 6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <button type="button" style={toolBtnStyle} onClick={exportAsSvg} title="Export as SVG image">
          <Download size={14} />
          <span>SVG</span>
        </button>

        <button type="button" style={toolBtnStyle} onClick={copyMarkdownOutline} title="Copy Outline as Markdown">
          <Copy size={14} />
          <span>Outline</span>
        </button>

        <button
          type="button"
          style={toolBtnStyle}
          onClick={() => setImportModalOpen(true)}
          title="Import / Paste Markdown Outline"
        >
          <FileText size={14} />
          <span>Import</span>
        </button>

        <div style={separatorStyle} />

        <button
          type="button"
          style={toolBtnStyle}
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Canvas Area with Dot Grid */}
      <div
        ref={canvasRef}
        style={{
          height: '100%',
          cursor: 'grab',
          touchAction: 'none',
          position: 'relative',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
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
            transition: panRef.current ? 'none' : 'transform 0.05s ease-out',
          }}
        >
          {/* Curved Bezier Connectors */}
          <svg
            aria-hidden
            style={{
              position: 'absolute',
              overflow: 'visible',
              width: 1,
              height: 1,
              pointerEvents: 'none',
            }}
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.d}
                fill="none"
                stroke={edge.color}
                strokeWidth={2}
                strokeOpacity={0.7}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* Node Elements */}
          {Object.entries(placements).map(([id, place]) => {
            const node = place.node;
            const active = id === selectedNode?.id;
            const isRoot = place.isRoot;

            return (
              <div
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  focusNode(id);
                }}
                style={{
                  position: 'absolute',
                  left: place.x,
                  top: place.y,
                  width: place.width,
                  height: place.height,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: isRoot ? 12 : 8,
                    border: active
                      ? `2px solid ${place.color}`
                      : isRoot
                      ? `1.5px solid ${place.color}`
                      : '1px solid hsl(var(--border))',
                    background: isRoot
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
                      : active
                      ? 'rgba(30, 41, 59, 0.95)'
                      : 'hsl(var(--card))',
                    boxShadow: active
                      ? `0 0 16px ${place.color}44, 0 4px 14px rgba(0,0,0,0.3)`
                      : isRoot
                      ? `0 0 12px ${place.color}22, 0 4px 12px rgba(0,0,0,0.2)`
                      : '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    gap: 6,
                    backdropFilter: 'blur(8px)',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {/* Branch Color Indicator */}
                  {!isRoot && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: place.color,
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* Input Label */}
                  <input
                    data-mind-id={id}
                    value={node.text}
                    placeholder={isRoot ? 'Central idea' : 'New idea'}
                    aria-label={isRoot ? 'Central idea' : 'Mind map node'}
                    onFocus={() => {
                      focusRef.current = id;
                      setSelected(id);
                    }}
                    onChange={(e) => {
                      focusRef.current = id;
                      setSelected(id);
                      setText(id, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        addChild(id);
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSiblingOf(id, e.shiftKey);
                        return;
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: isRoot ? '#fff' : 'hsl(var(--foreground))',
                      font: 'inherit',
                      fontSize: isRoot ? 15 : 13,
                      fontWeight: isRoot ? 600 : 400,
                      outline: 'none',
                      padding: 0,
                    }}
                  />

                  {/* Collapse / Expand Badge */}
                  {place.hasChildren && !isRoot && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(id);
                      }}
                      title={node.collapsed ? 'Expand branch' : 'Collapse branch'}
                      style={{
                        position: 'absolute',
                        right: place.direction === 'left' ? 'auto' : -11,
                        left: place.direction === 'left' ? -11 : 'auto',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: place.color,
                        color: '#fff',
                        border: '2px solid hsl(var(--background))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        padding: 0,
                        zIndex: 5,
                      }}
                    >
                      {node.collapsed ? `+${place.childCount}` : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom-Right Zoom & Canvas Controls */}
      <div
        style={{
          position: 'absolute',
          zIndex: 10,
          bottom: 14,
          right: 14,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          background: 'rgba(23, 23, 23, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid hsl(var(--border))',
          borderRadius: 10,
          padding: '4px 6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <button
          type="button"
          style={iconBtnStyle}
          onClick={() => setView((c) => ({ ...c, zoom: Math.min(2.2, c.zoom * 1.15) }))}
          title="Zoom In (+)"
        >
          <ZoomIn size={14} />
        </button>

        <button
          type="button"
          style={{
            ...cmdBtnStyle,
            padding: '4px 6px',
            fontSize: 11,
            fontWeight: 600,
            minWidth: 42,
            justifyContent: 'center',
          }}
          onClick={centerOnRoot}
          title="Reset Zoom to 100%"
        >
          {Math.round(view.zoom * 100)}%
        </button>

        <button
          type="button"
          style={iconBtnStyle}
          onClick={() => setView((c) => ({ ...c, zoom: Math.max(0.35, c.zoom * 0.85) }))}
          title="Zoom Out (-)"
        >
          <ZoomOut size={14} />
        </button>

        <button type="button" style={iconBtnStyle} onClick={centerOnRoot} title="Fit View / Center (0 / F)">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Shortcuts Cheat Sheet Modal */}
      {shortcutsOpen && (
        <div
          onClick={() => setShortcutsOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 480,
              maxWidth: '90%',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
              color: 'hsl(var(--card-foreground))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={18} color="hsl(var(--primary))" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mindmap Keyboard Shortcuts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 12, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>
                  Node Operations
                </h4>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Tab</kbd><span>Add Child</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Enter</kbd><span>Add Sibling</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Shift+Enter</kbd><span>Add Sibling Above</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Del / Backspace</kbd><span>Delete Node</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Space</kbd><span>Edit Text</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Escape</kbd><span>Exit Edit</span></div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 12, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>
                  Navigation & Canvas
                </h4>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Arrow Keys</kbd><span>Navigate Nodes</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Ctrl+Z / Y</kbd><span>Undo / Redo</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Ctrl+C / V</kbd><span>Copy / Paste Branch</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>Mouse Wheel</kbd><span>Zoom In / Out</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>0 or F</kbd><span>Center & Fit View</span></div>
                <div style={shortcutRowStyle}><kbd style={kbdStyle}>?</kbd><span>Toggle Help</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Markdown Outline Modal */}
      {importModalOpen && (
        <div
          onClick={() => setImportModalOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxWidth: '90%',
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
              color: 'hsl(var(--card-foreground))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="hsl(var(--primary))" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Import Markdown Outline</h3>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
              Paste an indented list or markdown headings to automatically build a mindmap:
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`# Main Project\n  - Architecture\n    - SQLite Engine\n    - OPFS Worker\n  - User Interface\n    - Mindmap\n    - Canvas`}
              rows={8}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                padding: 10,
                color: 'inherit',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                marginBottom: 14,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                style={cmdBtnStyle}
                onClick={() => setImportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  ...cmdBtnStyle,
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  border: 'none',
                  fontWeight: 600,
                }}
                onClick={handleImportOutline}
              >
                Generate Mindmap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling Constants
const cmdBtnStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'hsl(var(--foreground))',
  borderRadius: 6,
  padding: '5px 8px',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  transition: 'background 0.15s',
};

const toolBtnStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'hsl(var(--foreground))',
  borderRadius: 6,
  padding: '5px 8px',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  transition: 'background 0.15s',
};

const iconBtnStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'hsl(var(--foreground))',
  borderRadius: 6,
  padding: 5,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const layoutToggleStyle: CSSProperties = {
  border: 'none',
  padding: '3px 7px',
  borderRadius: 4,
  font: 'inherit',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const badgeStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.12)',
  color: 'hsl(var(--muted-foreground))',
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: 10,
  fontWeight: 600,
};

const separatorStyle: CSSProperties = {
  width: 1,
  height: 18,
  background: 'hsl(var(--border))',
  margin: '0 2px',
};

const shortcutRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
};

const kbdStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid hsl(var(--border))',
  borderRadius: 4,
  padding: '2px 5px',
  fontSize: 11,
  fontFamily: 'monospace',
};

export function createMindmapDocument(): { content: string; data: MindmapData } {
  const data = emptyMindmap();
  return { content: outlineMindmap(data), data };
}
