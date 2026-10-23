import { createEngine, type PluginEngine } from '@readergo/plugin-sdk';

export interface Node {
    id: string;
    x: number;
    y: number;
    content: string;
    type?: 'engine' | 'db' | 'module' | 'sync' | 'analytics';
    documentId?: string;
}

export interface Edge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

export interface GraphState {
    nodes: Node[];
    edges: Edge[];
    pan: { x: number; y: number };
    zoom: number;
    selectedNodeIds: string[];
    selectedEdgeIds: string[];
    hoveredNodeId: string | null;
    hoveredEdgeId: string | null;
    editingNodeId: string | null;
    editingEdgeId: string | null;
    connecting: { sourceId: string | null; position: { x: number; y: number } };
    history: { nodes: Node[]; edges: Edge[] }[];
    historyIndex: number;
    isDirty: boolean;
    clipboard: { nodes: Node[]; edges: Edge[] } | null;
}

export const defaultGraphState: GraphState = {
    nodes: [],
    edges: [],
    pan: { x: 0, y: 0 },
    zoom: 1,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    hoveredNodeId: null,
    hoveredEdgeId: null,
    editingNodeId: null,
    editingEdgeId: null,
    connecting: { sourceId: null, position: { x: 0, y: 0 } },
    history: [],
    historyIndex: -1,
    isDirty: false,
    clipboard: null
};

const deepClone = <T>(obj: T): T => {
    return typeof structuredClone === 'function' 
        ? structuredClone(obj) 
        : JSON.parse(JSON.stringify(obj));
};

