import type { CanvasSelection } from './types';

export function selectionNodeIds(s: CanvasSelection): string[] {
  if (s.kind === 'node') return [s.id];
  if (s.kind === 'nodes') return s.ids;
  return [];
}

export function isNodeInSelection(s: CanvasSelection, id: string): boolean {
  if (s.kind === 'node') return s.id === id;
  if (s.kind === 'nodes') return s.ids.includes(id);
  return false;
}

export function primarySelectedNodeId(s: CanvasSelection): string | null {
  if (s.kind === 'node') return s.id;
  if (s.kind === 'nodes' && s.ids.length > 0) return s.ids[0]!;
  return null;
}

export function normalizeNodesSelection(ids: string[]): CanvasSelection {
  const u = [...new Set(ids)];
  if (u.length === 0) return { kind: 'none' };
  if (u.length === 1) return { kind: 'node', id: u[0]! };
  return { kind: 'nodes', ids: u };
}
