'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  EditorProps,
  NoteStorageCapability,
  PluginContext,
} from '@readergo/plugin-sdk'
import { findChapterIndex, parseEpub, splitEpubHref } from './parseEpub'
import type { EpubBook, EpubLocation, EpubTocItem } from './types'

const NATIVE_FILE_SOURCE = 'native-file'
const LOCATION_NS = 'document-location'
const USER_STATE_CAPABILITY_ID = 'user-state'

type UserStateCapability = {
  get(namespace: string, key: string): Promise<unknown | null>
  set(namespace: string, key: string, value: unknown): Promise<void>
}

type CurrentNote = NonNullable<EditorProps['currentNote']> & {
  metadata?: Record<string, unknown>
  spaceId?: string
}

let pluginContext: PluginContext | null = null
const contextListeners = new Set<() => void>()

export function setEpubPluginContext(context: PluginContext | null) {
  pluginContext = context
  contextListeners.forEach((fn) => fn())
}

function onEpubContext(fn: () => void): () => void {
  contextListeners.add(fn)
  return () => {
    contextListeners.delete(fn)
  }
}

function isNativeEpub(note: CurrentNote | null | undefined): boolean {
  return note?.metadata?.source === NATIVE_FILE_SOURCE
}

function hasZipSignature(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false
  const header = new Uint8Array(bytes, 0, 4)
  return header[0] === 0x50 && header[1] === 0x4b
}

function locationKey(note: CurrentNote | null | undefined): string | null {
  if (!note?.id) return null
  return `${note.spaceId || 'space'}:${note.id}`
}

function scrollToHash(root: HTMLElement | null, hash: string) {
  if (!root || !hash) return
  const id = hash
  const el =
    root.querySelector(`#${CSS.escape(id)}`) ||
    root.querySelector(`[name="${CSS.escape(id)}"]`) ||
    root.querySelector(`[id="${CSS.escape(id)}"]`)
  el?.scrollIntoView({ block: 'start' })
}

async function readLocation(
  note: CurrentNote | null | undefined,
): Promise<EpubLocation> {
  const key = locationKey(note)
  if (!key || !pluginContext) return { chapterIndex: 0 }
  const store = await pluginContext.getCapability<UserStateCapability>(
    USER_STATE_CAPABILITY_ID,
  )
  const saved = (await store?.get(LOCATION_NS, key)) as EpubLocation | null
  const index = saved?.chapterIndex
  return {
    chapterIndex: typeof index === 'number' && index >= 0 ? index : 0,
    href: typeof saved?.href === 'string' ? saved.href : undefined,
  }
}

async function writeLocation(
  note: CurrentNote | null | undefined,
  chapterIndex: number,
  href?: string,
): Promise<void> {
  const key = locationKey(note)
  if (!key || !pluginContext) return
  const store = await pluginContext.getCapability<UserStateCapability>(
    USER_STATE_CAPABILITY_ID,
  )
  await store?.set(LOCATION_NS, key, { chapterIndex, href } satisfies EpubLocation)
}

function tocItems(
  items: EpubTocItem[],
  onOpen: (href: string) => void,
  activeHref: string,
  depth = 0,
): React.ReactNode {
  return (
    <ul
      className={
        depth === 0
          ? 'space-y-2'
          : 'mt-1 space-y-1 border-l border-gray-200 pl-2.5 dark:border-gray-700'
      }
    >
      {items.map((item, index) => {
        const active = item.href === activeHref
        return (
          <li key={`${item.href}-${item.label}-${index}`}>
            {item.href ? (
              <button
                type="button"
                className={`block w-full text-left leading-5 ${
                  depth === 0 ? 'text-sm font-medium' : 'text-xs'
                } ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-gray-700 hover:text-emerald-700 dark:text-gray-300 dark:hover:text-emerald-400'
                }`}
                onClick={() => onOpen(item.href)}
              >
                {item.label}
              </button>
            ) : (
              <span className={`${depth === 0 ? 'text-sm font-medium' : 'text-xs'} text-gray-500`}>
                {item.label}
              </span>
            )}
            {item.children && item.children.length > 0
              ? tocItems(item.children, onOpen, activeHref, depth + 1)
              : null}
          </li>
        )
      })}
    </ul>
  )
}

