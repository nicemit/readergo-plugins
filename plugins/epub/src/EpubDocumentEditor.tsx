'use client'

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  EditorProps,
  NoteStorageCapability,
  PluginContext,
} from '@readergo/plugin-sdk'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Search,
  Type,
  Maximize2,
  Minimize2,
  Upload,
  Clock,
  Sparkles,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react'
import { findChapterIndex, parseEpub, splitEpubHref } from './parseEpub'
import type {
  EpubBook,
  EpubLocation,
  EpubSettings,
  EpubBookmark,
  EpubMargins,
  EpubReadingMode,
} from './types'
import {
  DEFAULT_EPUB_SETTINGS,
  EPUB_THEMES,
} from './types'
import { EpubAppearanceMenu } from './EpubAppearanceMenu'
import { EpubTocDrawer } from './EpubTocDrawer'
import { EpubSearchModal } from './EpubSearchModal'

const NATIVE_FILE_SOURCE = 'native-file'
const LOCATION_NS = 'document-location'
const USER_STATE_CAPABILITY_ID = 'user-state'
const SETTINGS_STORAGE_KEY = 'readergo:epub:settings'

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

function bookmarkStorageKey(note: CurrentNote | null | undefined): string {
  return `readergo:epub:bookmarks:${note?.id || 'default'}`
}

function scrollToHash(root: HTMLElement | null, hash: string) {
  if (!root || !hash) return
  const id = hash
  const el =
    root.querySelector(`#${CSS.escape(id)}`) ||
    root.querySelector(`[name="${CSS.escape(id)}"]`) ||
    root.querySelector(`[id="${CSS.escape(id)}"]`)
  el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

async function readLocation(note: CurrentNote | null | undefined): Promise<EpubLocation> {
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

function loadSavedSettings(): EpubSettings {
  if (typeof window === 'undefined') return DEFAULT_EPUB_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    let parsed: Partial<EpubSettings> = {}
    if (raw) {
      parsed = JSON.parse(raw)
    }

    // If margins not explicitly set in EPUB settings, adapt host's editor-margin setting if present
    if (!parsed.margins) {
      const hostMargin = localStorage.getItem('editor-margin')
      if (hostMargin) {
        const num = parseFloat(hostMargin)
        if (!isNaN(num)) {
          if (num <= 0.15) parsed.margins = 'compact'
          else if (num >= 0.28) parsed.margins = 'wide'
          else parsed.margins = 'normal'
        }
      }
    }

    // Support legacy contentWidth migration if margins is still unset
    if (!parsed.margins && (parsed as any).contentWidth) {
      const cw = (parsed as any).contentWidth
      if (cw === 'wide' || cw === 'full') parsed.margins = 'compact'
      else if (cw === 'narrow') parsed.margins = 'wide'
      else parsed.margins = 'normal'
    }

    return { ...DEFAULT_EPUB_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_EPUB_SETTINGS
  }
}

function saveSettings(settings: EpubSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore quota errors
  }
}

function loadSavedBookmarks(note: CurrentNote | null | undefined): EpubBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(bookmarkStorageKey(note))
    if (!raw) return []
    return JSON.parse(raw) as EpubBookmark[]
  } catch {
    return []
  }
}

function saveBookmarks(note: CurrentNote | null | undefined, bms: EpubBookmark[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(bookmarkStorageKey(note), JSON.stringify(bms))
  } catch {
    // Ignore quota errors
  }
}

