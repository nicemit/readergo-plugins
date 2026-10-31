import {
  definePlugin,
  type EditorProvider,
  type PluginContext,
} from '@readergo/plugin-sdk'
import { Waypoints } from 'lucide-react'
import { ArchitectureCard } from './ArchitectureCard'
import { ArchitectureGuide } from './ArchitectureGuide'
import { GUIDE_TITLE, GUIDE_TYPE, openArchitectureGuide } from './openGuide'

const manifest = {
  id: 'readergo.features.architecture',
  name: 'How ReaderGo Works',
  version: '1.2.1',
  description:
    'Self-explaining flowcharts of the ReaderGo shell, kernel, click pipeline, open/save, chat, install, and Spaces.',
  category: 'feature' as const,
  provides: ['editor-provider', 'activity-bar-item', 'extension-slot'],
  permissions: ['note:read', 'note:write'],
}

const editorProvider: EditorProvider = {
  id: 'architecture-guide-editor',
  name: 'How ReaderGo Works',
  componentId: 'architecture-guide',
  supportedTypes: [GUIDE_TYPE],
}

export default definePlugin({
  manifest: manifest as never,
  async setup(context: PluginContext) {
    const open = () => {
      void openArchitectureGuide(context)
    }

    context.registerCapability('editor-provider', editorProvider)

    context.registerDocumentType({
      type: GUIDE_TYPE,
      label: 'Architecture Guide',
      icon: Waypoints,
      create: () => ({
        type: GUIDE_TYPE,
        content: 'ReaderGo architecture guide',
        data: { version: 1 },
        metadata: { singleton: GUIDE_TYPE },
      }),
    })

    context.registerEditor({
      type: GUIDE_TYPE,
      component: ArchitectureGuide,
      capabilityId: editorProvider.id,
    })

    context.registerCapability('activity-bar-item', {
      id: 'readergo.architecture.open-item',
      label: 'How ReaderGo works',
      icon: Waypoints,
      position: 'bottom',
      order: 20,
      onClick: open,
    })

    context.registerCapability('extension-slot', {
      id: 'readergo.architecture.dashboard',
      slotId: 'dashboard-pinned',
      order: 1,
      component: () => <ArchitectureCard onOpen={open} />,
    })

    await context.registerCommand({
      id: 'readergo.architecture.open',
      title: GUIDE_TITLE,
      handler: async () => openArchitectureGuide(context),
    })

    context.log.info('How ReaderGo Works guide activated')
    return async () => {
      context.log.info('How ReaderGo Works guide deactivated')
    }
  },
})
