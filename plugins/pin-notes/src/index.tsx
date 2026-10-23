import React from "react";
import { PinnedNotesWidget } from "./PinnedNotesWidget";
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

/**
 * Pin Notes Plugin
 * 
 * Allows users to pin notes to the dashboard for quick access.
 * Uses CenterPaneContent capability to display pinned notes widget.
 */

import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext } from '@readergo/plugin-sdk';
import { getPinNoteService, PinNoteService } from './PinNoteService';

const manifest = {
    id: 'readergo.features.pin-notes',
    name: 'Pin Notes',
    version: '1.0.1',
    description: 'Pin important notes to your dashboard for quick access',
    provides: ['extension-slot', 'pin-note-service'] as string[],
    permissions: ['note:read' as const],
};



export const PinNotesPlugin: Plugin = {
    manifest,
    async activate(context: PluginContext) {
        try {
            context.log.info('Pin Notes plugin activating...');

            // Get the pin note service singleton
            const pinService = getPinNoteService();

            // Register the pin note service as a capability
            // This allows other plugins/components to use it
            context.registerCapability('pin-note-service', pinService);
            context.log.info('✅ Registered pin-note-service capability');

            // Register dashboard extension-slot capability
            context.registerCapability('extension-slot', {
                id: 'readergo.pin-notes.dashboard-slot',
                slotId: 'dashboard-pinned',
                order: 0,
                component: (props: any) => <PinnedNotesWidget onNoteClick={props.onOpenNoteById} />,
            });
            context.log.info('✅ Registered center.pane extension');

            // Handle UI actions via registered command
            await context.registerCommand({
                id: 'readergo.pin-notes.open',
                title: 'Open Pinned Note',
                handler: async (payload: any) => {
                    if (payload && payload.noteId) {
                        context.log.info(`Opening pinned note: ${payload.noteId}`);
                        context.emit('navigation:open-note', { noteId: payload.noteId });
                        return true;
                    }
                    return false;
                }
            });

            await context.registerCommand({
                id: 'readergo.pin-notes.listPinned',
                title: 'List Pinned Notes',
                handler: async () => {
                    const pinnedIds = pinService.getPinnedNoteIds();
                    if (pinnedIds.length === 0) return [];

                    const storage = await context.getCapability<any>('document-storage');
                    if (!storage) return [];

                    const notes = await Promise.all(
                        pinnedIds.map(async (id: string) => {
                            try {
                                return await storage.get(id);
                            } catch {
                                return null;
                            }
                        })
                    );

                    return notes.filter(n => n !== null);
                }
            });

            await context.registerCommand({
                id: 'readergo.pin-notes.unpin',
                title: 'Unpin Note',
                handler: async (payload: { noteId: string }) => {
                    pinService.unpinNote(payload.noteId);
                    context.emit('readergo.pin-notes.changed', { noteId: payload.noteId });
                    return true;
                }
            });

            // Bridge internal service events to system-wide events for UI reactivity
            pinService.onPinnedNotesChange(() => {
                context.emit('readergo.pin-notes.changed', {});
            });

            context.log.info('Pin Notes plugin activated successfully');
        } catch (error) {
            context.log.error('Failed to activate Pin Notes plugin:', error);
            throw error;
        }
    },
    deactivate(context: PluginContext) {
        context.log.info('Pin Notes plugin deactivated');
    },
};

// Export the service for external use
export { getPinNoteService, type PinNoteService } from './PinNoteService';
