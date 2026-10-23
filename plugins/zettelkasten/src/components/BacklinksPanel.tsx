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
import { executeCommand } from '@/lib/platform/actions';

interface BacklinksPanelProps {
    noteId: string | null;
    onNavigateToNote?: (noteId: string) => void;
    className?: string;
}

const INITIAL_SHOWN = 5;

export function BacklinksPanel({ noteId, onNavigateToNote, className = '' }: BacklinksPanelProps) {
    const [showAll, setShowAll] = useState(false);
    const { notes, linkGraph } = useNotesStore();

    const currentNote = useMemo(() => {
        if (!noteId) return null;
        return notes.find((n) => n.id === noteId) || null;
    }, [noteId, notes]);

    const backlinks = useMemo(() => {
        if (!currentNote || !currentNote.title) return [];

        const lowerTitle = currentNote.title.toLowerCase();
        const sourceIds = linkGraph.backlinks[lowerTitle] || [];

        // In addition to store linkGraph, also scan notes in case graph is rebuilding
        const foundSourceIds = new Set(sourceIds);
        notes.forEach((n) => {
            if (n.id !== currentNote.id && n.content) {
                const plain = stripHtml(n.content);
                if (countLinkOccurrences(plain, currentNote.title) > 0) {
                    foundSourceIds.add(n.id);
                }
            }
        });

        return Array.from(foundSourceIds)
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
                };
            })
            .filter((b): b is NonNullable<typeof b> => b !== null)
            .sort((a, b) => b.linkCount - a.linkCount);
    }, [currentNote, notes, linkGraph]);

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
        </div>
    );
}
