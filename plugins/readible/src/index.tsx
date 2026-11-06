import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import type { CenterPaneOverlay, Plugin, PluginContext, PluginManifest } from '@readergo/plugin-sdk'
import { DOCUMENT_OVERLAY_UPDATED, DOCUMENT_SURFACE_CHANGED, WellKnownPlaces } from '@readergo/plugin-sdk'
import { Readible, type ReadiblePrefs } from './Readible'
import { DEFAULT_READIBLE_SETTINGS } from './textProcessing'

const PREFS_NS = 'readible'

type UserStateCapability = {
  get(namespace: string, key: string): Promise<unknown | null>
  set(namespace: string, key: string, value: unknown): Promise<void>
}

type NoteRecord = {
  id: string
  title?: string
  content?: string
  spaceId?: string
}

type NoteGetResult = {
  success?: boolean
  data?: NoteRecord
  error?: string
}

type Session = {
  noteId: string
  spaceKey: string
  title: string
  content: string
  prefs: ReadiblePrefs
  status: 'loading' | 'ready' | 'error'
  error?: string
}

let pluginContext: PluginContext | null = null
let surfaceSubscription: string | null = null
let session: Session | null = null
let livePrefs: ReadiblePrefs | null = null
let generation = 0
let anchoredSessionId: string | null = null
let anchorHostNoteId: string | null | undefined = undefined
let persistTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
  void pluginContext?.emit(DOCUMENT_OVERLAY_UPDATED, { id: 'readergo.features.readible' })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSession() {
  return session
}

function defaultPrefs(): ReadiblePrefs {
  return {
    wordSpeed: DEFAULT_READIBLE_SETTINGS.wordSpeed,
    punctuationSpeed: DEFAULT_READIBLE_SETTINGS.punctuationSpeed,
    currentWordIndex: 0,
  }
}

function normalizePrefs(value: unknown): ReadiblePrefs {
  const base = defaultPrefs()
  if (!value || typeof value !== 'object') return base
  const raw = value as Partial<ReadiblePrefs>
  const wordSpeed = Number(raw.wordSpeed)
  const punctuationSpeed = Number(raw.punctuationSpeed)
  const currentWordIndex = Number(raw.currentWordIndex)
  return {
    wordSpeed: Number.isFinite(wordSpeed) ? wordSpeed : base.wordSpeed,
    punctuationSpeed: Number.isFinite(punctuationSpeed) ? punctuationSpeed : base.punctuationSpeed,
    currentWordIndex:
      Number.isFinite(currentWordIndex) && currentWordIndex >= 0
        ? Math.floor(currentWordIndex)
        : 0,
  }
}

async function readPrefs(context: PluginContext, key: string): Promise<ReadiblePrefs> {
  const store = await context.getCapability<UserStateCapability>('user-state')
  if (!store) return defaultPrefs()
  try {
    return normalizePrefs(await store.get(PREFS_NS, key))
  } catch {
    return defaultPrefs()
  }
}

async function writePrefs(context: PluginContext, key: string, prefs: ReadiblePrefs): Promise<void> {
  const store = await context.getCapability<UserStateCapability>('user-state')
  if (!store) return
  try {
    await store.set(PREFS_NS, key, prefs)
  } catch (err) {
    context.log.warn('Could not save reading prefs', err)
  }
}

function schedulePersist() {
  const current = session
  const prefs = livePrefs
  const context = pluginContext
  if (!current || current.status !== 'ready' || !prefs || !context) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void writePrefs(context, current.spaceKey, prefs)
  }, 400)
}

function reportPrefs(noteId: string, prefs: ReadiblePrefs) {
  if (!session || session.noteId !== noteId || session.status !== 'ready') return
  livePrefs = prefs
  schedulePersist()
}

async function hidePanes(context: PluginContext) {
  await context.executeCommand('readergo.workbench.setPanes', { left: false, right: false })
}

async function showPanes(context: PluginContext) {
  await context.executeCommand('readergo.workbench.setPanes', { left: true, right: true })
}

async function openReadible(noteId: string) {
  const context = pluginContext
  if (!context) return { success: false, error: 'Plugin is not active' }
  if (!noteId) return { success: false, error: 'Missing note id' }

  const gen = ++generation
  const previous = session
  const previousPrefs = livePrefs
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  if (previous && previousPrefs && previous.status === 'ready') {
    void writePrefs(context, previous.spaceKey, previousPrefs)
  }
  session = {
    noteId,
    spaceKey: noteId,
    title: '',
    content: '',
    prefs: defaultPrefs(),
    status: 'loading',
  }
  livePrefs = null
  emit()
  void hidePanes(context)

  let result: NoteGetResult | undefined
  try {
    result = (await context.executeCommand('readergo.note.get', { id: noteId })) as NoteGetResult | undefined
  } catch (err) {
    result = { success: false, error: err instanceof Error ? err.message : String(err) }
  }
  if (gen !== generation) return { success: false, error: 'Closed' }
  if (!result?.success || !result.data) {
    const error = result?.error || 'Could not load the document'
    session = {
      noteId,
      spaceKey: noteId,
      title: '',
      content: '',
      prefs: defaultPrefs(),
      status: 'error',
      error,
    }
    emit()
    void context.executeCommand('readergo.toast.show', {
      type: 'error',
      message: 'Could not open the reader',
    })
    return { success: false, error }
  }

  const spaceKey = `${result.data.spaceId || 'space'}:${noteId}`
  const prefs = await readPrefs(context, spaceKey)
  if (gen !== generation) return { success: false, error: 'Closed' }

  session = {
    noteId,
    spaceKey,
    title: result.data.title?.trim() || 'Untitled',
    content: typeof result.data.content === 'string' ? result.data.content : '',
    prefs,
    status: 'ready',
  }
  livePrefs = prefs
  emit()
  return { success: true }
}

