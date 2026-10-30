import React, { useCallback, useEffect, useState } from 'react'
import type { PluginContext } from '@readergo/plugin-sdk'
import { ListTree, Timer, Type } from 'lucide-react'
import { summarizeDocument, type DocumentStats, type HeadingItem } from './stats'

interface OutlinePanelProps {
  noteId: string | null
  context: PluginContext
}

const EMPTY_STATS: DocumentStats = {
  words: 0,
  characters: 0,
  headings: [],
  readingMinutes: 0,
}

function scrollToHeading(heading: HeadingItem, index: number) {
  const editor = document.querySelector('.tiptap') as HTMLElement | null
  if (!editor) return
  const nodes = editor.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const tagged = editor.querySelector(`[data-heading-id="${CSS.escape(heading.id)}"]`)
  const target = (tagged as HTMLElement | null) || (nodes[index] as HTMLElement | undefined)
  if (!target) return
  const scroller = target.closest('.overflow-y-auto') as HTMLElement | null
  if (scroller) {
    const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12
    scroller.scrollTo({ top, behavior: 'smooth' })
  } else {
    target.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
}

export function OutlinePanel({ noteId, context }: OutlinePanelProps) {
  const [stats, setStats] = useState<DocumentStats>(EMPTY_STATS)
  const [title, setTitle] = useState('')

  const load = useCallback(async () => {
    if (!noteId) {
      setStats(EMPTY_STATS)
      setTitle('')
      return
    }
    try {
      const storage = await context.getCapability<{ get(id: string): Promise<{ title?: string; content?: string } | null> }>(
        'document-storage',
      )
      const doc = await storage?.get(noteId)
      if (!doc) {
        setStats(EMPTY_STATS)
        setTitle('')
        return
      }
      setTitle(doc.title || '')
      setStats(summarizeDocument(doc.content || ''))
    } catch (err) {
      context.log.warn('Outline could not read the active document', err)
    }
  }, [context, noteId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let subId: string | undefined
    void context.subscribe('note:updated', (payload: unknown) => {
      const id = (payload as { id?: string } | undefined)?.id
      if (!id || id === noteId) void load()
    }).then((id) => {
      subId = id
    })
    return () => {
      if (subId) void context.unsubscribe(subId)
    }
  }, [context, load, noteId])

  if (!noteId) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        Open a note to see its outline and word count.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      <div className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ListTree className="h-3.5 w-3.5" />
        Outline
      </div>
      {title ? (
        <p className="truncate px-2 text-sm font-medium" title={title}>
          {title}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 px-2">
        <div className="rounded-md border border-border bg-card px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
            <Type className="h-3 w-3" />
            Words
          </div>
          <div className="text-sm font-semibold tabular-nums">{stats.words.toLocaleString()}</div>
        </div>
        <div className="rounded-md border border-border bg-card px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
            <Timer className="h-3 w-3" />
            Read
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {stats.words === 0 ? '-' : `${stats.readingMinutes} min`}
          </div>
        </div>
      </div>
      <p className="px-2 text-[11px] text-muted-foreground">
        {stats.characters.toLocaleString()} characters
      </p>
      {stats.headings.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">No headings in this document.</p>
      ) : (
        <nav className="flex flex-col gap-0.5">
          {stats.headings.map((heading, index) => (
            <button
              key={`${heading.id}-${index}`}
              type="button"
              className="rounded-md px-2 py-1 text-left text-muted-foreground hover:bg-muted hover:text-foreground"
              style={{ paddingLeft: `${(heading.level - 1) * 10 + 8}px` }}
              onClick={() => scrollToHeading(heading, index)}
            >
              <span className={heading.level <= 2 ? 'text-sm font-medium' : 'text-xs'}>
                {heading.text}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
