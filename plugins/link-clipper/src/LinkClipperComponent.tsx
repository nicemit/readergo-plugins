'use client';

import React, { useState, useEffect } from 'react';
import { executeCommand } from '@/lib/platform/actions';

export function LinkClipperComponent() {
    const [url, setUrl] = useState('');
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');
    const [isClipping, setIsClipping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        executeCommand('readergo.folder.list')
            .then((res) => setFolders(Array.isArray(res) ? res : []))
            .catch(err => console.error('[LinkClipper] Failed to load folders:', err));
    }, []);

    const handleClip = async () => {
        if (!url.trim()) return;

        setIsClipping(true);
        setError(null);
        setSuccess(null);

        try {
            const newNote = await executeCommand('readergo.link-clipper.clip', { 
                url, 
                folderId: selectedFolderId 
            });

            if (!newNote || !newNote.id) {
                throw new Error('Failed to create note');
            }

            setSuccess(`Successfully clipped to note: ${newNote.title}`);
            setUrl('');

            // Note: Navigation is now handled by the command emitting navigation:open-note event
            // which the host application router listens for.

        } catch (err: unknown) {
            console.error('[LinkClipper] Clipping failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to clip URL');
        } finally {
            setIsClipping(false);
        }
    };

    return (
        <div className="p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                🔗 Link Clipper
            </h3>

            {error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {error}
                </div>
            )}

            {success && (
                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    {success}
                </div>
            )}

            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">URL to clip</label>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 dark:text-gray-400">Save to Folder</label>
                <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                    <option value="">No Folder (Root)</option>
                    {(folders || []).map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleClip}
                disabled={isClipping || !url.trim()}
                className="mt-2 w-full py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
                {isClipping ? (
                    <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Clipping...
                    </>
                ) : (
                    'Clip Note'
                )}
            </button>
        </div>
    );
}
