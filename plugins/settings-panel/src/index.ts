import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext, SidebarExtensionDescriptor } from '@readergo/plugin-sdk';

const manifest = {
    id: 'readergo.examples.settings-panel',
    name: 'Settings Panel Example',
    version: '1.0.0',
    description: 'Demonstrates registering a declarative UI extension without React.',
    category: 'feature' as const,
    provides: [],
    requires: [],
    permissions: [],
};

export const SettingsPanelPlugin: Plugin = {
    manifest,
    async activate(context: PluginContext) {
        context.log.info('⚙️ Settings Panel plugin activating...');

        // Register a declarative UI extension descriptor instead of a React Component
        await context.registerExtension({
            id: 'example.settings.panel',
            type: 'sidebar.panel',
            title: 'Example Settings',
            renderStrategy: 'host',
            schema: {
                // A made up target ID that a Host DynamicRenderer would look for
                target: 'GenericSettingsPanel',
                config: { showAdvanced: true }
            },
            order: 100
        } as SidebarExtensionDescriptor);

        context.log.info('⚙️ Settings Panel plugin UI registered!');
    },
    deactivate(context: PluginContext) {
        context.log.info('⚙️ Settings Panel plugin deactivated.');
    },
};