export function EpubDocumentEditor(props: EditorProps) {
  const { currentNote } = props
  const note = currentNote as CurrentNote | null | undefined
  const [book, setBook] = useState<EpubBook | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const loadedIdRef = useRef<string | null>(null)
  const pendingHashRef = useRef<string | null>(null)

  const applyBook = useCallback(
    async (nextBook: EpubBook, location: EpubLocation) => {
      const max = Math.max(0, nextBook.chapters.length - 1)
      const fromHref = location.href
        ? findChapterIndex(nextBook.chapters, location.href)
        : -1
      const next = Math.max(0, Math.min(max, fromHref >= 0 ? fromHref : location.chapterIndex))
      const hash = location.href ? splitEpubHref(location.href).hash : ''
      pendingHashRef.current = hash || null
      setBook(nextBook)
      setChapterIndex(next)
      // Opening a book is not an edit. Do not push title/content into the
      // Space document or the list will rename the file and say "just now".
    },
    [],
  )

  const loadBytes = useCallback(
    async (bytes: ArrayBuffer, location: EpubLocation) => {
      setLoading(true)
      setError(null)
      try {
        if (!hasZipSignature(bytes)) {
          throw new Error('This file is not a valid EPUB archive.')
        }
        const parsed = await parseEpub(bytes)
        await applyBook(parsed, location)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not read this EPUB'
        const cleanMsg = msg.includes('central directory') || msg.includes('zip file')
          ? 'This file is not a valid EPUB archive.'
          : msg
        setError(cleanMsg)
        setBook(null)
      } finally {
        setLoading(false)
      }
    },
    [applyBook],
  )

  useEffect(() => {
    const id = note?.id
    if (!id) return
    if (loadedIdRef.current === id) return

    let cancelled = false
    let attempts = 0
    const native = isNativeEpub(note)

    if (native) setLoading(true)

    const open = async () => {
      if (cancelled || loadedIdRef.current === id) return

      if (!pluginContext) {
        window.setTimeout(() => {
          if (!cancelled) void open()
        }, 150)
        return
      }

      // Non-native stub/placeholder notes created in the UI do not contain EPUB bytes yet.
      // Immediately show the "Choose EPUB" placeholder view without loading non-existent bytes.
      if (!native) {
        setLoading(false)
        loadedIdRef.current = id
        return
      }

      const storage = await pluginContext.getCapability<NoteStorageCapability>(
        'document-storage',
      )
      const saved = await readLocation(note)

      try {
        const bytes = await storage?.readBytes?.(id)
        if (cancelled) return
        if (bytes && bytes.byteLength > 0) {
          if (!hasZipSignature(bytes)) {
            setError('This file is not a valid EPUB archive.')
            setLoading(false)
            loadedIdRef.current = id
            return
          }
          loadedIdRef.current = id
          await loadBytes(bytes, saved)
          return
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        attempts += 1
        if (native && attempts < 40) {
          window.setTimeout(() => {
            if (!cancelled) void open()
          }, 250)
          return
        }
        setLoading(false)
        setError(message)
        loadedIdRef.current = id
        return
      }

      if (native && attempts < 40) {
        attempts += 1
        window.setTimeout(() => {
          if (!cancelled) void open()
        }, 250)
        return
      }

      setLoading(false)
      loadedIdRef.current = id
    }

    void open()
    const stop = onEpubContext(() => {
      if (!cancelled) void open()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [loadBytes, note])

  const chapter = book?.chapters[chapterIndex] ?? null

  useEffect(() => {
    const hash = pendingHashRef.current
    if (!hash || !chapter) return
    pendingHashRef.current = null
    const frame = window.requestAnimationFrame(() => {
      scrollToHash(articleRef.current, hash)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chapter, chapterIndex])

  const goTo = useCallback(
    (index: number, href?: string) => {
      if (!book) return
      const next = Math.max(0, Math.min(book.chapters.length - 1, index))
      const { hash } = href ? splitEpubHref(href) : { hash: '' }
      pendingHashRef.current = hash || null
      if (next === chapterIndex) {
        if (hash) {
          window.requestAnimationFrame(() => scrollToHash(articleRef.current, hash))
        }
      } else {
        setChapterIndex(next)
      }
      void writeLocation(note, next, href || book.chapters[next]?.href)
    },
    [book, chapterIndex, note],
  )

  const openHref = useCallback(
    (href: string, fromHref?: string) => {
      if (!book) return
      const { path, hash } = splitEpubHref(href)
      if (!path && hash) {
        pendingHashRef.current = hash
        scrollToHash(articleRef.current, hash)
        void writeLocation(note, chapterIndex, `${chapter?.href || ''}#${hash}`)
        return
      }
      const index = findChapterIndex(book.chapters, href, fromHref || chapter?.href)
      if (index < 0) return
      goTo(index, href)
    },
    [book, chapter, chapterIndex, goTo, note],
  )

  const onChapterClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a')
      if (!anchor || !event.currentTarget.contains(anchor)) return
      const href = anchor.getAttribute('data-epub-href') || anchor.getAttribute('href') || ''
      if (!href || href === '#') {
        event.preventDefault()
        return
      }
      if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) return
      event.preventDefault()
      event.stopPropagation()
      openHref(href, chapter?.href)
    },
    [chapter, openHref],
  )

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !pluginContext) return
    const bytes = await file.arrayBuffer()
    const storage = await pluginContext.getCapability<NoteStorageCapability>(
      'document-storage',
    )
    const folderId =
      (note as CurrentNote & { folders?: Array<{ folderId?: string }> })?.folders?.[0]
        ?.folderId || null

    if (isNativeEpub(note) && note?.id && storage?.writeBytes) {
      await storage.writeBytes(note.id, bytes)
      loadedIdRef.current = note.id
      await loadBytes(bytes, await readLocation(note))
      return
    }

    if (storage?.createNativeFile) {
      const created = await storage.createNativeFile({
        type: 'epub',
        fileName: file.name,
        bytes,
        folderId,
      })
      if (note?.id && created.id !== note.id) {
        try {
          await storage.delete(note.id)
        } catch {
          // Stub markdown note can stay if delete is denied.
        }
        await writeLocation(
          { ...created, spaceId: created.spaceId || note.spaceId } as CurrentNote,
          0,
        )
        await pluginContext.executeCommand('document.open', { id: created.id })
        return
      }
    }

    loadedIdRef.current = note?.id ?? null
    await loadBytes(bytes, { chapterIndex: 0 })
  }

  const heading = useMemo(() => {
    if (!book) return 'EPUB'
    return book.creator ? `${book.title} · ${book.creator}` : book.title
  }, [book])

  return (
    <div className="flex h-full min-h-0 w-full bg-white dark:bg-gray-950">
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        className="hidden"
        onChange={onPickFile}
      />

      {book ? (
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-800 md:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Contents</p>
          {tocItems(book.toc, openHref, chapter?.href || '')}
        </aside>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{heading}</h2>
            {chapter ? (
              <p className="truncate text-xs text-gray-500">
                {chapterIndex + 1} / {book?.chapters.length} · {chapter.title}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
              disabled={!book || chapterIndex <= 0}
              onClick={() => goTo(chapterIndex - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
              disabled={!book || chapterIndex >= (book?.chapters.length ?? 1) - 1}
              onClick={() => goTo(chapterIndex + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              onClick={() => fileInputRef.current?.click()}
            >
              {book ? 'Replace EPUB' : 'Open EPUB'}
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <p className="text-sm text-gray-500">Opening book…</p>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose EPUB
              </button>
            </div>
          ) : chapter ? (
            <article
              ref={articleRef}
              className="epub-chapter mx-auto max-w-2xl text-[17px] leading-7 text-gray-800 dark:text-gray-200 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_img]:my-4 [&_img]:max-w-full [&_p]:mb-4 [&_a]:text-emerald-700 dark:[&_a]:text-emerald-400"
              onClickCapture={onChapterClick}
              dangerouslySetInnerHTML={{ __html: chapter.html }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="mb-2 text-base font-medium text-gray-800 dark:text-gray-100">Read an EPUB</p>
              <p className="mb-4 max-w-md text-sm text-gray-500">
                {isNativeEpub(note)
                  ? 'This file is in the Space. The reader opens the bytes from the folder, or you can choose a file here.'
                  : 'Choose an .epub file. It is stored in this Space. Your place in the book is kept with ReaderGo, not next to the file.'}
              </p>
              <button
                type="button"
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose EPUB
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
