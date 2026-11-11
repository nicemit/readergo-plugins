import type { NoteStorageCapability, PluginContext } from '@readergo/plugin-sdk'
import { DASHBOARD_TITLE, DASHBOARD_TYPE } from './types'

type ListedDoc = {
  id?: string
  type?: string
  title?: string
  metadata?: Record<string, unknown>
  createdAt?: string | number
}

/**
 * Open the singleton Home dashboard document for this space.
 * Creates one only when none exists. Never mints a second.
 */
export async function openDashboard(context: PluginContext): Promise<string | null> {
  // Sync signal so the host can stamp navigation intent before this async
  // list/open finishes - otherwise a later document.open steals focus.
  context.emit('navigation:intent-home', {})

  const storage = await context.getCapability<NoteStorageCapability>('document-storage')
  const listed = ((await storage?.list()) || []) as ListedDoc[]
  const matches = listed.filter(
    (doc) =>
      doc.type === DASHBOARD_TYPE ||
      doc.metadata?.singleton === DASHBOARD_TYPE ||
      (doc.type === DASHBOARD_TYPE && doc.title === DASHBOARD_TITLE),
  )

  if (matches.length > 1) {
    context.log.warn(
      `Found ${matches.length} dashboard documents; opening the oldest and not creating another`,
    )
  }

  const existing = matches
    .slice()
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return aTime - bTime
    })[0]

  if (existing?.id) {
    await context.executeCommand('document.open', { id: existing.id })
    return existing.id
  }

  // document.create enforces singleton when the type is registered with singleton: true
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
