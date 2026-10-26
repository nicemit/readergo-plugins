/**
 * Backlinks Panel Component
 * 
 * Shows all notes that link to the current note.
 * Part of the Zettelkasten plugin sidebar capabilities.
 */

'use client';

// audit-ignore: sdk-boundary
import React, { useState, useMemo } from 'react';
import { Link2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
// audit-ignore: sdk-boundary
import { useNotesStore } from '@/lib/store';
// audit-ignore: sdk-boundary
import { extractContext, countLinkOccurrences, stripHtml } from '@/lib/utils/link-parsing';
// audit-ignore: sdk-boundary
import { executeCommand, usePluginEvent } from '@/lib/platform/actions';

interface BacklinksPanelProps {
    noteId: string | null;
    onNavigateToNote?: (noteId: string) => void;
    className?: string;
}

const INITIAL_SHOWN = 5;

export function BacklinksPanel({ noteId, onNavigateToNote, className = '' }: BacklinksPanelProps) {
    const [showAll, setShowAll] = useState(false);
    const [graphBacklinks, setGraphBacklinks] = useState<any[] | null>(null);
    const [unlinkedMentions, setUnlinkedMentions] = useState<any[]>([]);
    const [linkingDocId, setLinkingDocId] = useState<string | null>(null);
    const [fetchedDoc, setFetchedDoc] = useState<any | null>(null);
    const { notes, linkGraph } = useNotesStore();

    useEffect(() => {
        if (!noteId) {
            setFetchedDoc(null);
            return;
        }
        const existing = notes.find((n) => n.id === noteId);
        if (existing) {
            setFetchedDoc(existing);
            return;
        }
        void executeCommand('readergo.note.get', { id: noteId }).then((res: any) => {
            if (res && res.success && res.data) {
                setFetchedDoc(res.data);
            }
        });
    }, [noteId, notes]);

    const currentNote = useMemo(() => {
        if (!noteId) return null;
        return notes.find((n) => n.id === noteId) || fetchedDoc || null;
    }, [noteId, notes, fetchedDoc]);

    // Query high-speed indexed backlinks and unlinked mentions via canonical commands
    const fetchGraphData = React.useCallback(() => {
        if (!currentNote?.title) {
            setGraphBacklinks(null);
            setUnlinkedMentions([]);
            return;
        }

        void executeCommand('readergo.graph.backlinks', { title: currentNote.title, detailed: true })
            .then((res: any) => {
                if (res && res.success && Array.isArray(res.data)) {
                    setGraphBacklinks(res.data);
                }
            })
            .catch(() => {});

        void executeCommand('readergo.graph.unlinkedMentions', {
            title: currentNote.title,
            excludeDocId: currentNote.id,
            limit: 8,
        })
            .then((res: any) => {
                if (res && res.success && Array.isArray(res.data)) {
                    setUnlinkedMentions(res.data);
                }
            })
            .catch(() => {});
    }, [currentNote?.title, currentNote?.id]);

    React.useEffect(() => {
        fetchGraphData();
    }, [fetchGraphData]);

    // Auto-refresh when graph or document updates are emitted across the system
    usePluginEvent('graph:updated', fetchGraphData);
    usePluginEvent('note:updated', fetchGraphData);

    const backlinks = useMemo(() => {
        if (!currentNote || !currentNote.title) return [];

        const lowerTitle = currentNote.title.toLowerCase();
        const liveSourceIds = linkGraph.backlinks[lowerTitle] || [];

        if (graphBacklinks !== null) {
            const items = graphBacklinks
                .filter((gb) => gb.sourceId !== currentNote.id)
                .map((gb) => ({
                    noteId: gb.sourceId,
                    noteTitle: gb.sourceTitle,
                    context: gb.contextSnippet || '',
                    linkCount: 1,
                    linkType: gb.linkType || 'wiki',
                }));

            // Merge ephemeral draft backlinks from in-memory linkGraph (e.g. actively typed in editor)
            const existingIds = new Set(items.map((i) => i.noteId));
            for (const liveId of liveSourceIds) {
                if (liveId !== currentNote.id && !existingIds.has(liveId)) {
                    const sourceNote = notes.find((n) => n.id === liveId);
                    if (sourceNote) {
                        const plainText = stripHtml(sourceNote.content || '');
                        items.push({
                            noteId: sourceNote.id,
                            noteTitle: sourceNote.title,
                            context: extractContext(plainText, currentNote.title),
                            linkCount: countLinkOccurrences(plainText, currentNote.title) || 1,
                            linkType: 'wiki',
                        });
                    }
                }
            }

            return items;
        }

        return Array.from(new Set(liveSourceIds))
            .filter((id) => id !== currentNote.id)
            .map((id) => {
                const sourceNote = notes.find((n) => n.id === id);
                if (!sourceNote) return null;

                const plainText = stripHtml(sourceNote.content || '');
                return {
                    noteId: id,
                    noteTitle: sourceNote.title,
                    context: extractContext(plainText, currentNote.title),
                    linkCount: countLinkOccurrences(plainText, currentNote.title) || 1,
                    linkType: 'wiki',
                };
            })
            .filter((b): b is NonNullable<typeof b> => b !== null)
            .sort((a, b) => b.linkCount - a.linkCount);
    }, [currentNote, notes, linkGraph, graphBacklinks]);

    if (!noteId || !currentNote) return null;

    const visibleBacklinks = showAll ? backlinks : backlinks.slice(0, INITIAL_SHOWN);
    const hiddenCount = backlinks.length - INITIAL_SHOWN;

    const handleNavigate = (targetId: string) => {
        if (onNavigateToNote) {
            onNavigateToNote(targetId);
        } else {
            void executeCommand('readergo.core.openNote', { noteId: targetId });
        }
    };

    return (
        <div className={`p-4 border border-gray-200/80 dark:border-gray-700/80 rounded-xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-md shadow-sm transition-all ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Link2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Backlinks
                    </h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    backlinks.length > 0
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
                }`}>
                    {backlinks.length}
                </span>
            </div>

            {backlinks.length === 0 ? (
                <div className="py-3 px-2 text-center rounded-lg bg-gray-50/50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        No notes link to this note yet.
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        Use <code className="text-blue-500 font-mono">[[${currentNote.title}]]</code> in other notes.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {visibleBacklinks.map((backlink) => (
                        <div
                            key={backlink.noteId}
                            onClick={() => handleNavigate(backlink.noteId)}
                            className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-gray-700/70 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2 min-w-0">
                                    <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {backlink.noteTitle}
                                    </span>
                                </div>
                                {backlink.linkCount > 1 && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                                        {backlink.linkCount}x
                                    </span>
                                )}
                            </div>
                            {backlink.context && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 pl-5.5 italic border-l-2 border-gray-200 dark:border-gray-700 ml-1">
                                    {backlink.context}
                                </p>
                            )}
                        </div>
                    ))}

                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAll(!showAll)}
                            className="w-full py-1 text-xs text-center text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center space-x-1"
                        >
                            <span>{showAll ? 'Show less' : `Show ${hiddenCount} more`}</span>
                            {showAll ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                    )}
                </div>
            )}

            {/* Unlinked Mentions Section */}
            {unlinkedMentions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Unlinked Mentions
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            {unlinkedMentions.length}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {unlinkedMentions.map(({ document: doc, snippet }) => (
                            <div
                                key={doc.id}
                                className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700/70 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all group"
                            >
                                <div className="flex items-center justify-between min-w-0 mb-1">
                                    <div
                                        onClick={() => handleNavigate(doc.id)}
                                        className="flex items-center space-x-2 min-w-0 cursor-pointer flex-1"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                            {doc.title || 'Untitled'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={linkingDocId === doc.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setLinkingDocId(doc.id);
                                            try {
                                                const res: any = await executeCommand('readergo.graph.linkMention', {
                                                    sourceDocId: doc.id,
                                                    targetTitle: currentNote.title,
                                                });
                                                if (res && res.success) {
                                                    fetchGraphData();
                                                }
                                            } finally {
                                                setLinkingDocId(null);
                                            }
                                        }}
                                        className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-1 flex-shrink-0"
                                        title="Link mention with [[WikiLink]]"
                                    >
                                        <Link2 className="w-3 h-3" />
                                        <span>{linkingDocId === doc.id ? '...' : 'Link'}</span>
                                    </button>
                                </div>
                                {snippet && (
                                    <p
                                        onClick={() => handleNavigate(doc.id)}
                                        className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 pl-5 italic cursor-pointer"
                                    >
                                        {snippet}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
