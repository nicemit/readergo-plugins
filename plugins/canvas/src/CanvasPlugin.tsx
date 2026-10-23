'use client';

import { nanoid } from 'nanoid';
import { definePlugin } from '@readergo/plugin-sdk/v2';
import type { CanvasEdge, CanvasNode, CanvasSelection, CanvasState, CanvasViewport } from './types';
import { snapToGrid } from './grid';
import { CanvasView } from './ui/CanvasView';
import { normalizeNodesSelection } from './selectionUtils';

type AddNodePayload = {
  id?: string;
  refId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};
type MoveNodePayload = { id: string; x: number; y: number; snap?: boolean };
type MoveNodesPayload = { moves: Array<{ id: string; x: number; y: number }>; snap?: boolean };
type SetViewportPayload = Partial<CanvasViewport>;
type SelectPayload = CanvasSelection;

const clampZoom = (z: number) => Math.min(3, Math.max(0.25, z));

export const CanvasPlugin = definePlugin({
  id: 'readergo.canvas.v1',
  initialState: {
    nodes: {},
    edges: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    selection: { kind: 'none' },
    gridSize: 32,
  } satisfies CanvasState,
  actions: {
    HYDRATE_REPLACE: {
      apply: (_state: CanvasState, payload: CanvasState) => ({
        ...payload,
        edges: payload.edges ?? {},
      }),
      inverse: () => null,
    },
    SET_GRID_SIZE: {
      apply: (state: CanvasState, payload: { size: number }) => ({
        ...state,
        gridSize: Math.max(4, Math.min(256, Math.round(payload.size))),
      }),
      inverse: () => null,
    },
    ADD_NODE: {
      apply: (state: CanvasState, payload: AddNodePayload) => {
        if (!payload.refId?.trim()) return state;
        const gridSize = state.gridSize ?? 32;
        const id = payload.id ?? nanoid();
        const snapped = snapToGrid(payload.x, payload.y, gridSize);
        const node: CanvasNode = {
          id,
          refId: payload.refId.trim(),
          x: snapped.x,
          y: snapped.y,
          width: payload.width ?? 260,
          height: payload.height ?? 120,
        };
        return {
          ...state,
          nodes: { ...state.nodes, [id]: node },
          selection: { kind: 'node' as const, id },
        };
      },
      inverse: () => null,
    },
    MOVE_NODE: {
      apply: (state: CanvasState, payload: MoveNodePayload) => {
        const node = state.nodes[payload.id];
        if (!node) return state;
        const gridSize = state.gridSize ?? 32;
        const nextPos = payload.snap ? snapToGrid(payload.x, payload.y, gridSize) : { x: payload.x, y: payload.y };
        return {
          ...state,
          nodes: {
            ...state.nodes,
            [payload.id]: { ...node, x: nextPos.x, y: nextPos.y },
          },
        };
      },
      inverse: () => null,
    },
    MOVE_NODES: {
      apply: (state: CanvasState, payload: MoveNodesPayload) => {
        const gridSize = state.gridSize ?? 32;
        const nodes = { ...state.nodes };
        for (const m of payload.moves) {
          const node = nodes[m.id];
          if (!node) continue;
          const nextPos = payload.snap ? snapToGrid(m.x, m.y, gridSize) : { x: m.x, y: m.y };
          nodes[m.id] = { ...node, x: nextPos.x, y: nextPos.y };
        }
        return { ...state, nodes };
      },
      inverse: () => null,
    },
    DELETE_NODES: {
      apply: (state: CanvasState, payload: { ids: string[] }) => {
        const idSet = new Set(payload.ids);
        if (idSet.size === 0) return state;
        const nodes = { ...state.nodes };
        for (const id of idSet) delete nodes[id];
        const edges: Record<string, CanvasEdge> = {};
        for (const edge of Object.values(state.edges ?? {})) {
          if (idSet.has(edge.from) || idSet.has(edge.to)) continue;
          edges[edge.id] = edge;
        }
        let selection: CanvasSelection = state.selection;
        if (selection.kind === 'node' && idSet.has(selection.id)) selection = { kind: 'none' };
        if (selection.kind === 'nodes') {
          const next = selection.ids.filter((id) => !idSet.has(id));
          selection = normalizeNodesSelection(next);
        }
        if (selection.kind === 'edge' && !edges[selection.id]) selection = { kind: 'none' };
        return { ...state, nodes, edges, selection };
      },
      inverse: () => null,
    },
    DUPLICATE_NODES: {
      apply: (state: CanvasState, payload: { ids: string[] }) => {
        const gridSize = state.gridSize ?? 32;
        const dx = gridSize * 2;
        const dy = gridSize * 2;
        const nodes = { ...state.nodes };
        const newIds: string[] = [];
        for (const id of payload.ids) {
          const n = state.nodes[id];
          if (!n) continue;
          const nid = nanoid();
          const pos = snapToGrid(n.x + dx, n.y + dy, gridSize);
          nodes[nid] = {
            id: nid,
            refId: n.refId,
            x: pos.x,
            y: pos.y,
            width: n.width,
            height: n.height,
          };
          newIds.push(nid);
        }
        const selection = normalizeNodesSelection(newIds);
        return { ...state, nodes, selection };
      },
      inverse: () => null,
    },
    RESIZE_NODE: {
      apply: (state: CanvasState, payload: { id: string; width: number; height: number }) => {
        const node = state.nodes[payload.id];
        if (!node) return state;
        return {
          ...state,
          nodes: {
            ...state.nodes,
            [payload.id]: {
              ...node,
              width: Math.max(160, Math.round(payload.width)),
              height: Math.max(96, Math.round(payload.height)),
            },
          },
        };
      },
      inverse: () => null,
    },
    CONNECT_NODES: {
      apply: (state: CanvasState, payload: { from: string; to: string }) => {
        const from = payload.from;
        const to = payload.to;
        if (!from || !to || from === to) return state;
        if (!state.nodes[from] || !state.nodes[to]) return state;
        const edges = state.edges ?? {};
        const exists = Object.values(edges).some(
          (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
        );
        if (exists) return state;
        const id = `edge-${from}-${to}`;
        const edge: CanvasEdge = { id, from, to };
        return {
          ...state,
          edges: { ...edges, [id]: edge },
          selection: { kind: 'edge' as const, id },
        };
      },
      inverse: () => null,
    },
    DISCONNECT_EDGE: {
      apply: (state: CanvasState, payload: { id: string }) => {
        const edges = { ...(state.edges ?? {}) };
        if (!edges[payload.id]) return state;
        delete edges[payload.id];
        const selection =
          state.selection.kind === 'edge' && state.selection.id === payload.id
            ? ({ kind: 'none' } as const)
            : state.selection;
        return { ...state, edges, selection };
      },
      inverse: () => null,
    },
    SET_VIEWPORT: {
      apply: (state: CanvasState, payload: SetViewportPayload) => ({
        ...state,
        viewport: {
          x: Number.isFinite(payload.x as number) ? (payload.x as number) : state.viewport.x,
          y: Number.isFinite(payload.y as number) ? (payload.y as number) : state.viewport.y,
          zoom: payload.zoom != null ? clampZoom(payload.zoom) : state.viewport.zoom,
        },
      }),
      inverse: () => null,
    },
    SELECT: {
      apply: (state: CanvasState, payload: SelectPayload) => ({ ...state, selection: payload }),
      inverse: () => null,
    },
    CLEAR_SELECTION: {
      apply: (state: CanvasState) => ({ ...state, selection: { kind: 'none' } }),
      inverse: () => null,
    },
  },
  render: CanvasView,
});
