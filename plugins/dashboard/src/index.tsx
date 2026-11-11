import {
  definePlugin,
  type EditorProvider,
  type PluginContext,
} from '@readergo/plugin-sdk'
import { Home, LayoutDashboard } from 'lucide-react'
import { DashboardDocumentEditor } from './DashboardDocumentEditor'
import { openDashboard } from './openDashboard'
import { DASHBOARD_TITLE, DASHBOARD_TYPE } from './types'

const manifest = {
  id: 'readergo.features.dashboard',
  name: 'Dashboard',
  version: '1.1.0',
  description:
    'Workspace overview dashboard - recent work, document mix, and create actions as a normal tab.',
  category: 'feature' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: ['note:read', 'note:write'],
}

const editorProvider: EditorProvider = {
  id: 'dashboard-editor',
  name: 'Dashboard',
  componentId: 'dashboard',
  supportedTypes: [DASHBOARD_TYPE],
}

export default definePlugin({
  manifest: manifest as never,
  async setup(context: PluginContext) {
    const open = () => {
      void openDashboard(context)
    }

    context.registerCapability('editor-provider', editorProvider)

    context.registerDocumentType({
      type: DASHBOARD_TYPE,
      label: 'Home',
      icon: LayoutDashboard,
      singleton: true,
      editable: true,
      create: () => ({
        type: DASHBOARD_TYPE,
        content: '',
        data: { version: 1 },
        metadata: { singleton: DASHBOARD_TYPE },
      }),
    })

    context.registerEditor({
      type: DASHBOARD_TYPE,
      component: DashboardDocumentEditor,
      capabilityId: editorProvider.id,
      layout: 'fill',
      ownsTitle: true,
    })

    context.registerCapability('activity-bar-item', {
      id: 'readergo.dashboard.open-item',
      label: 'Home',
      icon: Home,
      position: 'top',
      order: 0,
      onClick: open,
    })

    await context.registerCommand({
      id: 'readergo.dashboard.open',
      title: DASHBOARD_TITLE,
      handler: async () => openDashboard(context),
    })

    context.log.info('Dashboard plugin activated')
    return async () => {
      context.log.info('Dashboard plugin deactivated')
    }
  },
})
