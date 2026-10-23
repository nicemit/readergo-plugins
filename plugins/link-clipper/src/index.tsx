import React from "react";
import { LinkClipperComponent } from "./LinkClipperComponent";
import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext } from '@readergo/plugin-sdk';

const manifest = {
    id: 'readergo.features.link-clipper',
    name: 'Link Clipper',
    version: '1.0.0',
    description: 'Clip links to create new notes with parsed content',
    provides: ['sidebar-panel'],
    requires: [],
    permissions: ['note:write', 'network:request'],
    category: 'feature'
} as const;

export const LinkClipperPlugin: Plugin = {
    manifest,
    async activate(context: PluginContext) {
        context.log.info('Link Clipper plugin activated');

        // 1. Register Command
        await context.registerCommand({
            id: 'readergo.link-clipper.clip',
            title: 'Clip URL',
            description: 'Fetches content from a URL and saves it as a note',
            handler: async (payload: { url: string; folderId?: string }) => {
                const { url, folderId } = payload;
                if (!url) throw new Error('URL is required');

                context.log.info(`Clipping URL: ${url}`);

                // Fetch URL content via platform API (using internal fetch for now)
                const response = await fetch(`/api/fetch-url-content?url=${encodeURIComponent(url)}`);
                if (!response.ok) throw new Error(`URL content fetch failed: ${response.statusText}`);
                const data = await response.json() as any;

                if (!data || !data.htmlContent) {
                    throw new Error('Could not extract content from URL');
                }

                // Format content
                const htmlContent = `${data.htmlContent}<hr><p><em>Source: <a href="${url}" target="_blank" rel="noopener noreferrer">${data.metadata?.siteName || url}</a></em></p>`;

                let titleToSet = data.title;
                if (!titleToSet) {
                    const htmlHeadingMatch = data.htmlContent.match(/<h[1-6][^>]*>(.+?)<\/h[1-6]>/i);
                    if (htmlHeadingMatch) {
                        titleToSet = htmlHeadingMatch[1].replace(/<[^>]*>/g, '').trim();
                    } else {
                        titleToSet = 'Clipped Note';
                    }
                }

                // Save note using command pipeline
                const newNote = await context.executeCommand('readergo.note.create', {
                    id: crypto.randomUUID(),
                    title: titleToSet,
                    content: htmlContent,
                    folderId: folderId,
                    type: 'note',
                    status: 'draft'
                });

                if (!newNote || !(newNote as any).id) {
                    throw new Error('Failed to create note');
                }

                // Trigger navigation
                context.emit('navigation:open-note', { noteId: (newNote as any).id });

                return newNote;
            }
        });

        // 2. Register Panel capability
        context.registerCapability('sidebar-panel', {
            id: 'readergo.link-clipper.panel',
            name: 'Link Clipper',
            position: 'left',
            render: () => <LinkClipperComponent />,
        });
    },
    deactivate(context: PluginContext) {
        context.log.info('Link Clipper plugin deactivated');
    }
};
