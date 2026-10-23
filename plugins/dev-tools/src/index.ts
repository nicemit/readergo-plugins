import React from "react";
import { PluginDevPanel } from "./PluginDevPanel";
import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext, SidebarExtensionDescriptor } from '@readergo/plugin-sdk';

const manifest = {
  id: 'readergo.plugin.readergodevtools',
  name: 'Plugin Dev Tools',
  version: '1.0.1',
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

    // Register dev panel capability
    context.registerCapability('sidebar-panel', {
      id: `${manifest.id}.dashboard`,
      name: 'Dev Registry',
      position: 'right',
      order: 1,
      render: () => React.createElement(PluginDevPanel),
    });

  },
  deactivate(context: PluginContext) {
    context.log.info('Dev Tools plugin deactivated.');
  },
};
