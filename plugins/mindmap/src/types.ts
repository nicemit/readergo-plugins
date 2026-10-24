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

/**
 * Parses markdown or indented text outline into a MindmapData structure.
 * Handles headings (# Heading), bullets (- Bullet, * Bullet, + Bullet),
 * numbered lists (1. Item), or indented plain lines.
 */
export function parseMindmapOutline(text: string): MindmapData {
  const base = emptyMindmap();
  if (!text || typeof text !== 'string') return base;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return base;

  const nodes: Record<string, MindNode> = {};
  const depthStack: string[] = [];
  let counter = 1;
  let rootHasHeading = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const matchIndent = rawLine.match(/^(\s*)/);
    const leadingSpaces = matchIndent ? matchIndent[1].replace(/\t/g, '  ').length : 0;
    const headingMatch = rawLine.match(/^(#+)\s+/);

    const cleanText = rawLine
      .trim()
      .replace(/^(?:#+\s*|[-*+]\s+|\d+\.\s+)/, '')
      .trim();

    if (!cleanText) continue;

    if (i === 0 || !nodes[MINDMAP_ROOT_ID]) {
      if (headingMatch) {
        rootHasHeading = true;
      }
      nodes[MINDMAP_ROOT_ID] = {
        id: MINDMAP_ROOT_ID,
        parentId: null,
        text: cleanText,
        order: 0,
      };
      depthStack[0] = MINDMAP_ROOT_ID;
      continue;
    }

    let depth = 1;
    if (headingMatch) {
      depth = Math.max(1, headingMatch[1].length - 1);
    } else {
      const indentLevel = Math.floor(leadingSpaces / 2);
      depth = rootHasHeading ? 1 + indentLevel : Math.max(1, indentLevel);
    }

    let parentId = depthStack[depth - 1];
    if (!parentId || !nodes[parentId]) {
      parentId = depthStack[0] || MINDMAP_ROOT_ID;
    }

    const id = `node-${counter++}`;
    nodes[id] = {
      id,
      parentId,
      text: cleanText,
      order: counter,
    };
    depthStack[depth] = id;
    depthStack.length = depth + 1;
  }

  if (!nodes[MINDMAP_ROOT_ID]) {
    nodes[MINDMAP_ROOT_ID] = base.nodes[MINDMAP_ROOT_ID];
  }

  return { nodes };
}

function normalizeNodeMap(nodesRaw: Record<string, unknown>): MindmapData {
  const base = emptyMindmap();
  const entries = Object.entries(nodesRaw);
  if (entries.length === 0) return base;

  let rootKey = entries.find(([k]) => k === MINDMAP_ROOT_ID)?.[0];
  if (!rootKey) {
    const nullParentEntry = entries.find(([, val]) => {
      if (!val || typeof val !== 'object') return false;
      const row = val as Record<string, unknown>;
      return row.parentId === null || row.parentId === undefined || row.parent === null;
    });
    rootKey = nullParentEntry ? nullParentEntry[0] : entries[0][0];
  }

  const nodes: Record<string, MindNode> = {};
  for (const [key, value] of entries) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const isRoot = key === rootKey;
    const assignedId = isRoot ? MINDMAP_ROOT_ID : (typeof row.id === 'string' && row.id ? row.id : key);
    let rawParent = row.parentId !== undefined ? row.parentId : row.parent;
    if (rawParent === rootKey) rawParent = MINDMAP_ROOT_ID;
    const parentId = isRoot ? null : (typeof rawParent === 'string' ? rawParent : MINDMAP_ROOT_ID);
    const text = typeof row.text === 'string' ? row.text : (typeof row.title === 'string' ? row.title : '');
    const order = typeof row.order === 'number' ? row.order : 0;

    nodes[assignedId] = {
      id: assignedId,
      parentId,
      text,
      order,
    };
  }

  if (!nodes[MINDMAP_ROOT_ID]) {
    nodes[MINDMAP_ROOT_ID] = base.nodes[MINDMAP_ROOT_ID];
  }
  nodes[MINDMAP_ROOT_ID].parentId = null;
  return { nodes };
}

function normalizeTree(rootTree: Record<string, unknown>): MindmapData {
  const nodes: Record<string, MindNode> = {};
  let counter = 1;

  const walk = (nodeObj: Record<string, unknown>, parentId: string | null, isRoot: boolean): string => {
    const id = isRoot ? MINDMAP_ROOT_ID : (typeof nodeObj.id === 'string' && nodeObj.id ? nodeObj.id : `node-${counter++}`);
    const text = typeof nodeObj.text === 'string' ? nodeObj.text : (typeof nodeObj.title === 'string' ? nodeObj.title : (isRoot ? 'Central idea' : ''));
    const order = typeof nodeObj.order === 'number' ? nodeObj.order : counter;

    nodes[id] = {
      id,
      parentId,
      text,
      order,
    };

    if (Array.isArray(nodeObj.children)) {
      for (const child of nodeObj.children) {
        if (child && typeof child === 'object') {
          walk(child as Record<string, unknown>, id, false);
        }
      }
    }
    return id;
  };

  walk(rootTree, null, true);

  if (!nodes[MINDMAP_ROOT_ID]) {
    nodes[MINDMAP_ROOT_ID] = emptyMindmap().nodes[MINDMAP_ROOT_ID];
  }
  return { nodes };
}

function normalizeNodeList(list: unknown[]): MindmapData {
  const base = emptyMindmap();
  if (!list || list.length === 0) return base;

  if (list.length === 1 && typeof list[0] === 'object' && list[0] !== null) {
    const first = list[0] as Record<string, unknown>;
    if (Array.isArray(first.children)) {
      return normalizeTree(first);
    }
  }

  let rootIndex = list.findIndex((item) => {
    if (!item || typeof item !== 'object') return false;
    const row = item as Record<string, unknown>;
    return (
      row.id === MINDMAP_ROOT_ID ||
      row.parentId === null ||
      row.parentId === undefined ||
      row.parent === null ||
      row.parent === undefined
    );
  });
  if (rootIndex < 0) rootIndex = 0;

  const rootItem = (list[rootIndex] || {}) as Record<string, unknown>;
  const origRootId = typeof rootItem.id === 'string' ? rootItem.id : undefined;

  const nodes: Record<string, MindNode> = {};
  let counter = 1;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const isRoot = i === rootIndex;

    const id = isRoot
      ? MINDMAP_ROOT_ID
      : typeof row.id === 'string' && row.id && row.id !== MINDMAP_ROOT_ID
      ? row.id
      : `node-${counter++}`;

    let parentId: string | null = null;
    if (!isRoot) {
      const rawParent = row.parentId !== undefined ? row.parentId : row.parent;
      if (typeof rawParent === 'string') {
        parentId = (origRootId && rawParent === origRootId) || rawParent === MINDMAP_ROOT_ID ? MINDMAP_ROOT_ID : rawParent;
      } else {
        parentId = MINDMAP_ROOT_ID;
      }
    }

    const text = typeof row.text === 'string' ? row.text : (typeof row.title === 'string' ? row.title : '');
    const order = typeof row.order === 'number' ? row.order : i;

    nodes[id] = {
      id,
      parentId,
      text,
      order,
    };
  }

  if (!nodes[MINDMAP_ROOT_ID]) {
    nodes[MINDMAP_ROOT_ID] = base.nodes[MINDMAP_ROOT_ID];
  }
  nodes[MINDMAP_ROOT_ID].parentId = null;
  return { nodes };
}

export function normalizeMindmap(raw: unknown, fallbackContent?: string): MindmapData {
  const base = emptyMindmap();

  if (!raw || (typeof raw === 'object' && Object.keys(raw as object).length === 0)) {
    if (typeof fallbackContent === 'string' && fallbackContent.trim()) {
      return parseMindmapOutline(fallbackContent);
    }
    return base;
  }

  if (typeof raw === 'string') {
    try {
      const parsedJson = JSON.parse(raw);
      if (parsedJson && typeof parsedJson === 'object') {
        return normalizeMindmap(parsedJson, fallbackContent);
      }
    } catch {
      // Not JSON, continue to outline parsing
    }
    return parseMindmapOutline(raw);
  }

  const rawObj = raw as Record<string, unknown>;

  if (typeof rawObj.outline === 'string' && rawObj.outline.trim()) {
    return parseMindmapOutline(rawObj.outline);
  }
  if (typeof rawObj.markdown === 'string' && rawObj.markdown.trim()) {
    return parseMindmapOutline(rawObj.markdown);
  }

  if (Array.isArray(raw)) {
    return normalizeNodeList(raw);
  }

  if (Array.isArray(rawObj.nodes)) {
    return normalizeNodeList(rawObj.nodes);
  }

  if (rawObj.root && typeof rawObj.root === 'object') {
    return normalizeTree(rawObj.root as Record<string, unknown>);
  }
  if (typeof rawObj.text === 'string' && Array.isArray(rawObj.children)) {
    return normalizeTree(rawObj);
  }

  const nodesRaw = rawObj.nodes;
  if (nodesRaw && typeof nodesRaw === 'object' && !Array.isArray(nodesRaw)) {
    const normalized = normalizeNodeMap(nodesRaw as Record<string, unknown>);
    const keys = Object.keys(normalized.nodes);
    // If normalized only has default 'Central idea' and fallback content exists, try outline
    if (keys.length <= 1 && normalized.nodes[MINDMAP_ROOT_ID]?.text === 'Central idea') {
      if (typeof fallbackContent === 'string' && fallbackContent.trim()) {
        const outlineParsed = parseMindmapOutline(fallbackContent);
        if (Object.keys(outlineParsed.nodes).length > 1 || outlineParsed.nodes[MINDMAP_ROOT_ID]?.text !== 'Central idea') {
          return outlineParsed;
        }
      }
    }
    return normalized;
  }

  if (typeof fallbackContent === 'string' && fallbackContent.trim()) {
    return parseMindmapOutline(fallbackContent);
  }

  return base;
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
