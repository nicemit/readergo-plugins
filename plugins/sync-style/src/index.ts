/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext } from '@readergo/plugin-sdk';

const manifest = {
    id: 'readergo.examples.sync-style',
    name: 'Sync Style Example',
    version: '1.0.0',
    description: 'Demonstrates obtaining generic capabilities from the host platform.',
    category: 'feature' as const,
    provides: [],
    requires: ['document-storage'], // Declares we need the document-storage capability to function
    permissions: ['note:read' as const],
};

export const SyncStylePlugin: Plugin = {
    manifest,
    async activate(context: PluginContext) {
        context.log.info('🔄 Sync Style plugin activating...');

        // Request a capability safely using the context
        // This returns the internal abstraction without direct imports
        const storageManager = await context.getCapability<any>('document-storage');

        if (storageManager) {
            context.log.info('Successfully connected to document-storage capability!');

            // Example usage: Note this is just an example, it doesn't actually do anything
            // const notes = await storageManager.list();
            // context.log.info(`Found \${notes.length} notes available for sync.`);
        } else {
            context.log.warn('Could not find document-storage capability. Is it loaded?');
        }

    },
    deactivate(context: PluginContext) {
        context.log.info('🔄 Sync Style plugin deactivated.');
    },
};
