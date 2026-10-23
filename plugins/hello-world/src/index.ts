import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext } from '@readergo/plugin-sdk';

const manifest = {
    id: 'readergo.examples.hello-world',
    name: 'Hello World Example',
    version: '1.0.0',
    description: 'A minimal plugin demonstrating activation and logging.',
    category: 'feature' as const,
    provides: [],
    requires: [],
    permissions: [],
};

export const HelloWorldPlugin: Plugin = {
    manifest,
    async activate(context: PluginContext) {
        context.log.info('👋 Hello World plugin has activated!');

        // Register a simple IPC event subscriber to demonstrate IPC safety
        await context.subscribe('system:ready', () => {
            context.log.info('System is ready, acknowledged by Hello World.');
        });
    },
    deactivate(context: PluginContext) {
        context.log.info('👋 Hello World plugin has deactivated!');
    },
};
