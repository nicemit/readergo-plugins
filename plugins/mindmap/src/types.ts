export const MINDMAP_ROOT_ID = 'root';

export type MindNode = {
  id: string;
  parentId: string | null;
  text: string;
  order: number;
};

export type MindmapData = {
  nodes: Record<string, MindNode>;
};

export function emptyMindmap(): MindmapData {
  return {
    nodes: {
      [MINDMAP_ROOT_ID]: {
        id: MINDMAP_ROOT_ID,
        parentId: null,
        text: 'Central idea',
        order: 0,
      },
    },
  };
}

export function normalizeMindmap(raw: unknown): MindmapData {
  const base = emptyMindmap();
  if (!raw || typeof raw !== 'object') return base;
  const nodesRaw = (raw as { nodes?: unknown }).nodes;
  if (!nodesRaw || typeof nodesRaw !== 'object' || Array.isArray(nodesRaw)) return base;

  const nodes: Record<string, MindNode> = {};
  for (const [id, value] of Object.entries(nodesRaw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const parentId = row.parentId === null || typeof row.parentId === 'string' ? row.parentId : null;
    nodes[id] = {
      id,
      parentId: id === MINDMAP_ROOT_ID ? null : parentId,
      text: typeof row.text === 'string' ? row.text : '',
      order: typeof row.order === 'number' ? row.order : 0,
    };
  }

  if (!nodes[MINDMAP_ROOT_ID]) {
    nodes[MINDMAP_ROOT_ID] = base.nodes[MINDMAP_ROOT_ID];
  }
  nodes[MINDMAP_ROOT_ID].parentId = null;
  return { nodes };
}

export function childrenOf(data: MindmapData, parentId: string): MindNode[] {
  return Object.values(data.nodes)
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function outlineMindmap(data: MindmapData): string {
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const node = data.nodes[id];
    if (!node) return;
    lines.push(`${'  '.repeat(depth)}${node.text}`);
    for (const child of childrenOf(data, id)) walk(child.id, depth + 1);
  };
  walk(MINDMAP_ROOT_ID, 0);
  return lines.join('\n');
}
