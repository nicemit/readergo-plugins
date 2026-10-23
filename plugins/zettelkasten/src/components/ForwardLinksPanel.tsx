/**
 * Forward Links (Outgoing Links) Panel Component
 * 
 * Shows all notes that the current note links to.
 * Identifies existing notes vs uncreated notes and allows one-click note creation.
 * Part of the Zettelkasten plugin sidebar capabilities.
 */

'use client';

// audit-ignore: sdk-boundary
import React, { useMemo, useState } from 'react';
import { ExternalLink, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
// audit-ignore: sdk-boundary
import { useNotesStore } from '@/lib/store';
// audit-ignore: sdk-boundary
import { extractLinks, extractContext, stripHtml } from '@/lib/utils/link-parsing';
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions';

interface ForwardLinksPanelProps {
    noteId: string | null;
    onNavigateToNote?: (noteId: string) => void;
    onCreateNote?: (title: string) => void;
    className?: string;
}

interface ForwardLinkItem {
    noteTitle: string;
    displayText: string;
    exists: boolean;
    targetNoteId: string | null;
    linkCount: number;
    context: string;
}

export function ForwardLinksPanel({
    noteId,
    onNavigateToNote,
    onCreateNote,
    className = '',
}: ForwardLinksPanelProps) {
    const { notes } = useNotesStore();
    const [creatingTitle, setCreatingTitle] = useState<string | null>(null);

    const currentNote = useMemo(() => {
        if (!noteId) return null;
        return notes.find((n) => n.id === noteId) || null;
    }, [noteId, notes]);

    const forwardLinks = useMemo(() => {
        if (!currentNote || !currentNote.content) return [];

        try {
            const plainText = stripHtml(currentNote.content);
            const links = extractLinks(plainText);

            const map = new Map<string, { count: number; displayText: string }>();
            links.forEach((link) => {
                const key = link.noteTitle;
                const existing = map.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    map.set(key, { count: 1, displayText: link.displayText });
                }
            });

            const items: ForwardLinkItem[] = [];
            map.forEach(({ count, displayText }, title) => {
                const target = notes.find(
                    (n) => n.title.trim().toLowerCase() === title.trim().toLowerCase()
                );
                items.push({
                    noteTitle: title,
                    displayText,
                    exists: !!target,
                    targetNoteId: target?.id || null,
                    linkCount: count,
                    context: extractContext(plainText, title, 45),
                });
            });

            return items.sort((a, b) => {
                if (a.exists !== b.exists) return a.exists ? -1 : 1;
                return a.noteTitle.localeCompare(b.noteTitle);
            });
        } catch {
            return [];
        }
    }, [currentNote, notes]);

    if (!noteId || !currentNote) return null;

    const handleNavigate = (targetId: string) => {
        if (onNavigateToNote) {
            onNavigateToNote(targetId);
        } else {
            void executeCommand('readergo.core.openNote', { noteId: targetId });
        }
    };

    const handleCreateMissingNote = async (title: string) => {
        if (creatingTitle) return;
        setCreatingTitle(title);
        try {
            if (onCreateNote) {
                onCreateNote(title);
            } else {
                const newId = crypto.randomUUID();
                await executeCommand('readergo.note.create', {
                    id: newId,
                    title,
                    content: '',
                    type: 'note',
                    status: 'draft',
                });
                await executeCommand('readergo.core.openNote', { noteId: newId });
            }
        } finally {
            setCreatingTitle(null);
        }
    };

    const existingCount = forwardLinks.filter((l) => l.exists).length;
    const missingCount = forwardLinks.length - existingCount;

    return (
        <div className={`p-4 border border-gray-200/80 dark:border-gray-700/80 rounded-xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-md shadow-sm transition-all ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <ExternalLink className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Outgoing Links
                    </h3>
                </div>
                <div className="flex items-center space-x-1.5">
                    {missingCount > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {missingCount} missing
                        </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        forwardLinks.length > 0
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
                    }`}>
                        {forwardLinks.length}
                    </span>
                </div>
            </div>

            {forwardLinks.length === 0 ? (
                <div className="py-3 px-2 text-center rounded-lg bg-gray-50/50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        No outgoing links in this note.
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        Type <code className="text-indigo-500 font-mono">[[Note Title]]</code> to link to other notes.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {forwardLinks.map((link) => (
                        <div
                            key={link.noteTitle}
                            className={`p-2.5 rounded-lg border transition-all ${
                                link.exists
                                    ? 'bg-white/60 dark:bg-gray-700/40 border-gray-100 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer group'
                                    : 'bg-amber-50/40 dark:bg-amber-900/10 border-dashed border-amber-200/80 dark:border-amber-800/40'
                            }`}
                            onClick={() => {
                                if (link.exists && link.targetNoteId) {
                                    handleNavigate(link.targetNoteId);
                                }
                            }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                    {link.exists ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm font-medium truncate ${
                                        link.exists
                                            ? 'text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {link.noteTitle}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                                    {link.linkCount > 1 && (
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">
                                            {link.linkCount}x
                                        </span>
                                    )}

                                    {!link.exists && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleCreateMissingNote(link.noteTitle);
                                            }}
                                            disabled={creatingTitle === link.noteTitle}
                                            className="px-2 py-0.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium flex items-center space-x-1 transition-colors shadow-sm disabled:opacity-50"
                                            title={`Create note "${link.noteTitle}"`}
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span>{creatingTitle === link.noteTitle ? 'Creating...' : 'Create'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {link.context && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 pl-5.5 italic border-l-2 border-gray-200 dark:border-gray-700 ml-1">
                                    {link.context}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
