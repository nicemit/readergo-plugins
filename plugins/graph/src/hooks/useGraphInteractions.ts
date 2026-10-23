import { useState, useEffect, useRef } from 'react';
import { screenToCanvas } from '../core/coordinateSystem';

// ─── INTERACTION STATE MACHINE ───
// Only ONE state can be active at a time. No conflicts possible.
type InteractionState =
    | { type: 'idle' }
    | { type: 'drag-node'; nodeId: string; startX: number; startY: number; nodeStartPositions: { [id: string]: { x: number; y: number } } }
    | { type: 'connect'; sourceId: string }
    | { type: 'pan'; startX: number; startY: number }
    | { type: 'select-box' };

const IDLE: InteractionState = { type: 'idle' };
export const GRAPH_NODE_WIDTH = 200;
export const GRAPH_NODE_HEIGHT = 56;
/** Extra hit padding (world units) when finishing a connect drag. */
const CONNECT_SNAP_PAD = 36;

function localPointFromClient(
    canvas: HTMLDivElement | null,
    clientX: number,
    clientY: number,
): { x: number; y: number } {
    const rect = canvas?.getBoundingClientRect();
    return {
        x: clientX - (rect?.left ?? 0),
        y: clientY - (rect?.top ?? 0),
    };
}

function findConnectTarget(
    nodes: Array<{ id: string; x: number; y: number }>,
    canvasPoint: { x: number; y: number },
    sourceId: string,
) {
    let best: { id: string; x: number; y: number } | null = null;
    let bestDist = Infinity;

    for (const node of nodes) {
        if (node.id === sourceId) continue;
        const left = node.x - CONNECT_SNAP_PAD;
        const right = node.x + GRAPH_NODE_WIDTH + CONNECT_SNAP_PAD;
        const top = node.y - CONNECT_SNAP_PAD;
        const bottom = node.y + GRAPH_NODE_HEIGHT + CONNECT_SNAP_PAD;
        if (
            canvasPoint.x < left ||
            canvasPoint.x > right ||
            canvasPoint.y < top ||
            canvasPoint.y > bottom
        ) {
            continue;
        }
        const cx = node.x + GRAPH_NODE_WIDTH / 2;
        const cy = node.y + GRAPH_NODE_HEIGHT / 2;
        const dist = Math.hypot(canvasPoint.x - cx, canvasPoint.y - cy);
        if (dist < bestDist) {
            bestDist = dist;
            best = node;
        }
    }

    return best;
}

