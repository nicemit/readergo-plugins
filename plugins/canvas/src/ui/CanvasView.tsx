'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePlugin } from '@readergo/plugin-sdk';
import type { CanvasNode, CanvasSelection, CanvasState } from '../types';
import { shortRefLabel, type ResolvedDocLabel } from './CanvasNodeCard';
import { CanvasNodeCard } from './CanvasNodeCard';
import { CanvasDetailModal } from './CanvasDetailModal';
import { CanvasDocPickerModal } from './CanvasDocPickerModal';
import { resolveCanvasPreview, resolveCanvasTitle } from './displayUtils';
import { useCanvasHostAPI } from './CanvasHostAPIContext';
import {
  isNodeInSelection,
  normalizeNodesSelection,
  primarySelectedNodeId,
  selectionNodeIds,
} from '../selectionUtils';

function isInteractiveTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(
    el.closest('[data-canvas-node]') || el.tagName === 'INPUT' || el.tagName === 'BUTTON',
  );
}

function nodeCenter(node: CanvasNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function edgeCurvePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const bend = Math.max(40, dx * 0.45);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function edgeAnchors(from: CanvasNode, to: CanvasNode) {
  const fromRight = { x: from.x + from.width, y: from.y + from.height / 2 };
  const toLeft = { x: to.x, y: to.y + to.height / 2 };
  const fromLeft = { x: from.x, y: from.y + from.height / 2 };
  const toRight = { x: to.x + to.width, y: to.y + to.height / 2 };
  // Prefer left→right flow; flip if target is clearly to the left.
  if (to.x + to.width / 2 < from.x + from.width / 2) {
    return { x1: fromLeft.x, y1: fromLeft.y, x2: toRight.x, y2: toRight.y };
  }
  return { x1: fromRight.x, y1: fromRight.y, x2: toLeft.x, y2: toLeft.y };
}

function worldFromScreen(viewport: { x: number; y: number; zoom: number }, screen: { x: number; y: number }) {
  return { x: viewport.x + screen.x / viewport.zoom, y: viewport.y + screen.y / viewport.zoom };
}

function clientToWorld(
  root: HTMLElement,
  clientX: number,
  clientY: number,
  viewport: { x: number; y: number; zoom: number },
) {
  const pan = root.querySelector<HTMLElement>('[data-canvas-pan-layer]') ?? root;
  const rect = pan.getBoundingClientRect();
  const screen = { x: clientX - rect.left, y: clientY - rect.top };
  return worldFromScreen(viewport, screen);
}

function clampZoom(z: number) {
  return Math.min(3, Math.max(0.25, z));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type DragState = {
  ids: string[];
  startClientX: number;
  startClientY: number;
  bases: Record<string, { x: number; y: number }>;
};

type LongPressState = {
  pointerId: number;
  nodeId: string;
  startX: number;
  startY: number;
  timer: number;
  fired: boolean;
};
type ResizeState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
};

function toggleNodeInSelection(sel: CanvasSelection, id: string): CanvasSelection {
  const cur = selectionNodeIds(sel);
  if (cur.includes(id)) {
    return normalizeNodesSelection(cur.filter((i) => i !== id));
  }
  return normalizeNodesSelection([...cur, id]);
}

type BoardSearchRow = { nodeId: string; refId: string; title: string; type: string };

export function CanvasView() {
  const { state, actions } = usePlugin<CanvasState, any>();
  const api = useCanvasHostAPI();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{ active: boolean; startX: number; startY: number; vx: number; vy: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const longPressRef = useRef<LongPressState | null>(null);

  const rafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const liveViewportRef = useRef(state.viewport);
  liveViewportRef.current = state.viewport;

  const cursorWorldRef = useRef({ x: 0, y: 0 });
  const placementWorldRef = useRef({ x: 0, y: 0 });
  const lastCreatedWorldRef = useRef<{ x: number; y: number } | null>(null);
  const nodesRef = useRef(state.nodes);
  nodesRef.current = state.nodes;

  const focusAnimGenRef = useRef(0);

  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedByRefId, setResolvedByRefId] = useState<Record<string, ResolvedDocLabel>>({});
  const [previewByRefId, setPreviewByRefId] = useState<Record<string, string>>({});
  const [loadingContentByRefId, setLoadingContentByRefId] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const connectingFromRef = useRef<string | null>(null);
  const fetchedRefIdsRef = useRef(new Set<string>());
  /** Nodes the user resized by hand - fixed box instead of content height. */
  const [manualSizeByNodeId, setManualSizeByNodeId] = useState<Record<string, true>>({});

  const nodeList = useMemo(() => Object.values(state.nodes), [state.nodes]);
  const edgeList = useMemo(() => Object.values(state.edges ?? {}), [state.edges]);

  const detailNode = detailNodeId ? state.nodes[detailNodeId] ?? null : null;
  const detailResolved = detailNode ? resolvedByRefId[detailNode.refId] : undefined;

  const refIdsKey = useMemo(
    () =>
      [...new Set(nodeList.map((n) => n.refId))]
        .filter(Boolean)
        .sort()
        .join(','),
    [nodeList],
  );

  useEffect(() => {
    const ids = refIdsKey ? refIdsKey.split(',').filter(Boolean) : [];
    if (ids.length === 0) return;

    let cancelled = false;

    (async () => {
      const want = ids.filter((id) => !fetchedRefIdsRef.current.has(id));
      if (want.length === 0) return;

      for (const id of want) {
        setLoadingContentByRefId((p) => ({ ...p, [id]: true }));
      }

      // Titles from list (fast), then full get for reliable body/preview.
      let byId = new Map<string, Awaited<ReturnType<typeof api.getNote>>>();
      try {
        const list = await api.listNotes();
        if (!cancelled) {
          byId = new Map(list.map((n) => [String(n.id), n]));
        }
      } catch {
        /* getNote path below still runs */
      }

      const nextResolved: Record<string, ResolvedDocLabel> = {};
      const nextPreview: Record<string, string> = {};

      for (const id of want) {
        if (cancelled) return;
        fetchedRefIdsRef.current.add(id);
        let row = byId.get(id) ?? null;
        // Always load the full note so previews aren't stuck on empty list stubs.
        try {
          const full = await api.getNote(id);
          if (full) row = full;
        } catch {
          /* keep list row */
        }
        if (!row) {
          setLoadingContentByRefId((p) => ({ ...p, [id]: false }));
          continue;
        }
        nextResolved[id] = {
          title: resolveCanvasTitle(row),
          type: typeof row.type === 'string' ? row.type : 'note',
        };
        nextPreview[id] = resolveCanvasPreview(row);
        setLoadingContentByRefId((p) => ({ ...p, [id]: false }));
      }

      if (cancelled) {
        for (const id of want) fetchedRefIdsRef.current.delete(id);
        return;
      }
      if (Object.keys(nextResolved).length > 0) {
        setResolvedByRefId((p) => ({ ...p, ...nextResolved }));
      }
      if (Object.keys(nextPreview).length > 0) {
        setPreviewByRefId((p) => ({ ...p, ...nextPreview }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, refIdsKey]);

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusedNodeId) return;
    if (state.nodes[focusedNodeId]) return;
    setFocusedNodeId(null);
  }, [focusedNodeId, state.nodes]);

  const focusNode = useCallback(
    (node: CanvasNode) => {
      const root = rootRef.current;
      if (!root) return;
      const myGen = ++focusAnimGenRef.current;
      const rect = root.getBoundingClientRect();
      const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
      const targetWorld = nodeCenter(node);
      const zoom = liveViewportRef.current.zoom;
      const toViewport = {
        x: targetWorld.x - centerScreen.x / zoom,
        y: targetWorld.y - centerScreen.y / zoom,
        zoom,
      };

      const from = { ...liveViewportRef.current };
      const dist = Math.hypot(toViewport.x - from.x, toViewport.y - from.y);
      const duration = Math.min(560, Math.max(240, 180 + Math.sqrt(dist) * 42));
      const start = performance.now();

      const tick = (t: number) => {
        if (focusAnimGenRef.current !== myGen) return;
        const k = Math.min(1, (t - start) / duration);
        const ease = easeInOutCubic(k);
        const next = {
          x: from.x + (toViewport.x - from.x) * ease,
          y: from.y + (toViewport.y - from.y) * ease,
          zoom: from.zoom,
        };
        liveViewportRef.current = next;
        actions.SET_VIEWPORT(next);
        setFocusedNodeId(node.id);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [actions],
  );

  const beginConnect = useCallback((fromId: string, clientX: number, clientY: number) => {
    connectingFromRef.current = fromId;
    setConnecting({ fromId, x: clientX, y: clientY });
  }, []);

  useEffect(() => {
    connectingFromRef.current = connecting?.fromId ?? null;
  }, [connecting?.fromId]);

  useEffect(() => {
    if (!connecting?.fromId) return;
    const fromId = connecting.fromId;

    const onMove = (event: globalThis.PointerEvent) => {
      setConnecting((prev) =>
        prev && prev.fromId === fromId ? { ...prev, x: event.clientX, y: event.clientY } : prev,
      );
    };

    const onUp = (event: globalThis.PointerEvent) => {
      const activeFrom = connectingFromRef.current;
      if (!activeFrom) {
        setConnecting(null);
        return;
      }

      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      let toId = target?.closest('[data-node-id]')?.getAttribute('data-node-id');

      if (!toId && rootRef.current) {
        const cards = rootRef.current.querySelectorAll<HTMLElement>('[data-node-id]');
        let best: string | null = null;
        let bestDist = 56;
        cards.forEach((el) => {
          const id = el.getAttribute('data-node-id');
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
        actions.CONNECT_NODES({ from: activeFrom, to: toId });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting?.fromId, actions]);

  const openPickerAt = useCallback((wx: number, wy: number) => {
    placementWorldRef.current = { x: wx, y: wy };
    setPickerOpen(true);
  }, []);

  const searchRows = useMemo<BoardSearchRow[]>(
    () =>
      nodeList.map((n) => {
        const r = resolvedByRefId[n.refId];
        return {
          nodeId: n.id,
          refId: n.refId,
          title: r?.title?.trim() ? r.title : `Document · ${shortRefLabel(n.refId)}`,
          type: r?.type ?? 'note',
        };
      }),
    [nodeList, resolvedByRefId],
  );
  const filteredSearchRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchRows.slice(0, 24);
    return searchRows
      .filter((r) => {
        return (
          r.title.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.refId.toLowerCase().includes(q)
        );
      })
      .slice(0, 24);
  }, [searchQuery, searchRows]);

  const excludeRefIds = useMemo(() => new Set(nodeList.map((n) => n.refId)), [nodeList]);

  const enqueueViewport = useCallback(
    (next: { x: number; y: number; zoom: number }) => {
      liveViewportRef.current = next;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        actions.SET_VIEWPORT(liveViewportRef.current);
      });
    },
    [actions],
  );

  const updateCursorWorld = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const screen = { x: clientX - rect.left, y: clientY - rect.top };
    cursorWorldRef.current = worldFromScreen(liveViewportRef.current, screen);
  }, []);

  const zoomAt = useCallback(
    (screen: { x: number; y: number }, nextZoomRaw: number) => {
      const from = liveViewportRef.current;
      const nextZoom = clampZoom(nextZoomRaw);
      const world = worldFromScreen(from, screen);
      const next = {
        zoom: nextZoom,
        x: world.x - screen.x / nextZoom,
        y: world.y - screen.y / nextZoom,
      };
      enqueueViewport({ ...from, ...next });
    },
    [enqueueViewport],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const pan = e.currentTarget as HTMLDivElement;
      const rect = pan.getBoundingClientRect();
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (Math.abs(e.deltaY) < 0.5 && Math.abs(e.deltaX) < 0.5) return;
      e.preventDefault();

      const from = liveViewportRef.current;
      const isTrackpadPan = e.ctrlKey === false && Math.abs(e.deltaY) < 40;
      if (isTrackpadPan) {
        enqueueViewport({ ...from, x: from.x + e.deltaX / from.zoom, y: from.y + e.deltaY / from.zoom, zoom: from.zoom });
        return;
      }

      const factor = e.ctrlKey ? 1.06 : 1.12;
      const dir = e.deltaY > 0 ? 1 / factor : factor;
      zoomAt(screen, from.zoom * dir);
    },
    [enqueueViewport, zoomAt],
  );

  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      const rz = resizeRef.current;
      if (rz) {
        const node = nodesRef.current[rz.id];
        if (!node) return;
        const vpz = liveViewportRef.current.zoom;
        const dw = (e.clientX - rz.startClientX) / vpz;
        const dh = (e.clientY - rz.startClientY) / vpz;
        actions.RESIZE_NODE({ id: rz.id, width: rz.startWidth + dw, height: rz.startHeight + dh });
        return;
      }
      // Cancel long-press if the user moves.
      const lp = longPressRef.current;
      if (lp && lp.pointerId === e.pointerId) {
        const d = Math.hypot(e.clientX - lp.startX, e.clientY - lp.startY);
        if (d > 10) {
          window.clearTimeout(lp.timer);
          longPressRef.current = null;
        }
      }

      const d = dragRef.current;
      if (!d) return;
      const vp = liveViewportRef.current;
      const dx = (e.clientX - d.startClientX) / vp.zoom;
      const dy = (e.clientY - d.startClientY) / vp.zoom;
      const moves = d.ids.map((id) => {
        const b = d.bases[id];
        return { id, x: b.x + dx, y: b.y + dy };
      });
      if (dragRafRef.current !== null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        actions.MOVE_NODES({ moves, snap: false });
      });
    };

    const onWindowPointerUp = (e: PointerEvent) => {
      if (resizeRef.current) {
        resizeRef.current = null;
        return;
      }
      const lp = longPressRef.current;
      if (lp && lp.pointerId === e.pointerId) {
        window.clearTimeout(lp.timer);
        // On mobile: tap focuses; long-press opens modal.
        if (!lp.fired) {
          const node = nodesRef.current[lp.nodeId];
          if (node) focusNode(node);
        }
        longPressRef.current = null;
      }

      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;

      const vp = liveViewportRef.current;
      const dx = (e.clientX - d.startClientX) / vp.zoom;
      const dy = (e.clientY - d.startClientY) / vp.zoom;

      const moves = d.ids.map((id) => {
        const b = d.bases[id];
        return { id, x: b.x + dx, y: b.y + dy };
      });
      actions.MOVE_NODES({ moves, snap: true });
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      if (dragRafRef.current !== null) cancelAnimationFrame(dragRafRef.current);
    };
  }, [actions, focusNode]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;

      if (e.pointerType === 'touch') {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }

      if (isInteractiveTarget(e.target)) return;

      root.focus({ preventScroll: true });
      actions.CLEAR_SELECTION(undefined);

      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        vx: liveViewportRef.current.x,
        vy: liveViewportRef.current.y,
      };
    },
    [actions],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      updateCursorWorld(e.clientX, e.clientY);

      if (e.pointerType === 'touch') {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = Array.from(pointersRef.current.values());

        if (pts.length === 2) {
          const a = pts[0]!;
          const b = pts[1]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;

          const last = (onPointerMove as any)._lastPinch as { dist: number } | undefined;
          if (!last) {
            (onPointerMove as any)._lastPinch = { dist };
          } else {
            const from = liveViewportRef.current;
            const ratio = dist / Math.max(1, last.dist);
            (onPointerMove as any)._lastPinch = { dist };
            const root = rootRef.current;
            const rect = root?.getBoundingClientRect();
            const screen = {
              x: cx - (rect?.left ?? 0),
              y: cy - (rect?.top ?? 0),
            };
            zoomAt(screen, from.zoom * ratio);
          }
          return;
        } else {
          (onPointerMove as any)._lastPinch = undefined;
        }
      }

      const pan = panRef.current;
      if (!pan?.active) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      const from = liveViewportRef.current;
      enqueueViewport({
        ...from,
        x: pan.vx - dx / from.zoom,
        y: pan.vy - dy / from.zoom,
      });
    },
    [enqueueViewport, updateCursorWorld, zoomAt],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      pointersRef.current.delete(e.pointerId);
    }
    panRef.current = null;
  }, []);

  const beginDragNodes = useCallback(
    (nodeId: string, e: React.PointerEvent, currentSelection: CanvasSelection, nodes: Record<string, CanvasNode>) => {
      const idsRaw = isNodeInSelection(currentSelection, nodeId)
        ? selectionNodeIds(currentSelection)
        : [nodeId];
      const ids = idsRaw.filter((id) => nodes[id]);
      if (ids.length === 0) return;
      const bases: Record<string, { x: number; y: number }> = {};
      for (const id of ids) {
        const n = nodes[id];
        if (n) bases[id] = { x: n.x, y: n.y };
      }
      dragRef.current = {
        ids,
        startClientX: e.clientX,
        startClientY: e.clientY,
        bases,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onCanvasKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;

      const meta = e.metaKey || e.ctrlKey;
      const grid = state.gridSize ?? 32;

      if (e.key === 'Escape') {
        if (searchOpen) {
          e.preventDefault();
          setSearchOpen(false);
          return;
        }
        if (pickerOpen) {
          e.preventDefault();
          setPickerOpen(false);
        }
        return;
      }

      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery('');
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        if (meta) return;
        e.preventDefault();
        const w = cursorWorldRef.current;
        openPickerAt(w.x, w.y);
        return;
      }

      if (e.key === 'Enter') {
        if (meta) return;
        e.preventDefault();
        const primary = primarySelectedNodeId(state.selection);
        if (!primary) {
          const w = cursorWorldRef.current;
          openPickerAt(w.x, w.y);
          return;
        }
        const n = state.nodes[primary];
        if (!n) return;
        const x = n.x + n.width + grid;
        const y = n.y;
        openPickerAt(x + 130, y + n.height / 2);
        return;
      }

      const ids = selectionNodeIds(state.selection);

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (state.selection.kind === 'edge') {
          actions.DISCONNECT_EDGE({ id: state.selection.id });
          return;
        }
        if (ids.length > 0) actions.DELETE_NODES({ ids });
        return;
      }

      if (meta && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (ids.length > 0) actions.DUPLICATE_NODES({ ids });
        return;
      }

      const step = e.shiftKey ? grid * 4 : grid;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      if (ids.length === 0) return;
      e.preventDefault();
      const moves = ids
        .map((id) => {
          const n = state.nodes[id];
          if (!n) return null;
          return { id, x: n.x + dx, y: n.y + dy };
        })
        .filter(Boolean) as Array<{ id: string; x: number; y: number }>;
      if (moves.length) actions.MOVE_NODES({ moves, snap: true });
    },
    [actions, openPickerAt, pickerOpen, searchOpen, state.gridSize, state.nodes, state.selection],
  );

  const gridSize = state.gridSize ?? 32;
  const vp = state.viewport;

  useLayoutEffect(() => {
    const r = rootRef.current;
    if (!r) return;
    const rect = r.getBoundingClientRect();
    cursorWorldRef.current = worldFromScreen(liveViewportRef.current, { x: rect.width / 2, y: rect.height / 2 });
  }, []);

  // Infinite-feeling grid: draw in screen space and derive tile size/offset from viewport.
  // This avoids large transformed surfaces while keeping world-anchored alignment.
  const gridStepPx = gridSize * vp.zoom;
  const dotGridStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    // Anchor dots to the tile origin so world snap points and dots remain aligned.
    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.22) 1px, transparent 1.2px)`,
    backgroundSize: `${gridStepPx}px ${gridStepPx}px`,
    backgroundPosition: `${-vp.x * vp.zoom}px ${-vp.y * vp.zoom}px`,
  };

  const nodeBounds = useMemo(() => {
    if (nodeList.length === 0) return null;
    const pad = 120;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodeList) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    return { minX, minY, maxX, maxY, pad };
  }, [nodeList]);

  const miniMap = useMemo(() => {
    if (!nodeBounds) return null;
    let { minX, minY, maxX, maxY, pad } = nodeBounds;
    // Include current viewport extents so minimap stays truthful while panning far away.
    const root = rootRef.current;
    if (root) {
      const vpW = root.clientWidth / Math.max(0.001, state.viewport.zoom);
      const vpH = root.clientHeight / Math.max(0.001, state.viewport.zoom);
      minX = Math.min(minX, state.viewport.x);
      minY = Math.min(minY, state.viewport.y);
      maxX = Math.max(maxX, state.viewport.x + vpW);
      maxY = Math.max(maxY, state.viewport.y + vpH);
    }
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const worldW = Math.max(1, maxX - minX);
    const worldH = Math.max(1, maxY - minY);
    const mapW = 190;
    const mapH = 120;
    const scale = Math.min(mapW / worldW, mapH / worldH);
    return { minX, minY, worldW, worldH, mapW, mapH, scale };
  }, [nodeBounds, state.viewport.x, state.viewport.y, state.viewport.zoom]);

  const fitBoardInView = useCallback(() => {
    if (nodeList.length === 0) {
      actions.SET_VIEWPORT({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const pad = 120;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodeList) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const worldW = Math.max(1, maxX - minX + pad * 2);
    const worldH = Math.max(1, maxY - minY + pad * 2);
    // "Reset view" should be a recovery action, not an aggressive zoom-in.
    // Cap fit zoom at 100% so users don't jump to 200%+ on tight node clusters.
    const fitZoom = Math.min(rect.width / worldW, rect.height / worldH);
    const zoom = Math.min(1, clampZoom(fitZoom));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    actions.SET_VIEWPORT({
      x: centerX - rect.width / (2 * zoom),
      y: centerY - rect.height / (2 * zoom),
      zoom,
    });
  }, [actions, nodeList]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="relative h-full w-full min-h-0 overflow-hidden bg-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
      onPointerMove={(e) => updateCursorWorld(e.clientX, e.clientY)}
      onKeyDown={onCanvasKeyDown}
    >
      <div
        data-canvas-pan-layer
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <div className="pointer-events-none absolute inset-0" style={dotGridStyle} />
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `scale(${vp.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${-vp.x}px, ${-vp.y}px)`,
              transformOrigin: '0 0',
            }}
          >
            <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ width: 1, height: 1 }}>
              {edgeList.map((edge) => {
                const from = state.nodes[edge.from];
                const to = state.nodes[edge.to];
                if (!from || !to) return null;
                const { x1, y1, x2, y2 } = edgeAnchors(from, to);
                const selected = state.selection.kind === 'edge' && state.selection.id === edge.id;
                const related =
                  !!focusedNodeId && (edge.from === focusedNodeId || edge.to === focusedNodeId);
                return (
                  <path
                    key={edge.id}
                    d={edgeCurvePath(x1, y1, x2, y2)}
                    fill="none"
                    stroke={selected || related ? 'rgba(251,191,36,0.9)' : 'rgba(161,161,170,0.55)'}
                    strokeWidth={selected ? 2.4 : 1.8}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Hit targets for selecting / deleting edges */}
            {edgeList.map((edge) => {
              const from = state.nodes[edge.from];
              const to = state.nodes[edge.to];
              if (!from || !to) return null;
              const { x1, y1, x2, y2 } = edgeAnchors(from, to);
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              return (
                <button
                  key={`hit-${edge.id}`}
                  type="button"
                  aria-label="Select connection"
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full touch-manipulation"
                  style={{ left: midX, top: midY }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    actions.SELECT({ kind: 'edge', id: edge.id });
                    setFocusedNodeId(null);
                  }}
                />
              );
            })}

            {nodeList.map((node) => {
            const selected = isNodeInSelection(state.selection, node.id);
            const resolved = resolvedByRefId[node.refId] ?? null;
            const preview = previewByRefId[node.refId] ?? '';
            const autoSize = !manualSizeByNodeId[node.id];

            return (
              <div
                key={node.id}
                data-canvas-node
                data-node-id={node.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: autoSize ? 'auto' : node.height,
                  minHeight: autoSize ? 96 : undefined,
                }}
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest('[data-node-open]')) return;
                  if ((e.target as HTMLElement).closest('[data-node-delete]')) return;
                  if ((e.target as HTMLElement).closest('[data-node-connect]')) return;
                  if ((e.target as HTMLElement).closest('[data-node-resize]')) return;

                  e.stopPropagation();
                  rootRef.current?.focus({ preventScroll: true });

                  if (e.shiftKey) {
                    actions.SELECT(toggleNodeInSelection(state.selection, node.id));
                    setFocusedNodeId(node.id);
                    return;
                  }

                  let sel: CanvasSelection = state.selection;
                  if (!isNodeInSelection(sel, node.id)) {
                    sel = { kind: 'node', id: node.id };
                    actions.SELECT(sel);
                  }
                  setFocusedNodeId(node.id);

                  if (e.button !== 0) return;
                  // Mobile: tap focuses; long-press opens modal.
                  if (e.pointerType === 'touch') {
                    const timer = window.setTimeout(() => {
                      const cur = longPressRef.current;
                      if (!cur) return;
                      cur.fired = true;
                      setDetailNodeId(cur.nodeId);
                    }, 520);
                    longPressRef.current = {
                      pointerId: e.pointerId,
                      nodeId: node.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      timer,
                      fired: false,
                    };
                  }
                  beginDragNodes(node.id, e, sel, state.nodes);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  api.openNote(node.refId);
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <CanvasNodeCard
                  node={node}
                  selected={selected || focusedNodeId === node.id}
                  resolved={resolved}
                  preview={preview}
                  previewLoading={Boolean(loadingContentByRefId[node.refId])}
                  autoSize={autoSize}
                  onMeasuredSize={({ height }) => {
                    if (!autoSize) return;
                    if (Math.abs(height - node.height) <= 1) return;
                    actions.RESIZE_NODE({ id: node.id, width: node.width, height });
                  }}
                  onOpen={() => api.openNote(node.refId)}
                  onDelete={() => {
                    actions.DELETE_NODES({ ids: [node.id] });
                    setManualSizeByNodeId((p) => {
                      if (!p[node.id]) return p;
                      const next = { ...p };
                      delete next[node.id];
                      return next;
                    });
                  }}
                  onConnectStart={(cx, cy) => beginConnect(node.id, cx, cy)}
                  onResizeStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setManualSizeByNodeId((p) => ({ ...p, [node.id]: true }));
                    const liveH = (e.currentTarget.closest('[data-canvas-node]') as HTMLElement | null)?.offsetHeight;
                    resizeRef.current = {
                      id: node.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startWidth: node.width,
                      startHeight: liveH && liveH > 0 ? liveH : node.height,
                    };
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                />
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {miniMap ? (
        <div
          className="absolute z-30 hidden rounded-lg border border-zinc-800 bg-zinc-900/95 p-2 shadow-lg shadow-black/30 lg:block"
          style={{
            right: 12,
            // Keep clear of app/footer bars and OS safe area.
            bottom: 'calc(108px + env(safe-area-inset-bottom, 0px))',
            left: 'auto',
            top: 'auto',
          }}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Overview</div>
          <button
            type="button"
            className="relative block overflow-hidden rounded border border-zinc-800 bg-zinc-950"
            style={{ width: miniMap.mapW, height: miniMap.mapH }}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
              const px = e.clientX - rect.left;
              const py = e.clientY - rect.top;
              const worldX = miniMap.minX + px / miniMap.scale;
              const worldY = miniMap.minY + py / miniMap.scale;
              const root = rootRef.current;
              if (!root) return;
              const r = root.getBoundingClientRect();
              const next = {
                x: worldX - (r.width / state.viewport.zoom) / 2,
                y: worldY - (r.height / state.viewport.zoom) / 2,
                zoom: state.viewport.zoom,
              };
              actions.SET_VIEWPORT(next);
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={miniMap.mapW}
              height={miniMap.mapH}
              viewBox={`0 0 ${miniMap.mapW} ${miniMap.mapH}`}
              aria-hidden
            >
              {nodeList.map((n) => {
                const cx = (n.x + n.width / 2 - miniMap.minX) * miniMap.scale;
                const cy = (n.y + n.height / 2 - miniMap.minY) * miniMap.scale;
                const active = focusedNodeId === n.id || isNodeInSelection(state.selection, n.id);
                return (
                  <circle
                    key={`mini-${n.id}`}
                    cx={Math.max(3, Math.min(miniMap.mapW - 3, cx))}
                    cy={Math.max(3, Math.min(miniMap.mapH - 3, cy))}
                    r={active ? 3.2 : 2.8}
                    fill={active ? '#fcd34d' : '#d4d4d8'}
                    opacity={active ? 1 : 0.9}
                  />
                );
              })}
              <rect
                x={(state.viewport.x - miniMap.minX) * miniMap.scale}
                y={(state.viewport.y - miniMap.minY) * miniMap.scale}
                width={Math.max(8, (rootRef.current?.clientWidth ?? 0) / state.viewport.zoom * miniMap.scale)}
                height={Math.max(8, (rootRef.current?.clientHeight ?? 0) / state.viewport.zoom * miniMap.scale)}
                fill="rgba(103,232,249,0.12)"
                stroke="rgba(103,232,249,0.85)"
                strokeWidth={1}
              />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-3 top-3 z-20 hidden max-w-[min(100%-1.5rem,22rem)] flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/95 px-2 py-1.5 text-xs text-zinc-400 shadow-lg shadow-black/30 sm:flex">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
            title="Pick a document from your library (shortcut: N). Also: Enter to add near selection."
            onClick={() => {
              const from = liveViewportRef.current;
              const root = rootRef.current;
              if (!root) return;
              const rect = root.getBoundingClientRect();
              const center = worldFromScreen(from, { x: rect.width / 2, y: rect.height / 2 });
              openPickerAt(center.x, center.y);
            }}
          >
            Choose document…
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
            onClick={fitBoardInView}
            title="Fit all nodes in view"
          >
            Reset view
          </button>
          {state.selection.kind === 'edge' ? (
            <button
              type="button"
              className="rounded-md border border-rose-700/70 bg-rose-950/40 px-2 py-1 text-xs font-medium text-rose-200 hover:bg-rose-900/50"
              onClick={() => {
                if (state.selection.kind === 'edge') {
                  actions.DISCONNECT_EDGE({ id: state.selection.id });
                }
              }}
            >
              Unlink
            </button>
          ) : selectionNodeIds(state.selection).length > 0 ? (
            <button
              type="button"
              className="rounded-md border border-rose-700/70 bg-rose-950/40 px-2 py-1 text-xs font-medium text-rose-200 hover:bg-rose-900/50"
              onClick={() => actions.DELETE_NODES({ ids: selectionNodeIds(state.selection) })}
            >
              Remove
            </button>
          ) : null}

          <div className="ml-1 tabular-nums text-zinc-500">{Math.round((vp.zoom ?? 1) * 100)}%</div>
        </div>
        <p className="pointer-events-none text-[11px] leading-snug text-zinc-600">
          Select a card, drag the amber port to connect. Double-click opens the note.
        </p>
      </div>

      {/* Mobile / touch chrome */}
      <div
        className="pointer-events-none absolute inset-x-0 z-30 flex justify-center sm:hidden"
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-zinc-700/90 bg-zinc-900/95 px-2 py-1.5 shadow-xl shadow-black/40 backdrop-blur">
          <button
            type="button"
            className="rounded-xl bg-amber-500/90 px-3 py-2 text-xs font-semibold text-zinc-950 touch-manipulation"
            onClick={() => {
              const from = liveViewportRef.current;
              const root = rootRef.current;
              if (!root) return;
              const rect = root.getBoundingClientRect();
              const center = worldFromScreen(from, { x: rect.width / 2, y: rect.height / 2 });
              openPickerAt(center.x, center.y);
            }}
          >
            Add
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-700 px-2.5 py-2 text-xs text-zinc-200 touch-manipulation"
            onClick={() => actions.SET_VIEWPORT({ ...liveViewportRef.current, zoom: clampZoom(vp.zoom / 1.15) })}
          >
            −
          </button>
          <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums text-zinc-500">
            {Math.round((vp.zoom ?? 1) * 100)}%
          </span>
          <button
            type="button"
            className="rounded-xl border border-zinc-700 px-2.5 py-2 text-xs text-zinc-200 touch-manipulation"
            onClick={() => actions.SET_VIEWPORT({ ...liveViewportRef.current, zoom: clampZoom(vp.zoom * 1.15) })}
          >
            +
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-700 px-2.5 py-2 text-xs text-zinc-200 touch-manipulation"
            onClick={fitBoardInView}
          >
            Fit
          </button>
          {state.selection.kind === 'edge' ? (
            <button
              type="button"
              className="rounded-xl border border-rose-700/70 px-2.5 py-2 text-xs text-rose-300 touch-manipulation"
              onClick={() => {
                if (state.selection.kind === 'edge') {
                  actions.DISCONNECT_EDGE({ id: state.selection.id });
                }
              }}
            >
              Unlink
            </button>
          ) : selectionNodeIds(state.selection).length > 0 ? (
            <button
              type="button"
              className="rounded-xl border border-rose-700/70 px-2.5 py-2 text-xs text-rose-300 touch-manipulation"
              onClick={() => actions.DELETE_NODES({ ids: selectionNodeIds(state.selection) })}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {nodeList.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <p className="text-base font-medium text-zinc-200">Arrange documents on this board</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Add notes from your library, read their previews, and drag the amber port to connect related cards.
            </p>
          </div>
        </div>
      ) : null}

      {connecting ? (
        <svg className="pointer-events-none absolute inset-0 z-40 h-full w-full">
          {(() => {
            const root = rootRef.current;
            if (!root) return null;
            const rect = root.getBoundingClientRect();
            const fromNode = state.nodes[connecting.fromId];
            if (!fromNode) return null;
            const zoom = vp.zoom;
            const sx = (fromNode.x + fromNode.width - vp.x) * zoom;
            const sy = (fromNode.y + fromNode.height / 2 - vp.y) * zoom;
            const ex = connecting.x - rect.left;
            const ey = connecting.y - rect.top;
            return (
              <path
                d={edgeCurvePath(sx, sy, ex, ey)}
                fill="none"
                stroke="rgba(251,191,36,0.85)"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            );
          })()}
        </svg>
      ) : null}

      <CanvasDetailModal
        open={detailNodeId != null}
        node={detailNode}
        resolved={detailResolved}
        onClose={() => setDetailNodeId(null)}
        onRemove={() => {
          if (detailNodeId) actions.DELETE_NODES({ ids: [detailNodeId] });
        }}
        api={api}
      />

      <CanvasDocPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeRefIds={excludeRefIds}
        api={api}
        onPick={(row) => {
          const grid = state.gridSize ?? 32;
          const base = lastCreatedWorldRef.current ?? placementWorldRef.current;
          const x = base.x + 260 + grid;
          const y = base.y;
          const preview = resolveCanvasPreview({
            title: row.title,
            type: row.type,
            content: row.content,
          });
          actions.ADD_NODE({
            refId: row.id,
            x: x,
            y: y,
            width: 260,
            height: 96,
          });
          setResolvedByRefId((prev) => ({
            ...prev,
            [row.id]: { title: row.title, type: row.type },
          }));
          if (preview) {
            setPreviewByRefId((prev) => ({ ...prev, [row.id]: preview }));
            fetchedRefIdsRef.current.add(row.id);
          } else {
            fetchedRefIdsRef.current.delete(row.id);
          }
          lastCreatedWorldRef.current = { x, y };
          setPickerOpen(false);
        }}
      />

      {searchOpen ? (
        <div className="absolute inset-0 z-40 flex items-start justify-center pt-16">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSearchOpen(false)} />
          <div className="relative z-10 flex w-[min(92vw,520px)] max-h-[70vh] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="border-b border-zinc-800 px-3 py-2">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes on this canvas…"
                className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {filteredSearchRows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-500">No matching nodes.</div>
              ) : (
                filteredSearchRows.map((row) => (
                  <button
                    key={row.nodeId}
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-zinc-800/80"
                    onClick={() => {
                      const n = state.nodes[row.nodeId];
                      if (!n) return;
                      actions.SELECT({ kind: 'node', id: n.id });
                      focusNode(n);
                      setSearchOpen(false);
                    }}
                  >
                    <span className="truncate text-sm text-zinc-200">{row.title}</span>
                    <span className="ml-auto text-[11px] text-zinc-500">{row.type}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
