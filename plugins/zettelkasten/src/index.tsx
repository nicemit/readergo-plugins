/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Zettelkasten Plugin for ReaderGo
 * 
 * Provides comprehensive bidirectional note linking via [[Note Title]],
 * real-time autocomplete dropdown, backlinks panel, and forward links panel.
 */

// audit-ignore: sdk-boundary
import React from 'react';
import { Plugin, PluginContext, EditorExtension, SidebarPanel } from '@readergo/plugin-sdk';
import { InternalLinkExtension } from './extensions/InternalLinkExtension';
import { LinkAutocompleteExtension } from './extensions/LinkAutocompleteExtension';
import { BacklinksPanel } from './components/BacklinksPanel';
import { ForwardLinksPanel } from './components/ForwardLinksPanel';
// audit-ignore: sdk-boundary
import { useNotesStore } from '@/lib/store';
// audit-ignore: sdk-boundary
import { extractLinks, extractContext, countLinkOccurrences, stripHtml } from '@/lib/utils/link-parsing';

const manifest = {
    id: 'readergo.features.zettelkasten',
    name: 'Zettelkasten',
    version: '1.0.0',
    description: 'Bidirectional note linking via [[Note Title]], link autocomplete, backlinks, and forward links',
    category: 'feature' as const,
    provides: ['editor-extension', 'sidebar-panel', 'zettelkasten-service'],
    requires: ['document-storage'],
    permissions: ['note:read' as const, 'note:write' as const],
};

export const ZettelkastenPlugin: Plugin = {
    manifest,

    async activate(context: PluginContext): Promise<void> {
        context.log.info('Zettelkasten plugin activating...');

        // 1. Register TipTap Editor Extension for [[Note Title]] and Autocomplete
        const editorExtension: EditorExtension = {
            id: 'readergo.zettelkasten.editor-extension',
            name: 'Zettelkasten Links & Autocomplete',
            getExtensions: () => [
                InternalLinkExtension as unknown as any,
                LinkAutocompleteExtension as unknown as any,
            ],
            commands: {
                insertInternalLink: (editor) => {
                    editor.chain().focus().insertContent('[[]]').setTextSelection(editor.state.selection.from - 2).run();
                },
            },
        };

        context.registerCapability('editor-extension', editorExtension);
        context.log.info('✅ Registered editor-extension capability');

        // 2. Register Backlinks Sidebar Panel
        const backlinksPanel: SidebarPanel = {
            id: 'readergo.zettelkasten.backlinks',
            name: 'Backlinks',
            position: 'right',
            order: 10,
            render: ({ noteId, onNavigateToNote }) => (
                <BacklinksPanel noteId={noteId} onNavigateToNote={onNavigateToNote} />
            ),
        };

        context.registerCapability('sidebar-panel', backlinksPanel);
        context.log.info('✅ Registered backlinks sidebar panel');

        // 3. Register Forward Links Sidebar Panel
        const forwardLinksPanel: SidebarPanel = {
            id: 'readergo.zettelkasten.forward-links',
            name: 'Outgoing Links',
            position: 'right',
            order: 20,
            render: ({ noteId, onNavigateToNote, onCreateNote }) => (
                <ForwardLinksPanel
                    noteId={noteId}
                    onNavigateToNote={onNavigateToNote}
                    onCreateNote={onCreateNote}
                />
            ),
        };

        context.registerCapability('sidebar-panel', forwardLinksPanel);
        context.log.info('✅ Registered forward links sidebar panel');

        // 4. Register Command: open or create note by title
        await context.registerCommand({
            id: 'readergo.zettelkasten.openOrCreate',
            title: 'Open or Create Note by Title',
            handler: async (payload?: { title?: string }) => {
                const title = payload?.title?.trim();
                if (!title) return { success: false, error: 'Title is required' };

                const allNotes = useNotesStore.getState().notes || [];
                const target = allNotes.find(
                    (n) => n.title && n.title.trim().toLowerCase() === title.toLowerCase()
                );

                if (target) {
                    await context.executeCommand('readergo.core.openNote', { noteId: target.id });
                    return { success: true, noteId: target.id, created: false };
                }

                // If note does not exist, ask user to create it
                const shouldCreate = typeof window !== 'undefined'
                    ? window.confirm(`Note "${title}" does not exist. Create it now?`)
                    : true;

                if (!shouldCreate) {
                    return { success: false, cancelled: true };
                }

                const newId = crypto.randomUUID();
                const createResult = (await context.executeCommand('readergo.note.create', {
                    id: newId,
                    title,
                    content: '',
                    type: 'note',
                    status: 'draft',
                })) as any;

                if (createResult && createResult.success === false) {
                    return { success: false, error: createResult.error };
                }

                await context.executeCommand('readergo.core.openNote', { noteId: newId });
                return { success: true, noteId: newId, created: true };
            },
        });

        // 5. Register Command: get backlinks
        await context.registerCommand({
            id: 'readergo.zettelkasten.getBacklinks',
            title: 'Get Note Backlinks',
            handler: async (payload?: { noteTitle?: string; noteId?: string }) => {
                const title = payload?.noteTitle;
                if (!title) return [];

                const allNotes = useNotesStore.getState().notes || [];
                const targetId = payload?.noteId;

                return allNotes
                    .filter((n) => n.id !== targetId && n.content)
                    .map((n) => {
                        const plain = stripHtml(n.content || '');
                        const count = countLinkOccurrences(plain, title);
                        if (count <= 0) return null;
                        return {
                            noteId: n.id,
                            noteTitle: n.title,
                            context: extractContext(plain, title),
                            linkCount: count,
                        };
                    })
                    .filter((b): b is NonNullable<typeof b> => b !== null)
                    .sort((a, b) => b.linkCount - a.linkCount);
            },
        });

        // 6. Register Command: get forward links
        await context.registerCommand({
            id: 'readergo.zettelkasten.getForwardLinks',
            title: 'Get Forward Links',
            handler: async (payload?: { content?: string }) => {
                const content = payload?.content || '';
                if (!content) return [];

                const plain = stripHtml(content);
                const links = extractLinks(plain);
                const allNotes = useNotesStore.getState().notes || [];

                return links.map((link) => {
                    const target = allNotes.find(
                        (n) => n.title.trim().toLowerCase() === link.noteTitle.toLowerCase()
                    );
                    return {
                        noteTitle: link.noteTitle,
                        displayText: link.displayText,
                        exists: !!target,
                        noteId: target?.id || null,
                        context: extractContext(plain, link.noteTitle),
                    };
                });
            },
        });

        // 7. Register Zettelkasten Service capability
        context.registerCapability('zettelkasten-service', {
            extractLinks: (content: string) => extractLinks(stripHtml(content)),
            extractContext: (content: string, title: string) => extractContext(stripHtml(content), title),
            countOccurrences: (content: string, title: string) => countLinkOccurrences(stripHtml(content), title),
        });

        context.log.info('Zettelkasten plugin activated successfully');
    },

    async deactivate(context: PluginContext): Promise<void> {
        context.log.info('Zettelkasten plugin deactivated');
    },
};

export default ZettelkastenPlugin;
