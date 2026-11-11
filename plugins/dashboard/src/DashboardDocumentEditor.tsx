'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, FolderOpen, Home, Layers, Plus, Sparkles } from 'lucide-react'
import type { EditorProps } from '@readergo/plugin-sdk'
// audit-ignore: sdk-boundary - host contribution slot for pin-notes / architecture cards
import { ExtensionSlot } from '@/components/layout/ExtensionSlot'
// audit-ignore: sdk-boundary - host command bus (DocumentTypeRegistry is not a plugin host module)
import { executeCommand, usePluginEvent } from '@/lib/platform/actions'
// audit-ignore: sdk-boundary - registered host helpers for type icons / labels
import { getDocumentTypeIcon } from '@/lib/notes/noteListDisplay'
import { DASHBOARD_KIND, DASHBOARD_KIND_BLURB, type DashboardNote } from './types'

type AvailableNoteType = {
  type: string
  providerName?: string
  label?: string
}

type ActiveSpace = {
  id?: string
  name?: string
  backendId?: string
  type?: string
}

function firstNameOf(name?: string): string {
  if (!name) return 'there'
  return name.split(' ')[0] || 'there'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function labelForType(type: string, types: AvailableNoteType[]): string {
  const match = types.find((item) => item.type === type)
  return match?.providerName || match?.label || type
}

function previewFromContent(content?: string): string | null {
  if (!content || typeof content !== 'string') return null
  const plain = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return null
  return plain.length > 110 ? `${plain.slice(0, 109)}…` : plain
}

function startOfTodayMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function asNotes(input: EditorProps['notes']): DashboardNote[] {
  if (!Array.isArray(input)) return []
  return input.map((note) => ({
    id: note.id,
    title: typeof note.title === 'string' ? note.title : 'Untitled',
    content: typeof (note as DashboardNote).content === 'string' ? (note as DashboardNote).content : undefined,
    type: typeof (note as DashboardNote).type === 'string' ? (note as DashboardNote).type : 'note',
    status: typeof (note as DashboardNote).status === 'string' ? (note as DashboardNote).status : 'draft',
    createdAt:
      typeof (note as DashboardNote).createdAt === 'string'
        ? (note as DashboardNote).createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof (note as DashboardNote).updatedAt === 'string'
        ? (note as DashboardNote).updatedAt
        : new Date().toISOString(),
    folders: Array.isArray((note as DashboardNote).folders)
      ? (note as DashboardNote).folders
      : [],
  }))
}

/**
 * Workspace overview dashboard - a normal document type opened in a tab.
 * Library rows come from the host via props.notes (no second list fetch).
 */
export function DashboardDocumentEditor(props: EditorProps) {
  const notes = useMemo(() => asNotes(props.notes), [props.notes])
  const [noteTypes, setNoteTypes] = useState<AvailableNoteType[]>([])
  const [space, setSpace] = useState<ActiveSpace | null>(null)
  const [stamp, setStamp] = useState(0)
  const userName =
    typeof props.userName === 'string'
      ? props.userName
      : typeof (props as { sessionUserName?: string }).sessionUserName === 'string'
        ? (props as { sessionUserName?: string }).sessionUserName
        : undefined

  usePluginEvent('plugin:activated', () => setStamp((v) => v + 1))
  usePluginEvent('plugin:deactivated', () => setStamp((v) => v + 1))
  usePluginEvent('editor:registered', () => setStamp((v) => v + 1))
  usePluginEvent('space:active-changed', () => setStamp((v) => v + 1))

  useEffect(() => {
    let cancelled = false
    void executeCommand<AvailableNoteType[]>('readergo.core.getAvailableNoteTypes').then((result) => {
      if (cancelled) return
      setNoteTypes(Array.isArray(result) ? result : [])
    })
    void executeCommand<ActiveSpace>('readergo.spaces.getActive').then((result) => {
      if (cancelled) return
      setSpace(result && typeof result === 'object' ? result : null)
    })
    return () => {
      cancelled = true
    }
  }, [stamp])

  const libraryNotes = useMemo(
    () => notes.filter((note) => note.type !== 'dashboard'),
    [notes],
  )

  const recentNotes = useMemo(
    () =>
      [...libraryNotes]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
        )
        .slice(0, 8),
    [libraryNotes],
  )

  const byType = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const note of libraryNotes) {
      const type = note.type || 'note'
      counts[type] = (counts[type] || 0) + 1
    }
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        label: labelForType(type, noteTypes),
      }))
      .sort((a, b) => b.count - a.count)
  }, [libraryNotes, noteTypes])

  const stats = useMemo(() => {
    const today = startOfTodayMs()
    let updatedToday = 0
    let inFolders = 0
    for (const note of libraryNotes) {
      if (new Date(note.updatedAt || 0).getTime() >= today) updatedToday += 1
      if (note.folders && note.folders.length > 0) inFolders += 1
    }
    return {
      total: libraryNotes.length,
      types: byType.length,
      updatedToday,
      inFolders,
    }
  }, [libraryNotes, byType.length])

  const openNote = (noteId: string) => {
    if (props.onNavigateToNote) {
      props.onNavigateToNote(noteId)
      return
    }
  }

  const createOfType = (type: string) => {
    const createTyped = (props as { onCreateNote?: (type?: string) => void }).onCreateNote
    if (createTyped) {
      createTyped(type)
      return
    }
    props.handleCreateNote?.('')
  }

  const creatableTypes = noteTypes.filter((def) => def.type !== 'dashboard')
  const spaceLabel = space?.name?.trim() || 'This space'
  const backendHint = space?.backendId ? String(space.backendId) : null

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Home className="h-3.5 w-3.5" />
            {DASHBOARD_KIND}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                Hello, {firstNameOf(userName)}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {DASHBOARD_KIND_BLURB}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {formatDate()}
                {' · '}
                <span className="text-foreground/80">{spaceLabel}</span>
                {backendHint ? ` · ${backendHint}` : ''}
                {' · '}
                {stats.total} docs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Documents', value: stats.total },
              { label: 'Types', value: stats.types },
              { label: 'Updated today', value: stats.updatedToday },
              { label: 'In folders', value: stats.inFolders },
            ].map((item) => (
              <div
                key={item.label}
                className="border-b border-border/50 px-1 py-2"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </div>
                <div
                  className="mt-1 text-xl font-semibold tabular-nums text-foreground"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </header>

        <ExtensionSlot
          id="dashboard-pinned"
          onOpenNoteById={openNote}
          className="w-full"
        />

        {creatableTypes.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                Create
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Start a new document in {spaceLabel}. Types come from installed editor plugins.
            </p>
            <div className="flex flex-wrap gap-2">
              {creatableTypes.map((def) => {
                const TypeIcon = getDocumentTypeIcon(def.type)
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => createOfType(def.type)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-card active:scale-[0.98]"
                  >
                    <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {def.providerName || def.label || def.type}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {recentNotes.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                Recent
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              From the open space library (same list the sidebar already loaded).
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recentNotes.map((note) => {
                const TypeIcon = getDocumentTypeIcon(note.type || 'note')
                const preview = previewFromContent(note.content)
                const inFolder = Boolean(note.folders && note.folders.length > 0)
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openNote(note.id)}
                    className="group flex items-start gap-3.5 rounded-xl border border-border/50 bg-card/50 p-4 text-left shadow-sm transition-all hover:border-border/80 hover:bg-card/80 active:scale-[0.99]"
                  >
                    <TypeIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary"
                        style={{ fontFamily: 'var(--font-space-grotesk)' }}
                      >
                        {note.title || 'Untitled'}
                      </div>
                      {preview ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {preview}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatRelativeTime(note.updatedAt || '')}
                        </span>
                        <span className="rounded border border-border/40 bg-muted/40 px-1.5 font-mono text-[9px] uppercase text-muted-foreground">
                          [{labelForType(note.type || 'note', noteTypes)}]
                        </span>
                        {inFolder ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                            <FolderOpen className="h-3 w-3" />
                            filed
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {byType.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                By type
              </h2>
            </div>
            <div className="space-y-3.5 rounded-2xl border border-border/60 bg-card/40 p-5 shadow-xl backdrop-blur-xl">
              {byType.map((row) => {
                const max = Math.max(...byType.map((item) => item.count), 1)
                return (
                  <div key={row.type} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">{row.label}</span>
                      <span className="font-mono text-muted-foreground">{row.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${(row.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {recentNotes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/30 px-6 py-10 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No documents in this space yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create one above. This overview is a normal tab - close it, reopen Home anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