export function createGraphEngine(initialState: { nodes: Node[]; edges: Edge[] }) {
    const state: GraphState = {
        ...defaultGraphState,
        nodes: initialState.nodes || [],
        edges: initialState.edges || [],
        history: [{ nodes: deepClone(initialState.nodes || []), edges: deepClone(initialState.edges || []) }],
        historyIndex: 0
    };

    return createEngine<GraphState, any>({
        initialState: state,
        actions: (set, get) => {
            const pushToHistory = (nodes: Node[], edges: Edge[], markDirty: boolean = true) => {
                const snapshot = deepClone({ nodes, edges });
                set(s => {
                    const currentHistory = s.history.slice(0, s.historyIndex + 1);
                    if (currentHistory.length >= 50) currentHistory.shift();
                    return {
                        ...s,
                        history: [...currentHistory, snapshot],
                        historyIndex: Math.min(s.historyIndex + 1, 49),
                        isDirty: markDirty ? true : s.isDirty
                    };
                });
            };

            return {
                replaceState: (newState: { nodes?: Node[]; edges?: Edge[] }, options?: { markDirty?: boolean }) => {
                    const nodes = newState.nodes ?? [];
                    const edges = newState.edges ?? [];
                    const markDirty = options?.markDirty ?? false;
                    set(s => {
                        const nextState = {
                            ...s,
                            nodes,
                            edges,
                            history: [{ nodes: deepClone(nodes), edges: deepClone(edges) }],
                            historyIndex: 0,
                            isDirty: markDirty,
                        };
                        return nextState;
                    });
                },
                setPan: (pan: { x: number; y: number }) => {
                    set(s => ({ ...s, pan }));
                },
                setZoom: (zoom: number) => {
                    set(s => ({ ...s, zoom }));
                },
                addNode: (node?: Partial<Node>) => {
                    const s = get();
                    const id = crypto.randomUUID();
                    // Roughly scatter near center if coordinates not provided
                    const newNode: Node = {
                        id,
                        x: node?.x !== undefined ? node.x : Math.random() * 400 + 100 - s.pan.x,
                        y: node?.y !== undefined ? node.y : Math.random() * 300 + 100 - s.pan.y,
                        content: node?.content || 'New Node'
                    };
                    const nextNodes = [...s.nodes, newNode];
                    set(s => ({ ...s, nodes: nextNodes }));
                    pushToHistory(nextNodes, s.edges);
                },
                updateNode: (id: string, partial: Partial<Node>) => {
                    const s = get();
                    const nextNodes = s.nodes.map(n => n.id === id ? { ...n, ...partial } : n);
                    set(s => ({ ...s, nodes: nextNodes }));
                    if (partial.content !== undefined || partial.type !== undefined) {
                        pushToHistory(nextNodes, s.edges);
                    }
                },
                moveNode: (id: string, x: number, y: number) => {
                    set(s => ({
                        ...s,
                        nodes: s.nodes.map(n => n.id === id ? { ...n, x, y } : n)
                    }));
                },
                commitMove: () => {
                    const s = get();
                    pushToHistory(s.nodes, s.edges);
                },
                connectNodes: (sourceId: string, targetId: string) => {
                    console.log('[ENGINE] connectNodes called', sourceId, targetId);
                    if (sourceId === targetId) return;
                    const s = get();
                    const exists = s.edges.some(e => 
                        (e.source === sourceId && e.target === targetId) ||
                        (e.source === targetId && e.target === sourceId)
                    );
                    if (exists) { console.log('[ENGINE] edge already exists, skipping'); return; }

                    const newEdge: Edge = {
                        id: crypto.randomUUID(),
                        source: sourceId,
                        target: targetId
                    };
                    const nextEdges = [...s.edges, newEdge];
                    set(s => ({ ...s, edges: nextEdges }));
                    pushToHistory(s.nodes, nextEdges);
                    console.log('[ENGINE] edges after connect', nextEdges);
                },
                deleteNode: (id: string) => {
                    const s = get();
                    const nextNodes = s.nodes.filter(n => n.id !== id);
                    const nextEdges = s.edges.filter(e => e.source !== id && e.target !== id);
                    set(s => ({
                        ...s,
                        nodes: nextNodes,
                        edges: nextEdges,
                        selectedNodeIds: s.selectedNodeIds.filter(nid => nid !== id)
                    }));
                    pushToHistory(nextNodes, nextEdges);
                },
                deleteSelection: () => {
                    const s = get();
                    const { selectedNodeIds, selectedEdgeIds } = s;
                    const nextNodes = s.nodes.filter(n => !selectedNodeIds.includes(n.id));
                    const nextEdges = s.edges.filter(e => 
                        !selectedEdgeIds.includes(e.id) && 
                        !selectedNodeIds.includes(e.source) && 
                        !selectedNodeIds.includes(e.target)
                    );
                    set(s => ({
                        ...s,
                        nodes: nextNodes,
                        edges: nextEdges,
                        selectedNodeIds: [],
                        selectedEdgeIds: []
                    }));
                    pushToHistory(nextNodes, nextEdges);
                },
                setSelectedNodes: (ids: string[]) => {
                    set(s => ({ ...s, selectedNodeIds: ids, selectedEdgeIds: [] })); // Clear edges on node select usually
                },
                setSelectedEdges: (ids: string[]) => {
                    set(s => ({ ...s, selectedEdgeIds: ids, selectedNodeIds: [] }));
                },
                setHoveredNode: (id: string | null) => {
                    set(s => ({ ...s, hoveredNodeId: id }));
                },
                setHoveredEdge: (id: string | null) => {
                    set(s => ({ ...s, hoveredEdgeId: id }));
                },
                setEditingNode: (id: string | null) => {
                    set(s => ({ ...s, editingNodeId: id }));
                },
                setEditingEdge: (id: string | null) => {
                    set(s => ({ ...s, editingEdgeId: id }));
                },
                updateEdgeLabel: (id: string, label: string) => {
                    const s = get();
                    const nextEdges = s.edges.map(e => e.id === id ? { ...e, label } : e);
                    set(s => ({ ...s, edges: nextEdges, editingEdgeId: null }));
                    pushToHistory(s.nodes, nextEdges);
                },
                setConnecting: (sourceId: string | null, position: { x: number; y: number }) => {
                    set(s => ({ ...s, connecting: { sourceId, position } }));
                },
                undo: () => {
                    const s = get();
                    if (s.historyIndex > 0) {
                        const prevIndex = s.historyIndex - 1;
                        const prev = s.history[prevIndex];
                        set(s => ({
                            ...s,
                            nodes: deepClone(prev.nodes),
                            edges: deepClone(prev.edges),
                            historyIndex: prevIndex
                        }));
                    }
                },
                redo: () => {
                    const s = get();
                    if (s.historyIndex < s.history.length - 1) {
                        const nextIndex = s.historyIndex + 1;
                        const next = s.history[nextIndex];
                        set(s => ({
                            ...s,
                            nodes: deepClone(next.nodes),
                            edges: deepClone(next.edges),
                            historyIndex: nextIndex
                        }));
                    }
                },
                setDirty: (isDirty: boolean) => {
                    set(s => ({ ...s, isDirty }));
                },
                autoLayout: () => {
                    const s = get();
                    if (s.nodes.length === 0) return;

                    const nodes = deepClone(s.nodes);
                    const edges = s.edges;

                    // BFS logic (same as GraphEditor.tsx)
                    const incomingCount: { [id: string]: number } = {};
                    edges.forEach(e => { incomingCount[e.target] = (incomingCount[e.target] || 0) + 1; });

                    const roots = nodes.filter(n => !incomingCount[n.id]);
                    if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);

                    const visited = new Set<string>();
                    const queue: { id: string; depth: number }[] = roots.map(r => ({ id: r.id, depth: 0 }));
                    const nodesByDepth: { [depth: number]: string[] } = {};

                    while (queue.length > 0) {
                        const { id, depth } = queue.shift()!;
                        if (visited.has(id)) continue;
                        visited.add(id);

                        nodesByDepth[depth] = nodesByDepth[depth] || [];
                        nodesByDepth[depth].push(id);

                        edges.filter(e => e.source === id).forEach(e => {
                            queue.push({ id: e.target, depth: depth + 1 });
                        });
                    }

                    Object.keys(nodesByDepth).forEach(dKey => {
                        const depth = parseInt(dKey);
                        const levelNodes = nodesByDepth[depth];
                        const startY = - (levelNodes.length * 90) / 2;

                        levelNodes.forEach((id, index) => {
                            const nodeToMove = nodes.find(n => n.id === id);
                            if (nodeToMove) {
                                nodeToMove.x = depth * 250;
                                nodeToMove.y = startY + (index * 110);
                            }
                        });
                    });

                    let orphanY = 400;
                    nodes.forEach(n => {
                        if (!visited.has(n.id)) {
                            n.x = 0;
                            n.y = orphanY;
                            orphanY += 100;
                        }
                    });

                    set(s => ({ ...s, nodes }));
                    pushToHistory(nodes, edges);
                },
                copy: () => {
                    const s = get();
                    const nodesToCopy = s.nodes.filter(n => s.selectedNodeIds.includes(n.id));
                    const edgesToCopy = s.edges.filter(e => 
                        s.selectedNodeIds.includes(e.source) && s.selectedNodeIds.includes(e.target)
                    );
                    set(s => ({ ...s, clipboard: { nodes: deepClone(nodesToCopy), edges: deepClone(edgesToCopy) } }));
                },
                paste: (pasteX: number, pasteY: number) => {
                    const s = get();
                    const { clipboard } = s;
                    if (!clipboard || clipboard.nodes.length === 0) return;

                    const minX = Math.min(...clipboard.nodes.map(n => n.x));
                    const minY = Math.min(...clipboard.nodes.map(n => n.y));

                    const idMap: { [key: string]: string } = {};
                    const newNodes = clipboard.nodes.map(n => {
                        const newId = crypto.randomUUID();
                        idMap[n.id] = newId;
                        return {
                            ...n,
                            id: newId,
                            x: pasteX + (n.x - minX),
                            y: pasteY + (n.y - minY),
                            documentId: undefined
                        };
                    });

                    const newEdges = clipboard.edges.map(e => ({
                        id: crypto.randomUUID(),
                        source: idMap[e.source],
                        target: idMap[e.target],
                        label: e.label
                    })).filter(e => e.source && e.target);

                    const nextNodes = [...s.nodes, ...newNodes];
                    const nextEdges = [...s.edges, ...newEdges];

                    set(s => ({
                        ...s,
                        nodes: nextNodes,
                        edges: nextEdges,
                        selectedNodeIds: newNodes.map(n => n.id),
                        selectedEdgeIds: []
                    }));
                    pushToHistory(nextNodes, nextEdges);
                },
                duplicate: () => {
                    const s = get();
                    const nodesToDup = s.nodes.filter(n => s.selectedNodeIds.includes(n.id));
                    const edgesToDup = s.edges.filter(e => 
                        s.selectedNodeIds.includes(e.source) && s.selectedNodeIds.includes(e.target)
                    );

                    const idMap: { [key: string]: string } = {};
                    const newNodes = nodesToDup.map(n => {
                        const newId = crypto.randomUUID();
                        idMap[n.id] = newId;
                        return {
                            ...n,
                            id: newId,
                            x: n.x + 40,
                            y: n.y + 40,
                            documentId: undefined
                        };
                    });

                    const newEdges = edgesToDup.map(e => ({
                        id: crypto.randomUUID(),
                        source: idMap[e.source],
                        target: idMap[e.target],
                        label: e.label
                    }));

                    const nextNodes = [...s.nodes, ...newNodes];
                    const nextEdges = [...s.edges, ...newEdges];

                    set(s => ({
                        ...s,
                        nodes: nextNodes,
                        edges: nextEdges,
                        selectedNodeIds: newNodes.map(n => n.id),
                        selectedEdgeIds: []
                    }));
                    pushToHistory(nextNodes, nextEdges);
                }
            };
        }
    });
}
