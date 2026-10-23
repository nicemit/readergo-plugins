export type CanvasNode = {
  /** Stable key for this card on the board (not the document id). */
  id: string;
  /** Real note/document id in storage. */
  refId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasEdge = {
  id: string;
  from: string;
  to: string;
};

export type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type CanvasSelection =
  | { kind: 'none' }
  | { kind: 'node'; id: string }
  | { kind: 'nodes'; ids: string[] }
  | { kind: 'edge'; id: string };

export type CanvasState = {
  nodes: Record<string, CanvasNode>;
  edges: Record<string, CanvasEdge>;
  viewport: CanvasViewport;
  selection: CanvasSelection;
  gridSize: number;
};

/** Subset written to `document.data` (layout projection only). */
export type CanvasPersistedNode = {
  refId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasPersistedEdge = {
  from: string;
  to: string;
};

export type CanvasPersistedData = {
  nodes: Record<string, CanvasPersistedNode>;
  edges: Record<string, CanvasPersistedEdge>;
  viewport: CanvasViewport;
  gridSize: number;
};
