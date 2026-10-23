'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EditorProps } from '@readergo/plugin-sdk';
import { useEngine } from '@readergo/plugin-sdk';
import { useGraphInteractions, GRAPH_NODE_WIDTH, GRAPH_NODE_HEIGHT } from '../hooks/useGraphInteractions';
import { canvasToScreen, getEdgeFactor } from '../core/coordinateSystem';
import { GraphState } from '../core/GraphEngine';
import { 
    Cpu, Database, Network, Activity, Server, Trash2, Plus, Save,
    Maximize, Grid, GitMerge, RotateCcw, RotateCw, ZoomIn, ZoomOut
} from 'lucide-react';

const NODE_W = GRAPH_NODE_WIDTH;
const NODE_H = GRAPH_NODE_HEIGHT;
const getNodeConfig = (type?: string) => {
    switch(type) {
        case 'engine': return { icon: Cpu, glow: 'rgba(168, 85, 247, 0.4)', border: 'border-purple-500/30', label: 'Engine' };
        case 'db': return { icon: Database, glow: 'rgba(34, 197, 94, 0.4)', border: 'border-green-500/30', label: 'DB' };
        case 'sync': return { icon: Network, glow: 'rgba(14, 165, 233, 0.4)', border: 'border-sky-500/30', label: 'Sync' };
        case 'analytics': return { icon: Activity, glow: 'rgba(236, 72, 153, 0.4)', border: 'border-pink-500/30', label: 'Stats' };
        default: return { icon: Server, glow: 'rgba(100, 116, 139, 0.4)', border: 'border-slate-500/30', label: 'Node' };
    }
};

