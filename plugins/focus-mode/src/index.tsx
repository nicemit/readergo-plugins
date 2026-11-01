import type { Plugin, PluginContext, PluginManifest } from '@readergo/plugin-sdk'
import { Maximize2 } from 'lucide-react'

const manifest: PluginManifest = {
  id: 'readergo.features.focus',
  name: 'Focus Mode',
  version: '1.0.0',
  description: 'Hides the side panes with a smooth animation so the document can take the whole workbench.',
  category: 'feature',
  provides: ['activity-bar-item'],
  requires: [],
  permissions: [],
  trust: 'trusted',
  source: 'external',
  runtime: 'local',
}

export const FocusModePlugin: Plugin = {
  manifest,

  async activate(context: PluginContext): Promise<void> {
    const toggleFocus = () => {
      void context.executeCommand('readergo.workbench.toggleFocusMode')
    }

    context.registerCapability('activity-bar-item', {
      id: 'readergo.focus.toggle',
      label: 'Focus',
      icon: Maximize2,
      position: 'bottom',
      order: 10,
      onClick: toggleFocus,
    })

    await context.registerCommand({
      id: 'readergo.focus.toggle',
      title: 'Toggle Focus Mode',
      category: 'Workbench',
      handler: async () => context.executeCommand('readergo.workbench.toggleFocusMode'),
    })

    await context.registerCommand({
      id: 'readergo.focus.hideLeft',
      title: 'Hide Left Pane',
      category: 'Workbench',
      handler: async () => context.executeCommand('readergo.workbench.setPanes', { left: false }),
    })

    await context.registerCommand({
      id: 'readergo.focus.hideRight',
      title: 'Hide Right Pane',
      category: 'Workbench',
      handler: async () => context.executeCommand('readergo.workbench.setPanes', { right: false }),
    })

    await context.registerCommand({
      id: 'readergo.focus.showPanes',
      title: 'Show Workbench Panes',
      category: 'Workbench',
      handler: async () => context.executeCommand('readergo.workbench.setPanes', { left: true, right: true }),
    })

    context.log.info('Focus mode activity item ready')
  },

  deactivate(context: PluginContext) {
    context.log.info('Focus mode deactivated')
  },
}

export default FocusModePlugin
