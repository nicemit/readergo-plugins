import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext, SidebarExtensionDescriptor } from '@readergo/plugin-sdk';

const manifest = {
  id: 'readergo.plugin.readergodevtools',
  name: 'Plugin Dev Tools',
  version: '1.0.0',
  description: 'Validates runtime introspection by rendering a live dashboard widget.',
  category: 'feature' as const,
  provides: [],
  requires: [],
  permissions: [],
};

export const ReadergoDevToolsPlugin: Plugin = {
  manifest,
  async activate(context: PluginContext) {
    context.log.info('Dev Tools Introspection plugin activating...');

    // Register dev widget targeting the new host-supported PluginDevPanel
    await context.registerExtension({
      id: `${manifest.id}.dashboard`,
      type: 'sidebar.panel',
      title: 'Dev Registry',
      renderStrategy: 'host',
      schema: {
        target: 'PluginDevPanel',
        config: {}
      },
      position: 'right',
      order: 1 // Push to top
    } as SidebarExtensionDescriptor);

  },
  deactivate(context: PluginContext) {
    context.log.info('Dev Tools plugin deactivated.');
  },
};
