import type { NoteStorageCapability, PluginContext } from '@readergo/plugin-sdk'
import { DASHBOARD_TITLE, DASHBOARD_TYPE } from './types'

type ListedDoc = {
  id?: string
  type?: string
  title?: string
  metadata?: Record<string, unknown>
}

/**
 * Open an existing dashboard document, or create one titled Home.
 * Extra dashboards can still be created from New Document.
 */
export async function openDashboard(context: PluginContext): Promise<string | null> {
  const storage = await context.getCapability<NoteStorageCapability>('document-storage')
  const listed = ((await storage?.list()) || []) as ListedDoc[]
  const existing =
    listed.find((doc) => doc.metadata?.singleton === DASHBOARD_TYPE) ||
    listed.find((doc) => doc.type === DASHBOARD_TYPE && doc.title === DASHBOARD_TITLE) ||
    listed.find((doc) => doc.type === DASHBOARD_TYPE)

  if (existing?.id) {
    await context.executeCommand('document.open', { id: existing.id })
    return existing.id
  }

  const created = (await context.executeCommand('document.create', {
    type: DASHBOARD_TYPE,
    title: DASHBOARD_TITLE,
    metadata: { singleton: DASHBOARD_TYPE },
  })) as { id?: string } | null

  if (created?.id) {
    await context.executeCommand('document.open', { id: created.id })
    return created.id
  }

  context.log.warn('Could not create a dashboard document')
  return null
}
