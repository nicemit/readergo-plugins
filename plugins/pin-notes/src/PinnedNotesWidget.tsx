/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/**
 * Pinned Notes Widget
 * 
 * Displays pinned notes as compact cards on the dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Pin, X, FileText, ExternalLink } from 'lucide-react';
import { executeCommand, usePluginEvent } from '@/lib/platform/actions';

interface Note {
    id: string;
    title: string;
    content: string;
    updatedAt: Date;
}

interface PinnedNotesWidgetProps {
    onNoteClick?: (noteId: string) => void;
}

export function PinnedNotesWidget({ onNoteClick }: PinnedNotesWidgetProps) {
    const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPinnedNotes = useCallback(async () => {
        try {
            const notes = await executeCommand<Note[]>('readergo.pin-notes.listPinned');
            setPinnedNotes(notes || []);
        } catch (error) {
            console.error('[PinnedNotesWidget] Failed to load notes:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPinnedNotes();
    }, [loadPinnedNotes]);

    // Listen for changes to pinned notes and refresh
    usePluginEvent('readergo.pin-notes.changed', loadPinnedNotes);

    const handleUnpin = (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation();
        executeCommand('readergo.pin-notes.unpin', { noteId });
    };

    const handleNoteClick = (noteId: string) => {
        if (onNoteClick) {
            onNoteClick(noteId);
        } else {
            // Decoupled navigation via command
            executeCommand('readergo.pin-notes.open', { noteId });
        }
    };

    const getPreview = (content: string): string => {
        // Strip HTML tags and get first 100 chars
        const text = content.replace(/<[^>]*>/g, '').trim();
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-3">
                <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
        );
    }

    if (pinnedNotes.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Pin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pinned notes</p>
                <p className="text-xs mt-1 opacity-75">Right-click a note to pin it</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {pinnedNotes.map((note) => (
                <div
                    key={note.id}
                    onClick={() => handleNoteClick(note.id)}
                    className="group relative p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer"
                >
                    {/* Unpin button */}
                    <button
                        onClick={(e) => handleUnpin(e, note.id)}
                        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        title="Unpin"
                    >
                        <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>

                    {/* Note content */}
                    <div className="flex items-start gap-3 pr-6">
                        <div className="flex-shrink-0 p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded">
                            <FileText className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                {note.title || 'Untitled'}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {getPreview(note.content)}
                            </p>
                        </div>
                    </div>

                    {/* Open indicator */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                </div>
            ))}
        </div>
    );
}
