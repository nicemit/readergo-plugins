import type { CanvasPersistedData, CanvasPersistedEdge, CanvasPersistedNode, CanvasState } from './types';

export function serializeCanvasForPersist(state: CanvasState): CanvasPersistedData {
  const nodes: Record<string, CanvasPersistedNode> = {};
  for (const [key, n] of Object.entries(state.nodes)) {
    nodes[key] = {
      refId: n.refId,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    };
  }
  const edges: Record<string, CanvasPersistedEdge> = {};
  for (const [key, e] of Object.entries(state.edges ?? {})) {
    edges[key] = { from: e.from, to: e.to };
  }
  return {
    nodes,
    edges,
    viewport: state.viewport,
    gridSize: state.gridSize,
  };
}