export function useGraphInteractions(engine: any, canvasRef: React.RefObject<HTMLDivElement | null>, syncToHost: () => void) {
    const interactionRef = useRef<InteractionState>(IDLE);
    const isSpacePressedRef = useRef(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const editLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectHoverRef = useRef<string | null>(null);

    const clearEditTimer = () => {
        if (editLongPressTimerRef.current) {
            clearTimeout(editLongPressTimerRef.current);
            editLongPressTimerRef.current = null;
        }
    };

    // ─── GLOBAL LISTENERS ───
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                isSpacePressedRef.current = true;
                setIsSpacePressed(true);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                engine.actions.deleteSelection();
                syncToHost();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                engine.actions.copy();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                const s = engine.getState();
                engine.actions.paste((-s.pan.x + 100) / s.zoom, (-s.pan.y + 100) / s.zoom);
                syncToHost();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                engine.actions.duplicate();
                syncToHost();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) { engine.actions.redo(); } else { engine.actions.undo(); }
                syncToHost();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                isSpacePressedRef.current = false;
                setIsSpacePressed(false);
            }
        };

        const finalizeConnect = (clientX: number, clientY: number, sourceId: string) => {
            const s = engine.getState();
            const rect = canvasRef.current?.getBoundingClientRect();
            let targetNode = null;
            if (rect) {
                const canvasPoint = screenToCanvas(
                    clientX,
                    clientY,
                    s.pan,
                    s.zoom,
                    { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                );
                targetNode = findConnectTarget(s.nodes, canvasPoint, sourceId);
            }

            if (targetNode && targetNode.id !== sourceId) {
                engine.actions.connectNodes(sourceId, targetNode.id);
                syncToHost();
            }

            engine.actions.setConnecting(null, { x: 0, y: 0 });
            engine.actions.setHoveredNode(null);
            connectHoverRef.current = null;
        };

        const handleGlobalPointerUp = (e: PointerEvent) => {
            const interaction = interactionRef.current;
            clearEditTimer();

            switch (interaction.type) {
                case 'connect':
                    finalizeConnect(e.clientX, e.clientY, interaction.sourceId);
                    break;

                case 'drag-node':
                    engine.actions.commitMove();
                    syncToHost();
                    break;

                case 'pan':
                case 'select-box':
                case 'idle':
                    break;
            }

            interactionRef.current = IDLE;
        };

        const handleGlobalPointerCancel = (e: PointerEvent) => {
            handleGlobalPointerUp(e);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerCancel);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerCancel);
            clearEditTimer();
        };
    }, [engine, syncToHost, canvasRef]);

    // ─── POINTER DOWN: canvas background ───
    const onCanvasPointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target !== canvasRef.current && target.id !== 'grid-bg') return;

        engine.actions.setEditingNode(null);
        try {
            canvasRef.current?.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }

        // Touch / middle / Space → pan. Mouse left without Space → select box.
        const shouldPan =
            isSpacePressedRef.current ||
            e.button === 1 ||
            e.pointerType === 'touch' ||
            e.pointerType === 'pen';

        if (shouldPan) {
            const s = engine.getState();
            interactionRef.current = {
                type: 'pan',
                startX: e.clientX - s.pan.x,
                startY: e.clientY - s.pan.y,
            };
            return;
        }

        if (e.button === 0) {
            engine.actions.setSelectedNodes([]);
            engine.actions.setSelectedEdges([]);
            interactionRef.current = { type: 'select-box' };
        }
    };

    // ─── POINTER DOWN: on a node ───
    const onNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
        e.stopPropagation();

        // Two-step connect: while linking, tap another node to finish.
        if (interactionRef.current.type === 'connect') {
            const { sourceId } = interactionRef.current;
            if (nodeId !== sourceId) {
                engine.actions.connectNodes(sourceId, nodeId);
                syncToHost();
            }
            engine.actions.setConnecting(null, { x: 0, y: 0 });
            engine.actions.setHoveredNode(null);
            connectHoverRef.current = null;
            interactionRef.current = IDLE;
            return;
        }

        const s = engine.getState();
        const node = s.nodes.find((n: any) => n.id === nodeId);
        if (!node) return;

        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }

        const isSelected = s.selectedNodeIds.includes(nodeId);
        const nodeStartPositions: { [id: string]: { x: number; y: number } } = {};

        if (isSelected) {
            s.selectedNodeIds.forEach((id: string) => {
                const n = s.nodes.find((item: any) => item.id === id);
                if (n) nodeStartPositions[id] = { x: n.x, y: n.y };
            });
        } else {
            nodeStartPositions[nodeId] = { x: node.x, y: node.y };
            engine.actions.setSelectedNodes([nodeId]);
        }

        interactionRef.current = {
            type: 'drag-node',
            nodeId,
            startX: e.clientX,
            startY: e.clientY,
            nodeStartPositions,
        };

        if (e.pointerType === 'touch') {
            clearEditTimer();
            editLongPressTimerRef.current = setTimeout(() => {
                engine.actions.setEditingNode(nodeId);
                editLongPressTimerRef.current = null;
            }, 450);
        }
    };

    // ─── POINTER MOVE ───
    const onPointerMove = (e: React.PointerEvent) => {
        const interaction = interactionRef.current;

        switch (interaction.type) {
            case 'connect': {
                const local = localPointFromClient(canvasRef.current, e.clientX, e.clientY);
                engine.actions.setConnecting(interaction.sourceId, local);

                const s = engine.getState();
                const rect = canvasRef.current?.getBoundingClientRect();
                if (rect) {
                    const canvasPoint = screenToCanvas(
                        e.clientX,
                        e.clientY,
                        s.pan,
                        s.zoom,
                        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                    );
                    const target = findConnectTarget(s.nodes, canvasPoint, interaction.sourceId);
                    const nextHover = target?.id ?? null;
                    if (nextHover !== connectHoverRef.current) {
                        connectHoverRef.current = nextHover;
                        engine.actions.setHoveredNode(nextHover);
                    }
                }
                break;
            }

            case 'pan':
                engine.actions.setPan({
                    x: e.clientX - interaction.startX,
                    y: e.clientY - interaction.startY,
                });
                break;

            case 'drag-node': {
                const dx = e.clientX - interaction.startX;
                const dy = e.clientY - interaction.startY;
                if (Math.hypot(dx, dy) > 8) {
                    clearEditTimer();
                }

                Object.entries(interaction.nodeStartPositions).forEach(([id, start]) => {
                    engine.actions.moveNode(
                        id,
                        Math.round((start.x + dx) / 20) * 20,
                        Math.round((start.y + dy) / 20) * 20,
                    );
                });
                break;
            }

            default:
                break;
        }
    };

    // ─── POINTER UP (React): transient UI only ───
    const onPointerUp = () => {
        // No-op. Global handler owns all finalization.
    };

    // ─── HANDLE: start edge connection from connector dot ───
    const onHandlePointerDown = (e: React.PointerEvent, nodeId: string) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        const local = localPointFromClient(canvasRef.current, e.clientX, e.clientY);
        interactionRef.current = { type: 'connect', sourceId: nodeId };
        engine.actions.setConnecting(nodeId, local);
        engine.actions.setSelectedNodes([nodeId]);
    };

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const s = engine.getState();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const nextZoom = Math.min(2.5, Math.max(0.35, s.zoom * factor));
        if (nextZoom === s.zoom) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) {
            engine.actions.setZoom(nextZoom);
            return;
        }

        // Zoom toward cursor (screen-local → keep world point under cursor).
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        const worldX = lx / s.zoom - s.pan.x;
        const worldY = ly / s.zoom - s.pan.y;
        engine.actions.setZoom(nextZoom);
        engine.actions.setPan({
            x: lx / nextZoom - worldX,
            y: ly / nextZoom - worldY,
        });
    };

    return {
        onCanvasPointerDown,
        onNodePointerDown,
        onHandlePointerDown,
        onPointerMove,
        onPointerUp,
        onWheel,
        isSpacePressed,
    };
}
