'use client';

import React, { useState } from 'react';
import { Network, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { useGraphSidebarData } from '../hooks/useGraphSidebarData';

interface GraphSidebarPanelProps {
    noteId: string | null;
    context: any;
}

export function GraphSidebarPanel({ noteId, context }: GraphSidebarPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { linkedGraphs, isLoading } = useGraphSidebarData(noteId, context, isExpanded);

    const handleJumpToGraph = (graphId: string, nodeId: string) => {
        context.executeCommand('document.open', { id: graphId, focusNodeId: nodeId });
    };

    if (!noteId) return null;

    return (
        <div className="p-4 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-800 space-y-3">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between gap-2 border-b border-slate-800 pb-2 text-left"
            >
                <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200">Knowledge Graph</span>
                </div>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {isExpanded && (
                <div className="pt-1 space-y-2">
                    {isLoading ? (
                        <div className="text-center p-2 text-slate-500 text-xs animate-pulse">Loading connected graphs...</div>
                    ) : linkedGraphs.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[10px] text-slate-400">Linked in graphs:</p>
                            {linkedGraphs.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => handleJumpToGraph(g.id, g.nodeId)}
                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors text-left"
                                >
                                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">{g.title}</span>
                                    <ExternalLink className="w-3 h-3 text-purple-400" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-xs text-slate-500">Not linked in any graph.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
