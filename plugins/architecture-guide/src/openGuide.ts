import type { NoteStorageCapability, PluginContext } from '@readergo/plugin-sdk'

export const GUIDE_TYPE = 'architecture-guide'
export const GUIDE_TITLE = 'How ReaderGo Works'

type ListedDoc = {
  id?: string
  type?: string
  title?: string
  metadata?: Record<string, unknown>
}

export async function openArchitectureGuide(context: PluginContext): Promise<string | null> {
  const storage = await context.getCapability<NoteStorageCapability>('document-storage')
  const listed = ((await storage?.list()) || []) as ListedDoc[]
  const existing = listed.find(
    (doc) =>
      doc.type === GUIDE_TYPE ||
      doc.metadata?.singleton === GUIDE_TYPE ||
      doc.title === GUIDE_TITLE,
  )

  if (existing?.id) {
    await context.executeCommand('document.open', { id: existing.id })
    return existing.id
  }

  const created = (await context.executeCommand('document.create', {
    type: GUIDE_TYPE,
    title: GUIDE_TITLE,
  })) as { id?: string } | null

  if (created?.id) {
    await context.executeCommand('document.open', { id: created.id })
    return created.id
  }

  context.log.warn('Could not create the architecture guide document')
  return null
}