export function GraphEditor({
    engine,
    onSave,
    onUnsavedChangesChange,
    onDataChange,
    className = '',
    currentNote,
    context
}: EditorProps & { engine: any; context?: any }) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const state = useEngine(engine) as GraphState;
    
    const syncToHost = useCallback(() => {
        if (!onDataChange) return;
        console.log('[SYNC CHECK] mutation triggered');
        console.log('[SYNC] sending state', engine.getState());
        onDataChange(engine.getState());
    }, [engine, onDataChange]);

    const nodeById = useMemo(() => {
        const map = new Map<string, any>();
        for (const node of state.nodes) {
            map.set(node.id, node);
        }
        return map;
    }, [state.nodes]);

    const interactions = useGraphInteractions(engine, canvasRef, syncToHost);

    const [editBuffer, setEditBuffer] = useState<string>('');
    const [edgeLabelBuffer, setEdgeLabelBuffer] = useState<string>('');
    
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'canvas' | 'node' | 'edge'; targetId?: string } | null>(null);
    const [gridVisible, setGridVisible] = useState<boolean>(true);
    const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    console.log('[GRAPH] render with note:', currentNote?.id, (currentNote as any)?.data);
    console.log('[GRAPH] engine instance:', engine);

    useEffect(() => {
        if (!context || !engine || !currentNote?.id) return;

        const instanceId = `graph-${currentNote.id}`;

        const cleanup = context.registerEditorCapability?.(instanceId, {
            actions: engine.actions,
            getState: engine.getState
        });

        context.setActiveEditor?.(instanceId);

        console.log('[GRAPH] Registered editor:', instanceId);
        console.log('[GRAPH] Active editor:', context.getActiveEditor?.());
        console.log('[GRAPH] Engine state:', engine.getState());

        return () => {
            console.log('[GRAPH] Cleanup editor:', instanceId);
            cleanup?.();
        };
    }, [context, engine, currentNote?.id]);

    useEffect(() => {
        onUnsavedChangesChange?.(state.isDirty);
    }, [state.isDirty, onUnsavedChangesChange]);

    const handleSave = () => {
        const snapshot = engine.getState();
        console.log('[SAVE] engine state', snapshot);
        onDataChange?.(snapshot);
        // Host reads latest `data` from refs; preserve any existing `content` on the document when present.
        const existingContent =
            currentNote && 'content' in currentNote && typeof (currentNote as { content?: string }).content === 'string'
                ? (currentNote as { content: string }).content
                : '';
        onSave?.(existingContent);
        engine.actions.setDirty(false);
    };

    const handleCanvasPointerDown = (e: React.PointerEvent) => {
        interactions.onCanvasPointerDown(e);
        // Select-box only for mouse primary without Space (touch pans instead).
        if (
            e.pointerType === 'mouse' &&
            e.button === 0 &&
            !interactions.isSpacePressed
        ) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                setSelectionBox({
                    x1: e.clientX - rect.left,
                    y1: e.clientY - rect.top,
                    x2: e.clientX - rect.left,
                    y2: e.clientY - rect.top,
                });
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        interactions.onPointerMove(e);
        if (selectionBox) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                setSelectionBox(prev => prev ? {
                    ...prev,
                    x2: e.clientX - rect.left,
                    y2: e.clientY - rect.top
                } : null);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        // Mutation finalization (commitMove, connectNodes, syncToHost) is handled
        // by the global window pointerup handler in useGraphInteractions.
        // React onPointerUp only manages transient UI like selection boxes.
        setSelectionBox(prev => {
            if (prev) {
                const x1 = Math.min(prev.x1, prev.x2);
                const x2 = Math.max(prev.x1, prev.x2);
                const y1 = Math.min(prev.y1, prev.y2);
                const y2 = Math.max(prev.y1, prev.y2);

                const nodesInBox = state.nodes.filter((node: any) => {
                    const screenPos = canvasToScreen(node.x, node.y, state.pan, state.zoom);
                    const nodeLeft = screenPos.x;
                    const nodeRight = screenPos.x + NODE_W * state.zoom;
                    const nodeTop = screenPos.y;
                    const nodeBottom = screenPos.y + NODE_H * state.zoom;
                    return nodeLeft >= x1 && nodeRight <= x2 && nodeTop >= y1 && nodeBottom <= y2;
                });

                engine.actions.setSelectedNodes(nodesInBox.map((n: any) => n.id));
            }
            return null;
        });
    };

    const handleContextMenu = (e: React.MouseEvent, type: 'canvas' | 'node' | 'edge', targetId?: string) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;
            setContextMenu({ x, y, type, targetId });

            if (type === 'node' && targetId) {
                engine.actions.setSelectedNodes([targetId]);
            } else if (type === 'edge' && targetId) {
                engine.actions.setSelectedEdges([targetId]);
            }
        }
    };

    const renderEdges = () => {
        return state.edges.map((edge: any) => {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);

            if (!sourceNode || !targetNode) return null;

            const { x: x1, y: y1 } = canvasToScreen(
                sourceNode.x + NODE_W,
                sourceNode.y + NODE_H / 2,
                state.pan,
                state.zoom,
            );
            const { x: x2, y: y2 } = canvasToScreen(
                targetNode.x,
                targetNode.y + NODE_H / 2,
                state.pan,
                state.zoom,
            );

            const factor = getEdgeFactor(x1, x2, state.zoom);
            const isSelected = state.selectedEdgeIds.includes(edge.id);
            const isHovered = state.hoveredEdgeId === edge.id;

            return (
                <g key={edge.id}>
                    <path 
                        d={`M ${x1} ${y1} C ${x1 + factor} ${y1}, ${x2 - factor} ${y2}, ${x2} ${y2}`}
                        stroke="transparent"
                        strokeWidth="16"
                        fill="none"
                        className="cursor-pointer pointer-events-auto"
                        onContextMenu={(e) => handleContextMenu(e, 'edge', edge.id)}
                        onPointerEnter={() => engine.actions.setHoveredEdge(edge.id)}
                        onPointerLeave={() => engine.actions.setHoveredEdge(null)}
                        onClick={(e) => {
                            e.stopPropagation();
                            engine.actions.setSelectedEdges([edge.id]);
                        }}
                    />
                    <path 
                        d={`M ${x1} ${y1} C ${x1 + factor} ${y1}, ${x2 - factor} ${y2}, ${x2} ${y2}`}
                        stroke={isSelected || isHovered ? "#a855f7" : "url(#edge-gradient)"}
                        strokeWidth={isSelected || isHovered ? "3" : "2"}
                        fill="none"
                        className={`transition-all duration-300 ${(isSelected || isHovered) ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'stroke-purple-500/40 dark:stroke-purple-400/30'}`}
                    />
                </g>
            );
        });
    };

    const renderPreviewEdge = () => {
        if (!state.connecting || !state.connecting.sourceId) return null;
        const sourceNode = nodeById.get(state.connecting.sourceId);
        if (!sourceNode) return null;

        // Preview tip uses canvas-local screen coords (same space as SVG).
        const { x: x1, y: y1 } = canvasToScreen(
            sourceNode.x + NODE_W,
            sourceNode.y + NODE_H / 2,
            state.pan,
            state.zoom,
        );
        const x2 = state.connecting.position.x;
        const y2 = state.connecting.position.y;

        const factor = getEdgeFactor(x1, x2, state.zoom);

        return (
            <path 
                d={`M ${x1} ${y1} C ${x1 + factor} ${y1}, ${x2 - factor} ${y2}, ${x2} ${y2}`}
                stroke="rgba(168, 85, 247, 0.85)"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                fill="none"
            />
        );
    };

    const renderEdgeLabels = () => {
        return state.edges.map(edge => {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);
            if (!sourceNode || !targetNode) return null;

            const { x: x1, y: y1 } = canvasToScreen(
                sourceNode.x + NODE_W,
                sourceNode.y + NODE_H / 2,
                state.pan,
                state.zoom,
            );
            const { x: x2, y: y2 } = canvasToScreen(
                targetNode.x,
                targetNode.y + NODE_H / 2,
                state.pan,
                state.zoom,
            );

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            if (!edge.label && state.editingEdgeId !== edge.id) return null;

            return (
                <div 
                    key={`label-${edge.id}`}
                    style={{ transform: `translate(${midX - 50}px, ${midY - 10}px)`, width: '100px' }}
                    className="absolute z-30 pointer-events-auto flex justify-center"
                >
                    {state.editingEdgeId === edge.id ? (
                        <input 
                            type="text"
                            value={edgeLabelBuffer}
                            onChange={(e) => setEdgeLabelBuffer(e.target.value)}
                            onBlur={() => { engine.actions.updateEdgeLabel(edge.id, edgeLabelBuffer); syncToHost(); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { engine.actions.updateEdgeLabel(edge.id, edgeLabelBuffer); syncToHost(); } }}
                            autoFocus
                            className="bg-slate-800 text-[10px] text-white rounded px-1.5 py-0.5 border border-purple-500 outline-none w-20 text-center"
                        />
                    ) : (
                        <span 
                            onDoubleClick={(e) => { e.stopPropagation(); engine.actions.setEditingEdge(edge.id); setEdgeLabelBuffer(edge.label || ''); }}
                            className="bg-slate-900/80 backdrop-blur-sm shadow border border-slate-800 text-[10px] text-slate-300 font-bold px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-slate-800"
                        >
                            {edge.label}
                        </span>
                    )}
                </div>
            );
        });
    };

    return (
        <div 
            ref={canvasRef}
            className={`w-full h-full min-h-[280px] sm:min-h-[500px] relative overflow-hidden bg-[#0d1117] select-none touch-none ${className}`}
            style={{ touchAction: 'none' }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={interactions.onWheel}
            onContextMenu={(e) => handleContextMenu(e, 'canvas')}
            onClick={() => setContextMenu(null)}
        >
            {gridVisible && (
                <div 
                    id="grid-bg"
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.08) 1.5px, transparent 1.5px)',
                        backgroundSize: `${32 * state.zoom}px ${32 * state.zoom}px`,
                        backgroundPosition: `${state.pan.x}px ${state.pan.y}px`,
                    }}
                />
            )}

            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                <defs>
                    <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4" />
                    </linearGradient>
                </defs>
                {renderEdges()}
                {renderPreviewEdge()}
            </svg>

            <div className="absolute inset-0 z-20 pointer-events-none">
                {renderEdgeLabels()}
                {state.nodes.map((node: any) => {
                    const config = getNodeConfig(node.type);
                    const Icon = config.icon;
                    const isSelected = state.selectedNodeIds.includes(node.id);
                    const isEditing = state.editingNodeId === node.id;
                    const isConnectTarget = state.hoveredNodeId === node.id && !!state.connecting;
                    const showPort = isSelected || isConnectTarget || !!state.connecting;

                    const screenCoords = canvasToScreen(node.x, node.y, state.pan, state.zoom);

                    return (
                        <div
                            key={node.id}
                            data-node-id={node.id}
                            style={{ 
                                transform: `translate(${screenCoords.x}px, ${screenCoords.y}px) scale(${state.zoom})`,
                                transformOrigin: '0 0',
                                width: `${NODE_W}px`,
                                height: `${NODE_H}px`,
                                boxShadow: isSelected || isConnectTarget
                                    ? `0 0 25px 0 ${isConnectTarget ? 'rgba(52,211,153,0.55)' : config.glow}`
                                    : `0 0 15px -3px ${config.glow}`,
                            }}
                            className={`group absolute cursor-grab rounded-xl backdrop-blur-md bg-slate-900/60 hover:bg-slate-900/80 border ${config.border} p-3 flex flex-col justify-center pointer-events-auto ${
                                isSelected
                                    ? 'ring-2 ring-purple-500'
                                    : isConnectTarget
                                      ? 'ring-2 ring-emerald-400'
                                      : 'hover:border-slate-600/50'
                            }`}
                            onPointerEnter={() => engine.actions.setHoveredNode(node.id)}
                            onPointerLeave={() => {
                                if (!state.connecting) engine.actions.setHoveredNode(null);
                            }}
                            onPointerDown={(e) => interactions.onNodePointerDown(e, node.id)}
                            onClick={(e) => { e.stopPropagation(); engine.actions.setSelectedNodes([node.id]); }}
                            onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                        >
                            <div className="flex items-center gap-2 mb-1.5 pr-6">
                                <Icon className="w-4 h-4 text-slate-100 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <input 
                                            value={editBuffer}
                                            onChange={(e) => setEditBuffer(e.target.value)}
                                            onBlur={() => { engine.actions.updateNode(node.id, { content: editBuffer }); engine.actions.setEditingNode(null); syncToHost(); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { engine.actions.updateNode(node.id, { content: editBuffer }); engine.actions.setEditingNode(null); syncToHost(); } }}
                                            autoFocus
                                            className="bg-transparent text-xs font-bold text-slate-100 w-full outline-none"
                                        />
                                    ) : (
                                        <span className="block text-xs font-bold text-slate-100 truncate">{node.content}</span>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                aria-label="Drag or tap to connect"
                                title="Drag to another node to connect"
                                className={[
                                    'absolute right-0 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full',
                                    'cursor-crosshair touch-manipulation',
                                    showPort ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                                ].join(' ')}
                                onPointerDown={(e) => interactions.onHandlePointerDown(e, node.id)}
                            >
                                <span
                                    className={[
                                        'block h-3.5 w-3.5 rounded-full border-2 border-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.85)]',
                                        isConnectTarget ? 'bg-emerald-300' : 'bg-emerald-400',
                                    ].join(' ')}
                                />
                            </button>

                            <div
                                className={`absolute -top-2 -right-2 flex items-center gap-1 transition-opacity actions px-1 z-40 ${
                                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                            >
                                <button 
                                    onClick={(e) => { e.stopPropagation(); engine.actions.deleteNode(node.id); syncToHost(); }}
                                    className="p-2 sm:p-1 rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-transform pointer-events-auto touch-manipulation"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectionBox && (
                <div 
                    style={{
                        left: Math.min(selectionBox.x1, selectionBox.x2),
                        top: Math.min(selectionBox.y1, selectionBox.y2),
                        width: Math.abs(selectionBox.x1 - selectionBox.x2),
                        height: Math.abs(selectionBox.y1 - selectionBox.y2)
                    }}
                    className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-50"
                />
            )}

            {contextMenu && (
                <div 
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    className="absolute z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl py-1.5 w-48 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.type === 'canvas' && (
                        <button 
                            onClick={() => { engine.actions.addNode(); setContextMenu(null); syncToHost(); }}
                            className="flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-slate-300 hover:text-white hover:bg-purple-500/20 w-full text-left"
                        >
                            <Plus className="w-3.5 h-3.5 text-purple-400" /> Add Node
                        </button>
                    )}
                    {contextMenu.type === 'node' && (
                        <button 
                            onClick={() => { engine.actions.deleteSelection(); setContextMenu(null); syncToHost(); }}
                            className="flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs text-red-400 hover:bg-red-500/10 w-full text-left"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    )}
                </div>
            )}

            <div className="hidden sm:flex absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-slate-900/85 backdrop-blur-md shadow-2xl rounded-full border border-slate-800/80 px-5 py-2 items-center gap-3">
                <button 
                    onClick={() => { engine.actions.addNode(); syncToHost(); }} 
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white"
                >
                    <Plus className="w-4 h-4 text-purple-400" />Node
                </button>
                <button 
                    onClick={handleSave} 
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white"
                >
                    <Save className="w-4 h-4 text-emerald-400" />Save
                </button>
                <div className="w-px h-4 bg-slate-800/80" />
                <button onClick={() => { engine.actions.undo(); syncToHost(); }} className="text-slate-200 hover:text-purple-400" title="Undo">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={() => { engine.actions.redo(); syncToHost(); }} className="text-slate-200 hover:text-purple-400" title="Redo">
                    <RotateCw className="w-4 h-4" />
                </button>
                <button onClick={() => { engine.actions.autoLayout(); syncToHost(); }} className="text-slate-200 hover:text-purple-500" title="Auto Layout">
                    <GitMerge className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-800/80" />
                <button onClick={() => setGridVisible(!gridVisible)} className={gridVisible ? 'text-sky-400' : 'text-slate-400'} title="Toggle Grid">
                    <Grid className="w-4 h-4" />
                </button>
                <button
                    onClick={() => engine.actions.setZoom(Math.min(2.5, state.zoom * 1.15))}
                    className="text-slate-400 hover:text-yellow-400"
                    title="Zoom in"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button
                    onClick={() => engine.actions.setZoom(Math.max(0.35, state.zoom / 1.15))}
                    className="text-slate-400 hover:text-yellow-400"
                    title="Zoom out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => { engine.actions.setPan({ x: 0, y: 0 }); engine.actions.setZoom(1); }} 
                    className="text-slate-400 hover:text-yellow-400" 
                    title="Recenter View"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>

            <div className="sm:hidden absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-1 border-t border-slate-800/80 bg-slate-950/95 px-2 py-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                <button
                    type="button"
                    onClick={() => { engine.actions.addNode(); syncToHost(); }}
                    className="flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center rounded-lg bg-purple-500/20 px-2 text-[10px] font-semibold text-purple-200"
                >
                    <Plus className="mb-0.5 h-4 w-4" />
                    Node
                </button>
                <button type="button" onClick={() => { engine.actions.undo(); syncToHost(); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300" title="Undo">
                    <RotateCcw className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => engine.actions.setZoom(Math.max(0.35, state.zoom / 1.15))} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300" title="Zoom out">
                    <ZoomOut className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => engine.actions.setZoom(Math.min(2.5, state.zoom * 1.15))} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300" title="Zoom in">
                    <ZoomIn className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => { engine.actions.setPan({ x: 0, y: 0 }); engine.actions.setZoom(1); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300" title="Reset view">
                    <Maximize className="h-5 w-5" />
                </button>
                <button type="button" onClick={handleSave} className="flex min-h-11 min-w-[3.25rem] flex-col items-center justify-center rounded-lg bg-emerald-500/20 px-2 text-[10px] font-semibold text-emerald-200">
                    <Save className="mb-0.5 h-4 w-4" />
                    Save
                </button>
            </div>

            {state.nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 pb-20 text-center sm:pb-0">
                    <p className="max-w-xs text-sm text-slate-400">
                        Tap <span className="text-purple-300">Node</span> to add a card.
                        Drag the green port to link - or tap port, then tap another node.
                        Drag empty space to pan.
                    </p>
                </div>
            )}
        </div>
    );
}