function watchHostNote(sessionNoteId: string, hostNoteId: string | null) {
  if (anchoredSessionId !== sessionNoteId) {
    anchoredSessionId = sessionNoteId
    anchorHostNoteId = hostNoteId
    return
  }
  if (!hostNoteId) {
    if (anchorHostNoteId) void closeReadible()
    return
  }
  if (hostNoteId === sessionNoteId) {
    anchorHostNoteId = hostNoteId
    return
  }
  if (hostNoteId !== anchorHostNoteId) {
    void closeReadible()
  }
}

async function closeReadible() {
  const context = pluginContext
  const current = session
  const prefs = livePrefs
  generation += 1
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  session = null
  livePrefs = null
  anchoredSessionId = null
  anchorHostNoteId = undefined
  emit()
  if (context && current && prefs) {
    await writePrefs(context, current.spaceKey, prefs)
  }
  if (context && current) {
    await showPanes(context)
  }
  return { success: true }
}

function ReadibleOverlay(props: {
  noteId?: string | null
  viewMode?: 'dashboard' | 'editor'
}) {
  const current = useSyncExternalStore(subscribe, getSession, getSession)
  const onPrefsChange = useCallback((prefs: ReadiblePrefs) => {
    if (!current) return
    reportPrefs(current.noteId, prefs)
  }, [current])

  useEffect(() => {
    if (!current) return
    if (props.viewMode === 'dashboard') {
      void closeReadible()
      return
    }
    watchHostNote(current.noteId, props.noteId ?? null)
  }, [current, props.noteId, props.viewMode])

  if (!current) return null

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{current.title || 'Untitled'}</p>
          <p className="text-xs text-muted-foreground">Readible</p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close reader"
          onClick={() => {
            void closeReadible()
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {current.status === 'loading' && (
          <p className="p-6 text-sm text-muted-foreground">Loading...</p>
        )}
        {current.status === 'error' && (
          <p className="p-6 text-sm text-muted-foreground">{current.error || 'Could not load the document.'}</p>
        )}
        {current.status === 'ready' && (
          <Readible
            text={current.content}
            title={current.title}
            noteId={current.noteId}
            initialWordSpeed={current.prefs.wordSpeed}
            initialPunctuationSpeed={current.prefs.punctuationSpeed}
            initialWordIndex={current.prefs.currentWordIndex}
            onPrefsChange={onPrefsChange}
            onClose={() => {
              void closeReadible()
            }}
          />
        )}
      </div>
    </div>
  )
}

const manifest: PluginManifest = {
  id: 'readergo.features.readible',
  name: 'Readible',
  version: '1.1.0',
  description: 'Word-by-word reader for an open document. Speeds and place are remembered per document.',
  category: 'feature',
  provides: ['center-pane-overlay'],
  requires: [],
  permissions: ['note:read'],
  trust: 'trusted',
  source: 'external',
  runtime: 'local',
}

export const ReadiblePlugin: Plugin = {
  manifest,

  async activate(context: PluginContext): Promise<void> {
    pluginContext = context

    await context.registerCommand({
      id: 'readergo.readible.open',
      title: 'Open in Readible',
      category: 'Reading',
      handler: async (payload?: { noteId?: string }) => openReadible(payload?.noteId || ''),
    })

    await context.registerCommand({
      id: 'readergo.readible.close',
      title: 'Close Readible',
      category: 'Reading',
      handler: async () => closeReadible(),
    })

    await context.registerContribution({
      id: 'readergo.readible.open-item',
      place: WellKnownPlaces.EXPLORER_NOTE_CONTEXT_MENU,
      title: 'Open in Readible',
      order: 20,
      commandId: 'readergo.readible.open',
    })

    const overlay: CenterPaneOverlay = {
      id: 'readergo.features.readible',
      name: 'Readible',
      scope: 'active-document',
      get boundNoteId() {
        return session?.noteId ?? null
      },
      order: 10,
      renderOverlay: (props) => (
        <ReadibleOverlay noteId={props.noteId} viewMode={props.viewMode} />
      ),
    }
    await context.registerCapability('center-pane-overlay', overlay)
    surfaceSubscription = await context.subscribe(DOCUMENT_SURFACE_CHANGED, (payload) => {
      const next = payload as { noteId?: string | null; viewMode?: string }
      if (!session) return
      if (next?.viewMode === 'dashboard' || next?.noteId !== session.noteId) {
        void closeReadible()
      }
    })
    context.log.info('Readible ready')
  },

  deactivate() {
    const context = pluginContext
    const subscription = surfaceSubscription
    surfaceSubscription = null
    void closeReadible()
    if (context && subscription) void context.unsubscribe(subscription)
    pluginContext = null
  },
}

export default ReadiblePlugin
