import React from 'react'
import type { Plugin, PluginContext, PluginManifest, SidebarPanel } from '@readergo/plugin-sdk'
import { ListTree } from 'lucide-react'
import { OutlinePanel } from './OutlinePanel'

const manifest: PluginManifest = {
  id: 'readergo.features.outline',
  name: 'Outline and Word Count',
  version: '1.0.0',
  description:
    'Right-sidebar document outline with heading jump, word count, and reading time for the active note.',
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
  async activate(context: PluginContext) {
    const panel: SidebarPanel = {
      id: 'readergo.outline.panel',
      name: 'Outline',
      icon: ListTree,
      position: 'right',
      order: 2,
      render: (props) => <OutlinePanel noteId={props.noteId} context={props.context} />,
    }
    context.registerCapability('sidebar-panel', panel)
    context.log.info('Outline and Word Count plugin activated')
  },
  deactivate(context: PluginContext) {
    context.log.info('Outline and Word Count plugin deactivated')
  },
}

export default OutlinePlugin