export function EpubDocumentEditor(props: EditorProps) {
  const { currentNote } = props
  const note = currentNote as CurrentNote | null | undefined

  const [book, setBook] = useState<EpubBook | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Reader Settings & Modals State
  const [settings, setSettings] = useState<EpubSettings>(loadSavedSettings)
  const [showAppearance, setShowAppearance] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [bookmarks, setBookmarks] = useState<EpubBookmark[]>(() => loadSavedBookmarks(note))
  const [isControlsVisible, setIsControlsVisible] = useState(true)

  // Paginated Kindle Engine State
  const [pageIndex, setPageIndex] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isTurningPage, setIsTurningPage] = useState(false)
  const [viewportDimensions, setViewportDimensions] = useState({ width: 0, height: 0 })

  // Reading Scroll Metrics (used when readingMode is 'scroll')
  const [scrollProgress, setScrollProgress] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const paginatedViewportRef = useRef<HTMLDivElement>(null)
  const columnFlowRef = useRef<HTMLDivElement>(null)
  const loadedIdRef = useRef<string | null>(null)
  const pendingHashRef = useRef<string | null>(null)
  const pendingTargetRef = useRef<'start' | 'end' | number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const wheelDebounceRef = useRef<number | null>(null)

  const theme = EPUB_THEMES[settings.theme] || EPUB_THEMES.paper
  const margins = settings.margins || 'normal'
  const isPaginated = (settings.readingMode || 'paginated') === 'paginated'

  const handleUpdateSettings = useCallback((newSettings: EpubSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }, [])

  // Sync bookmarks on note change
  useEffect(() => {
    setBookmarks(loadSavedBookmarks(note))
  }, [note])

  // Track viewport dimensions with ResizeObserver for exact screen-fitting columns
  useEffect(() => {
    const el = paginatedViewportRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setViewportDimensions({ width, height })
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [isPaginated, isControlsVisible])

  // Compute exact page width, page height, and column gaps based on margins setting
  const pageMetrics = useMemo(() => {
    const containerW =
      viewportDimensions.width ||
      (typeof window !== 'undefined' ? window.innerWidth : 800)
    const containerH =
      viewportDimensions.height ||
      (typeof window !== 'undefined' ? window.innerHeight - 110 : 600)

    let horizontalMargin = 18
    let verticalMargin = 18
    let maxPageW = 760
    let columnGap = 40

    if (margins === 'compact') {
      horizontalMargin = containerW < 640 ? 10 : Math.max(20, Math.round(containerW * 0.05))
      verticalMargin = containerW < 640 ? 12 : 16
      maxPageW = 960
      columnGap = containerW < 640 ? 20 : 32
    } else if (margins === 'wide') {
      horizontalMargin = containerW < 640 ? 28 : Math.max(54, Math.round(containerW * 0.16))
      verticalMargin = containerW < 640 ? 24 : 32
      maxPageW = 620
      columnGap = containerW < 640 ? 36 : 56
    } else {
      // normal
      horizontalMargin = containerW < 640 ? 18 : Math.max(36, Math.round(containerW * 0.10))
      verticalMargin = containerW < 640 ? 18 : 24
      maxPageW = 760
      columnGap = containerW < 640 ? 28 : 44
    }

    const availableW = Math.max(240, containerW - 2 * horizontalMargin)
    const pageWidth = Math.min(maxPageW, availableW)

    // Snap page height to integer multiple of line-height so bottom lines are never sliced in half
    const computedLineHeight = settings.fontSize * (
      settings.lineHeight === 'compact' ? 1.35 : settings.lineHeight === 'relaxed' ? 1.85 : 1.58
    )
    const rawHeight = Math.max(180, containerH - 2 * verticalMargin)
    const snappedLines = Math.max(4, Math.floor(rawHeight / computedLineHeight))
    const pageHeight = Math.round(snappedLines * computedLineHeight)

    return {
      pageWidth,
      pageHeight,
      columnGap,
      horizontalMargin,
      verticalMargin,
    }
  }, [
    viewportDimensions.width,
    viewportDimensions.height,
    margins,
    settings.fontSize,
    settings.lineHeight,
  ])

  const applyBook = useCallback(
    async (nextBook: EpubBook, location: EpubLocation) => {
      const max = Math.max(0, nextBook.chapters.length - 1)
      const fromHref = location.href
        ? findChapterIndex(nextBook.chapters, location.href)
        : -1
      const next = Math.max(0, Math.min(max, fromHref >= 0 ? fromHref : location.chapterIndex))
      const hash = location.href ? splitEpubHref(location.href).hash : ''
      pendingHashRef.current = hash || null
      pendingTargetRef.current = 'start'
      setBook(nextBook)
      setChapterIndex(next)
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
        const cleanMsg =
          msg.includes('central directory') || msg.includes('zip file')
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

  // Estimated reading time for active chapter (~225 WPM)
  const chapterReadingTime = useMemo(() => {
    if (!chapter?.text) return 1
    const words = chapter.text.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 225))
  }, [chapter?.text])

  // Recalculate columns and pagination whenever chapter, dimensions, or font size change
  const updateLayout = useCallback(() => {
    if (!isPaginated) return
    const el = columnFlowRef.current
    if (!el) return

    const step = pageMetrics.pageWidth + pageMetrics.columnGap
    if (step <= 0) return

    // scrollWidth includes all columns and gaps
    const calculatedPages = Math.max(
      1,
      Math.round((el.scrollWidth + pageMetrics.columnGap) / step),
    )
    setTotalPages(calculatedPages)

    if (pendingTargetRef.current === 'end') {
      setPageIndex(calculatedPages - 1)
      pendingTargetRef.current = null
    } else if (pendingTargetRef.current === 'start') {
      setPageIndex(0)
      pendingTargetRef.current = null
    } else if (typeof pendingTargetRef.current === 'number') {
      setPageIndex(Math.max(0, Math.min(calculatedPages - 1, pendingTargetRef.current)))
      pendingTargetRef.current = null
    } else {
      setPageIndex((prev) => Math.max(0, Math.min(calculatedPages - 1, prev)))
    }

    // Scroll to hash / anchor if pending
    if (pendingHashRef.current) {
      const hash = pendingHashRef.current
      pendingHashRef.current = null
      const target =
        el.querySelector(`#${CSS.escape(hash)}`) ||
        el.querySelector(`[name="${CSS.escape(hash)}"]`)
      if (target instanceof HTMLElement) {
        const page = Math.floor(target.offsetLeft / step)
        setPageIndex(Math.max(0, Math.min(calculatedPages - 1, page)))
      }
    }
  }, [isPaginated, pageMetrics.pageWidth, pageMetrics.columnGap])

  useLayoutEffect(() => {
    if (!isPaginated) return
    const frame = window.requestAnimationFrame(updateLayout)
    return () => window.cancelAnimationFrame(frame)
  }, [
    isPaginated,
    chapter,
    chapterIndex,
    pageMetrics.pageWidth,
    pageMetrics.pageHeight,
    pageMetrics.columnGap,
    settings.fontSize,
    settings.lineHeight,
    settings.fontFamily,
    updateLayout,
  ])

  // Scroll to anchor in continuous scroll mode
  useEffect(() => {
    if (isPaginated) return
    const hash = pendingHashRef.current
    if (!hash || !chapter) return
    pendingHashRef.current = null
    const frame = window.requestAnimationFrame(() => {
      scrollToHash(articleRef.current, hash)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chapter, chapterIndex, isPaginated])

  // Reset scroll on chapter change in scroll mode
  useEffect(() => {
    if (isPaginated) return
    if (!pendingHashRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' })
      setScrollProgress(0)
    }
  }, [chapterIndex, isPaginated])

  // Track scroll percentage within chapter in scroll mode
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const total = el.scrollHeight - el.clientHeight
    if (total <= 0) {
      setScrollProgress(100)
    } else {
      setScrollProgress(Math.min(100, Math.round((el.scrollTop / total) * 100)))
    }
  }, [])

  const goTo = useCallback(
    (index: number, href?: string, targetPage?: 'start' | 'end' | number) => {
      if (!book) return
      const next = Math.max(0, Math.min(book.chapters.length - 1, index))
      const { hash } = href ? splitEpubHref(href) : { hash: '' }
      pendingHashRef.current = hash || null
      pendingTargetRef.current = targetPage ?? 'start'

      if (next === chapterIndex) {
        if (hash) {
          if (!isPaginated && articleRef.current) {
            window.requestAnimationFrame(() => scrollToHash(articleRef.current, hash))
          } else if (columnFlowRef.current) {
            updateLayout()
          }
        }
        if (typeof targetPage === 'number') {
          setPageIndex(targetPage)
        }
      } else {
        setChapterIndex(next)
      }
      void writeLocation(note, next, href || book.chapters[next]?.href)
    },
    [book, chapterIndex, isPaginated, note, updateLayout],
  )

  const openHref = useCallback(
    (href: string, fromHref?: string) => {
      if (!book) return
      const { path, hash } = splitEpubHref(href)
      if (!path && hash) {
        pendingHashRef.current = hash
        if (!isPaginated) {
          scrollToHash(articleRef.current, hash)
        } else if (columnFlowRef.current) {
          const step = pageMetrics.pageWidth + pageMetrics.columnGap
          const target =
            columnFlowRef.current.querySelector(`#${CSS.escape(hash)}`) ||
            columnFlowRef.current.querySelector(`[name="${CSS.escape(hash)}"]`)
          if (target instanceof HTMLElement) {
            const page = Math.floor(target.offsetLeft / step)
            setPageIndex(Math.max(0, Math.min(totalPages - 1, page)))
          }
        }
        void writeLocation(note, chapterIndex, `${chapter?.href || ''}#${hash}`)
        return
      }
      const index = findChapterIndex(book.chapters, href, fromHref || chapter?.href)
      if (index < 0) return
      goTo(index, href, 'start')
    },
    [book, chapter, chapterIndex, goTo, isPaginated, note, pageMetrics, totalPages],
  )

  // Turn to Next Page (Kindle Style: advances to next chapter if at end)
  const turnNextPage = useCallback(() => {
    if (pageIndex < totalPages - 1) {
      setIsTurningPage(true)
      setPageIndex((p) => p + 1)
      window.setTimeout(() => setIsTurningPage(false), 240)
    } else if (book && chapterIndex < book.chapters.length - 1) {
      pendingTargetRef.current = 'start'
      goTo(chapterIndex + 1, undefined, 'start')
    }
  }, [pageIndex, totalPages, book, chapterIndex, goTo])

  // Turn to Previous Page (Kindle Style: moves to last page of prev chapter if at start)
  const turnPrevPage = useCallback(() => {
    if (pageIndex > 0) {
      setIsTurningPage(true)
      setPageIndex((p) => p - 1)
      window.setTimeout(() => setIsTurningPage(false), 240)
    } else if (chapterIndex > 0) {
      pendingTargetRef.current = 'end'
      goTo(chapterIndex - 1, undefined, 'end')
    }
  }, [pageIndex, chapterIndex, goTo])

  // Tap handler on the reading area: left 25% prev, right 25% next, center 50% toggle controls
  const handleReadingAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('a') || target?.closest('button') || target?.closest('input')) {
        return
      }

      const selection = window.getSelection()?.toString()
      if (selection && selection.trim().length > 0) {
        return
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const ratio = clickX / rect.width

      if (ratio < 0.25) {
        turnPrevPage()
      } else if (ratio > 0.75) {
        turnNextPage()
      } else {
        setIsControlsVisible((v) => !v)
      }
    },
    [turnPrevPage, turnNextPage],
  )

  // Touch gesture handling for smooth mobile / tablet swiping
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      }
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length === 0) return
      const start = touchStartRef.current
      touchStartRef.current = null

      const deltaX = e.changedTouches[0].clientX - start.x
      const deltaY = e.changedTouches[0].clientY - start.y
      const elapsed = Date.now() - start.time

      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) && elapsed < 800) {
        if (deltaX < 0) {
          turnNextPage()
        } else {
          turnPrevPage()
        }
      }
    },
    [turnNextPage, turnPrevPage],
  )

  // Mouse wheel page turn (debounced)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isPaginated) return
      e.preventDefault()

      const now = Date.now()
      if (wheelDebounceRef.current && now - wheelDebounceRef.current < 280) {
        return
      }

      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (Math.abs(delta) > 20) {
        wheelDebounceRef.current = now
        if (delta > 0) {
          turnNextPage()
        } else {
          turnPrevPage()
        }
      }
    },
    [isPaginated, turnNextPage, turnPrevPage],
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
    await processFileBytes(file)
  }

  const processFileBytes = async (file: File) => {
    if (!pluginContext) return
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
          // Keep note
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

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.epub') || file.type.includes('epub'))) {
      await processFileBytes(file)
    }
  }

  // Bookmark Management
  const isCurrentChapterBookmarked = useMemo(() => {
    return bookmarks.some((b) => b.chapterIndex === chapterIndex)
  }, [bookmarks, chapterIndex])

  const toggleBookmark = useCallback(() => {
    if (!chapter) return
    if (isCurrentChapterBookmarked) {
      const updated = bookmarks.filter((b) => b.chapterIndex !== chapterIndex)
      setBookmarks(updated)
      saveBookmarks(note, updated)
    } else {
      const snippet = chapter.text.slice(0, 100).trim()
      const newBm: EpubBookmark = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chapterIndex,
        chapterTitle: chapter.title || `Chapter ${chapterIndex + 1}`,
        href: chapter.href,
        snippet,
        createdAt: Date.now(),
      }
      const updated = [newBm, ...bookmarks]
      setBookmarks(updated)
      saveBookmarks(note, updated)
    }
  }, [bookmarks, chapter, chapterIndex, isCurrentChapterBookmarked, note])

  const deleteBookmark = useCallback(
    (id: string) => {
      const updated = bookmarks.filter((b) => b.id !== id)
      setBookmarks(updated)
      saveBookmarks(note, updated)
    },
    [bookmarks, note],
  )

  const handleSelectBookmark = useCallback(
    (bm: EpubBookmark) => {
      goTo(bm.chapterIndex, bm.href)
    },
    [goTo],
  )

  // Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Keyboard Navigation (Kindle style page flips in paginated mode)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (isPaginated) {
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey) || e.key === 'j') {
          e.preventDefault()
          turnNextPage()
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) || e.key === 'k') {
          e.preventDefault()
          turnPrevPage()
        }
      } else {
        if (e.key === 'ArrowLeft' || e.key === 'k') {
          if (chapterIndex > 0) goTo(chapterIndex - 1)
        } else if (e.key === 'ArrowRight' || e.key === 'j') {
          if (book && chapterIndex < book.chapters.length - 1) goTo(chapterIndex + 1)
        }
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setShowToc((v) => !v)
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        setShowAppearance((v) => !v)
      } else if (e.key === 's' || e.key === '/') {
        e.preventDefault()
        setShowSearch(true)
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        toggleBookmark()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        setIsControlsVisible((v) => !v)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    isPaginated,
    book,
    chapterIndex,
    goTo,
    turnNextPage,
    turnPrevPage,
    toggleBookmark,
    toggleFullscreen,
  ])

  // Overall book percentage progress
  const bookPercentage = useMemo(() => {
    if (!book || book.chapters.length === 0) return 0
    return Math.round(((chapterIndex + 1) / book.chapters.length) * 100)
  }, [book, chapterIndex])

  // Font family string
  const fontFamilyCss = useMemo(() => {
    switch (settings.fontFamily) {
      case 'sans':
        return 'Inter, system-ui, -apple-system, sans-serif'
      case 'mono':
        return 'JetBrains Mono, Menlo, monospace'
      case 'dyslexic':
        return 'OpenDyslexic, Comic Sans MS, sans-serif'
      case 'serif':
      default:
        return 'Charter, Georgia, "Times New Roman", serif'
    }
  }, [settings.fontFamily])

  // Line height CSS
  const lineHeightCss = useMemo(() => {
    switch (settings.lineHeight) {
      case 'compact':
        return '1.45'
      case 'relaxed':
        return '2.1'
      case 'balanced':
      default:
        return '1.75'
    }
  }, [settings.lineHeight])

  // Responsive layout and margin styling for continuous scroll mode
  const scrollMetrics = useMemo(() => {
    switch (margins) {
      case 'compact':
        return {
          containerPadding: 'px-2 sm:px-6 md:px-10 py-6 md:py-10',
          maxWidthClass: 'max-w-5xl',
          articleStyle: { maxWidth: '96%' },
        }
      case 'wide':
        return {
          containerPadding: 'px-6 sm:px-14 md:px-24 py-10 md:py-14',
          maxWidthClass: 'max-w-xl',
          articleStyle: { maxWidth: '80%' },
        }
      case 'normal':
      default:
        return {
          containerPadding: 'px-4 sm:px-10 md:px-16 py-8 md:py-12',
          maxWidthClass: 'max-w-3xl',
          articleStyle: { maxWidth: '88%' },
        }
    }
  }, [margins])

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex h-full min-h-0 w-full flex-col select-text transition-colors duration-200 overflow-hidden"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        className="hidden"
        onChange={onPickFile}
      />

      {/* Drag Over Active Overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md border-4 border-dashed animate-in fade-in duration-150"
          style={{
            backgroundColor: `${theme.bg}ee`,
            borderColor: theme.accent,
          }}
        >
          <Upload className="w-12 h-12 mb-3 animate-bounce" style={{ color: theme.accent }} />
          <p className="text-lg font-semibold">Drop your EPUB here to open</p>
          <p className="text-sm opacity-70 mt-1">Instant offline book rendering</p>
        </div>
      )}

      {/* Top Ambient Reader Header */}
      {isControlsVisible ? (
        <header
          className="shrink-0 flex items-center justify-between gap-3 px-3 sm:px-6 h-13 border-b backdrop-blur-md transition-colors z-20"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.headerBg,
          }}
        >
          {/* Left: Table of Contents & Book Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowToc((v) => !v)}
              disabled={!book}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border hover:opacity-80 disabled:opacity-30 transition-all text-xs font-medium shrink-0 cursor-pointer"
              style={{
                borderColor: theme.border,
                backgroundColor: `${theme.cardBg}aa`,
              }}
              title="Table of Contents (T)"
            >
              <BookOpen className="w-4 h-4" style={{ color: theme.accent }} />
              <span className="hidden sm:inline">Contents</span>
            </button>

            <div className="min-w-0 flex flex-col justify-center">
              <h2 className="truncate text-xs sm:text-sm font-semibold tracking-tight">
                {book?.title || note?.title || 'EPUB Reader'}
              </h2>
              {chapter && (
                <p className="truncate text-[11px] opacity-65 flex items-center gap-1.5 font-medium">
                  <span>Ch. {chapterIndex + 1}/{book?.chapters.length}</span>
                  <span>·</span>
                  <span className="truncate">{chapter.title}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Bookmark Button */}
            {book && (
              <button
                type="button"
                onClick={toggleBookmark}
                className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
                style={{
                  borderColor: theme.border,
                  backgroundColor: isCurrentChapterBookmarked ? `${theme.accent}20` : `${theme.cardBg}aa`,
                  color: isCurrentChapterBookmarked ? theme.accent : theme.text,
                }}
                title={isCurrentChapterBookmarked ? 'Remove Bookmark (B)' : 'Bookmark Chapter (B)'}
              >
                {isCurrentChapterBookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4 opacity-75" />
                )}
              </button>
            )}

            {/* Search Button */}
            {book && (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
                style={{
                  borderColor: theme.border,
                  backgroundColor: `${theme.cardBg}aa`,
                }}
                title="Search Book (/ or S)"
              >
                <Search className="w-4 h-4 opacity-75" />
              </button>
            )}

            {/* Typography & Appearance Button */}
            <button
              type="button"
              onClick={() => setShowAppearance((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border hover:opacity-80 transition-all text-xs font-semibold cursor-pointer"
              style={{
                borderColor: theme.border,
                backgroundColor: showAppearance ? `${theme.accent}20` : `${theme.cardBg}aa`,
                color: showAppearance ? theme.accent : theme.text,
              }}
              title="Reader Typography, Margins & Atmosphere (A)"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[11px] tracking-tight">Aa</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer hidden sm:flex"
              style={{
                borderColor: theme.border,
                backgroundColor: `${theme.cardBg}aa`,
              }}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen Focus (F)'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 opacity-75" />
              ) : (
                <Maximize2 className="w-4 h-4 opacity-75" />
              )}
            </button>

            {/* Hide Controls for Immersive Reading */}
            {book && (
              <button
                type="button"
                onClick={() => setIsControlsVisible(false)}
                className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer hidden sm:flex"
                style={{
                  borderColor: theme.border,
                  backgroundColor: `${theme.cardBg}aa`,
                }}
                title="Hide Chrome Controls for Focus (H or tap center of page)"
              >
                <EyeOff className="w-4 h-4 opacity-75" />
              </button>
            )}

            {/* File Picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
              style={{
                borderColor: theme.border,
                backgroundColor: `${theme.cardBg}aa`,
              }}
              title={book ? 'Replace EPUB File' : 'Open EPUB File'}
            >
              <Upload className="w-4 h-4 opacity-75" />
            </button>
          </div>
        </header>
      ) : (
        /* Floating Unhide Controls Button when reading in immersive mode */
        <button
          type="button"
          onClick={() => setIsControlsVisible(true)}
          className="absolute top-3 right-3 z-30 p-2 rounded-xl border backdrop-blur-md opacity-30 hover:opacity-100 transition-opacity cursor-pointer shadow-sm text-xs flex items-center gap-1.5"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
            color: theme.text,
          }}
          title="Show Navigation Controls (H or tap center)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="text-[10px] hidden sm:inline">Controls</span>
        </button>
      )}

      {/* Shared Chapter Stylesheet for Typography & Book Layout */}
      <style>{`
        .epub-chapter {
          hyphens: auto;
          text-rendering: optimizeLegibility;
          word-break: break-word;
          user-select: text;
          box-sizing: border-box;
        }
        .epub-chapter * {
          box-sizing: border-box;
        }
        /* Neutralize excessive outer container margins injected by EPUB creators */
        .epub-chapter > div,
        .epub-chapter > section,
        .epub-chapter > article {
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .epub-chapter > :first-child {
          margin-top: 0 !important;
        }
        .epub-chapter h1 {
          font-size: 1.85em;
          font-weight: 700;
          line-height: 1.25;
          margin-top: 1.6em;
          margin-bottom: 0.8em;
          letter-spacing: -0.02em;
          break-after: avoid;
          break-inside: avoid;
        }
        .epub-chapter h2 {
          font-size: 1.45em;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1.4em;
          margin-bottom: 0.6em;
          letter-spacing: -0.01em;
          break-after: avoid;
          break-inside: avoid;
        }
        .epub-chapter h3 {
          font-size: 1.2em;
          font-weight: 600;
          margin-top: 1.2em;
          margin-bottom: 0.5em;
          break-after: avoid;
          break-inside: avoid;
        }
        .epub-chapter p {
          margin-bottom: 1.15em;
          orphans: 2;
          widows: 2;
        }
        .epub-chapter blockquote {
          font-style: italic;
          border-left: 3px solid ${theme.accent};
          padding-left: 1.25rem;
          margin: 1.5rem 0;
          opacity: 0.9;
          break-inside: avoid;
        }
        .epub-chapter img {
          max-width: 100%;
          max-height: calc(100% - 2.5rem);
          height: auto;
          object-fit: contain;
          display: block;
          margin: 1.5rem auto;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          break-inside: avoid;
        }
        .epub-chapter hr {
          border: 0;
          border-top: 1px solid ${theme.border};
          margin: 2rem auto;
          width: 25%;
          opacity: 0.6;
        }
        .epub-chapter a {
          color: ${theme.accent};
          text-decoration: underline;
          text-underline-offset: 3px;
          opacity: 0.9;
          transition: opacity 0.15s ease;
        }
        .epub-chapter a:hover {
          opacity: 1;
        }
        .epub-chapter table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.9em;
          break-inside: avoid;
        }
        .epub-chapter th, .epub-chapter td {
          border: 1px solid ${theme.border};
          padding: 0.6rem 0.85rem;
          text-align: left;
        }
        .epub-chapter th {
          font-weight: 600;
          background-color: ${theme.cardBg};
        }
        .epub-chapter code, .epub-chapter pre {
          font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
          font-size: 0.88em;
          background-color: ${theme.cardBg};
          border: 1px solid ${theme.border};
          border-radius: 0.35rem;
          padding: 0.15rem 0.35rem;
          break-inside: avoid;
        }
        .epub-chapter pre {
          padding: 0.85rem 1rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }
        .epub-chapter pre code {
          border: 0;
          padding: 0;
          background-color: transparent;
        }
      `}</style>

      {/* Main Reading Flow Container */}
      {loading ? (
        <div className="flex-1 flex min-h-[300px] flex-col items-center justify-center text-center space-y-4">
          <div className="relative flex h-10 w-10">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ backgroundColor: theme.accent }}
            />
            <span
              className="relative inline-flex rounded-full h-10 w-10 items-center justify-center border"
              style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
            >
              <BookOpen className="w-5 h-5 animate-pulse" style={{ color: theme.accent }} />
            </span>
          </div>
          <p className="text-xs font-medium tracking-wide uppercase opacity-75">
            Preparing your book...
          </p>
        </div>
      ) : error ? (
        <div className="flex-1 flex min-h-[300px] flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-red-500 mb-1">Could not read EPUB</p>
          <p className="text-xs opacity-70 mb-5 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.accent }}
          >
            Choose Another EPUB
          </button>
        </div>
      ) : chapter ? (
        isPaginated ? (
          /* KINDLE PAGINATED MODE: Screen-fit pages, zero vertical scrolling, page-flip engine */
          <div
            ref={paginatedViewportRef}
            onClick={handleReadingAreaClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="flex-1 min-h-0 w-full relative flex items-center justify-center overflow-hidden cursor-default select-text"
          >
            {/* Subtle Edge Navigation Chevrons */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                turnPrevPage()
              }}
              disabled={pageIndex === 0 && chapterIndex === 0}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center border shadow-sm opacity-20 hover:opacity-90 disabled:opacity-0 transition-opacity cursor-pointer"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                color: theme.text,
              }}
              title="Previous Page (← or PageUp)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                turnNextPage()
              }}
              disabled={pageIndex >= totalPages - 1 && (!book || chapterIndex >= book.chapters.length - 1)}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center border shadow-sm opacity-20 hover:opacity-90 disabled:opacity-0 transition-opacity cursor-pointer"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                color: theme.text,
              }}
              title="Next Page (→ or Space)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Exactly Sized Screen Page Frame */}
            <div
              style={{
                width: `${pageMetrics.pageWidth}px`,
                height: `${pageMetrics.pageHeight}px`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                ref={columnFlowRef}
                onLoadCapture={updateLayout}
                className={`epub-chapter transition-transform ${
                  isTurningPage ? 'duration-200 ease-out' : 'duration-0'
                } ${settings.indentParagraphs ? '[&_p+p]:indent-6' : ''}`}
                style={{
                  height: `${pageMetrics.pageHeight}px`,
                  width: `${pageMetrics.pageWidth}px`,
                  columnWidth: `${pageMetrics.pageWidth}px`,
                  columnGap: `${pageMetrics.columnGap}px`,
                  columnFill: 'auto',
                  transform: `translateX(-${pageIndex * (pageMetrics.pageWidth + pageMetrics.columnGap)}px)`,
                  fontFamily: fontFamilyCss,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: lineHeightCss,
                  textAlign: settings.textAlign,
                }}
                onClickCapture={onChapterClick}
                dangerouslySetInnerHTML={{ __html: chapter.html }}
              />
            </div>
          </div>
        ) : (
          /* CONTINUOUS SCROLL MODE */
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${scrollMetrics.containerPadding}`}
          >
            <article
              ref={articleRef}
              className={`epub-chapter mx-auto transition-all duration-200 ${scrollMetrics.maxWidthClass} ${
                settings.indentParagraphs ? '[&_p+p]:indent-6' : ''
              }`}
              style={{
                ...scrollMetrics.articleStyle,
                fontFamily: fontFamilyCss,
                fontSize: `${settings.fontSize}px`,
                lineHeight: lineHeightCss,
                textAlign: settings.textAlign,
              }}
              onClickCapture={onChapterClick}
              dangerouslySetInnerHTML={{ __html: chapter.html }}
            />
          </div>
        )
      ) : (
        /* Empty State / Welcome Dropzone */
        <div className="flex-1 flex min-h-[460px] flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
          <div
            className="w-full rounded-3xl border-2 border-dashed p-8 md:p-12 flex flex-col items-center text-center backdrop-blur-md transition-all shadow-xl"
            style={{
              backgroundColor: `${theme.cardBg}cc`,
              borderColor: theme.border,
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg border"
              style={{
                backgroundColor: `${theme.accent}15`,
                borderColor: `${theme.accent}30`,
                color: theme.accent,
              }}
            >
              <BookOpen className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold tracking-tight mb-2">Read EPUB Books</h3>
            <p className="text-xs opacity-75 max-w-md leading-relaxed mb-6">
              Drag and drop your <code className="px-1.5 py-0.5 rounded border text-[11px] font-mono">.epub</code> file here,
              or select one from your device. Your notes, bookmarks, and reading position sync automatically.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg hover:opacity-90 transition-all cursor-pointer"
              style={{ backgroundColor: theme.accent }}
            >
              <Upload className="w-4 h-4" />
              <span>Choose EPUB File</span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 pt-6 border-t w-full" style={{ borderColor: theme.border }}>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-60">
                <Sparkles className="w-3 h-3" />
                <span>Custom Typography</span>
              </span>
              <span className="opacity-30">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-60">
                <span>Kindle Paged Layout</span>
              </span>
              <span className="opacity-30">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-60">
                <span>Full Offline Support</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Ambient Navigation & Progress Scrubber */}
      {book && isControlsVisible && (
        <footer
          className="shrink-0 border-t px-3 sm:px-6 py-2.5 backdrop-blur-md flex flex-col gap-1.5 z-20"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.headerBg,
          }}
        >
          {/* Chapter Scrubber Progress Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={chapterIndex <= 0 && (!isPaginated || pageIndex <= 0)}
              onClick={() => {
                if (isPaginated && pageIndex > 0) {
                  turnPrevPage()
                } else {
                  goTo(chapterIndex - 1, undefined, 'start')
                }
              }}
              className="p-1 rounded-lg border hover:opacity-80 disabled:opacity-30 transition-all shrink-0 cursor-pointer"
              style={{ borderColor: theme.border }}
              title={isPaginated ? 'Previous Page (←)' : 'Previous Chapter (← or K)'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrub Slider */}
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max={Math.max(0, book.chapters.length - 1)}
                value={chapterIndex}
                onChange={(e) => goTo(Number(e.target.value), undefined, 'start')}
                className="w-full accent-emerald-600 h-1.5 rounded-lg cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>

            <button
              type="button"
              disabled={
                chapterIndex >= book.chapters.length - 1 &&
                (!isPaginated || pageIndex >= totalPages - 1)
              }
              onClick={() => {
                if (isPaginated && pageIndex < totalPages - 1) {
                  turnNextPage()
                } else {
                  goTo(chapterIndex + 1, undefined, 'start')
                }
              }}
              className="p-1 rounded-lg border hover:opacity-80 disabled:opacity-30 transition-all shrink-0 cursor-pointer"
              style={{ borderColor: theme.border }}
              title={isPaginated ? 'Next Page (→)' : 'Next Chapter (→ or J)'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Reading Statistics Footer */}
          <div className="flex items-center justify-between text-[11px] font-medium opacity-70 px-1 font-mono">
            <span className="truncate">
              {isPaginated
                ? `Page ${pageIndex + 1} of ${totalPages} · Ch. ${chapterIndex + 1} of ${book.chapters.length} (${bookPercentage}%)`
                : `Chapter ${chapterIndex + 1} of ${book.chapters.length} (${bookPercentage}%)`}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 opacity-60" />
              <span>~{chapterReadingTime} min left in chapter</span>
              {!isPaginated && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{scrollProgress}% scrolled</span>
                </>
              )}
            </span>
          </div>
        </footer>
      )}

      {/* Appearance Popover Menu */}
      {showAppearance && (
        <EpubAppearanceMenu
          settings={settings}
          onChange={handleUpdateSettings}
          onClose={() => setShowAppearance(false)}
        />
      )}

      {/* Table of Contents Drawer */}
      {showToc && book && (
        <EpubTocDrawer
          book={book}
          currentChapterIndex={chapterIndex}
          theme={theme}
          bookmarks={bookmarks}
          onOpenHref={openHref}
          onSelectBookmark={handleSelectBookmark}
          onDeleteBookmark={deleteBookmark}
          onClose={() => setShowToc(false)}
        />
      )}

      {/* In-Book Search Modal */}
      {showSearch && book && (
        <EpubSearchModal
          book={book}
          theme={theme}
          onSelectResult={(cIdx, query) => {
            goTo(cIdx, undefined, 'start')
            window.setTimeout(() => {
              const root = !isPaginated ? articleRef.current : columnFlowRef.current
              if (root) {
                const walker = document.createTreeWalker(
                  root,
                  NodeFilter.SHOW_TEXT,
                )
                let node: Node | null
                const lowerQ = query.toLowerCase()
                while ((node = walker.nextNode())) {
                  if (node.textContent?.toLowerCase().includes(lowerQ)) {
                    const parent = node.parentElement as HTMLElement | null
                    if (parent) {
                      if (!isPaginated) {
                        parent.scrollIntoView({
                          block: 'center',
                          behavior: 'smooth',
                        })
                      } else {
                        const step = pageMetrics.pageWidth + pageMetrics.columnGap
                        const page = Math.floor(parent.offsetLeft / step)
                        setPageIndex(Math.max(0, Math.min(totalPages - 1, page)))
                      }
                    }
                    break
                  }
                }
              }
            }, 300)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
