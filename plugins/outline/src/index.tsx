import React from 'react'
import type { Plugin, PluginContext, PluginManifest, SidebarPanel } from '@readergo/plugin-sdk'
import { ListTree } from 'lucide-react'
import { OutlinePanel } from './OutlinePanel'

const manifest: PluginManifest = {
  id: 'readergo.features.outline',
  name: 'Document Structure',
  version: '1.1.0',
  description: 'Right-sidebar heading outline with jump-to-heading and section collapse for the active note.',
  category: 'feature',
  provides: ['sidebar-panel'],
  requires: ['document-storage'],
  permissions: ['note:read'],
  trust: 'trusted',
  source: 'external',
  runtime: 'local',
}

export const OutlinePlugin: Plugin = {
  manifest,

  async activate(context: PluginContext): Promise<void> {
    const panel: SidebarPanel = {
      id: 'readergo.outline.panel',
      name: 'Document Structure',
      icon: ListTree,
      position: 'right',
      order: 1,
      render: ({ noteId }) => <OutlinePanel noteId={noteId} />,
    }

    context.registerCapability('sidebar-panel', panel)
    context.log.info('Document Structure outline panel ready')
  },

  deactivate(context: PluginContext) {
    context.log.info('Document Structure outline panel deactivated')
  },
}

export default OutlinePlugin
