'use client'

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  EditorProps,
  NoteStorageCapability,
  PluginContext,
} from '@readergo/plugin-sdk'
import {
  BookImage,
  ChevronLeft,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
  Upload,
} from 'lucide-react'
import { parseCbz, revokeCbzPages } from './parseCbz'
import { loadPdf, renderPdfPage, type PdfDocument } from './parsePdf'
import type { CbzPage, PagedFit, PagedKind, PagedLocation } from './types'
import {
  hasPdfSignature,
  hasZipSignature,
  isCbzFileName,
  isPdfFileName,
} from './types'

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
  type?: string
}

let pluginContext: PluginContext | null = null
const contextListeners = new Set<() => void>()

export function setPagedPluginContext(context: PluginContext | null) {
  pluginContext = context
  contextListeners.forEach((fn) => fn())
}

function onPagedContext(fn: () => void): () => void {
  contextListeners.add(fn)
  return () => {
    contextListeners.delete(fn)
  }
}

function kindOf(note: CurrentNote | null | undefined): PagedKind {
  return note?.type === 'cbz' ? 'cbz' : 'pdf'
}

function isNativeFile(note: CurrentNote | null | undefined): boolean {
  return note?.metadata?.source === NATIVE_FILE_SOURCE
}

function locationKey(note: CurrentNote | null | undefined): string | null {
  if (!note?.id) return null
  return `${note.spaceId || 'space'}:${note.id}`
}

async function readLocation(note: CurrentNote | null | undefined): Promise<PagedLocation> {
  const key = locationKey(note)
  if (!key || !pluginContext) return { page: 0 }
  const store = await pluginContext.getCapability<UserStateCapability>(
    USER_STATE_CAPABILITY_ID,
  )
  const saved = (await store?.get(LOCATION_NS, key)) as PagedLocation | null
  const page = saved?.page
  const fit = saved?.fit === 'page' || saved?.fit === 'width' ? saved.fit : undefined
  return { page: typeof page === 'number' && page >= 0 ? page : 0, fit }
}

async function writeLocation(
  note: CurrentNote | null | undefined,
  page: number,
  fit?: PagedFit,
): Promise<void> {
  const key = locationKey(note)
  if (!key || !pluginContext) return
  const store = await pluginContext.getCapability<UserStateCapability>(
    USER_STATE_CAPABILITY_ID,
  )
  const next: PagedLocation = { page }
  if (fit) next.fit = fit
  await store?.set(LOCATION_NS, key, next)
}

export function PagedDocumentEditor(props: EditorProps) {
  const note = props.currentNote as CurrentNote | null
  const kind = kindOf(note)
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [fit, setFit] = useState<PagedFit>('width')
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Opening')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cbzPages, setCbzPages] = useState<CbzPage[]>([])
  const pdfRef = useRef<PdfDocument | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const loadedIdRef = useRef<string | null>(null)
  const cbzPagesRef = useRef<CbzPage[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  cbzPagesRef.current = cbzPages

  const accept = kind === 'cbz' ? '.cbz' : '.pdf'
  const Icon = kind === 'cbz' ? BookImage : FileText
  const label = kind === 'cbz' ? 'comic' : 'PDF'

  const goTo = useCallback(
    (next: number) => {
      setPage((current) => {
        const clamped = Math.max(0, Math.min(next, Math.max(pageCount - 1, 0)))
        void writeLocation(note, clamped, fit)
        return clamped
      })
    },
    [fit, note, pageCount],
  )

  const goPrev = useCallback(() => goTo(page - 1), [goTo, page])
  const goNext = useCallback(() => goTo(page + 1), [goTo, page])

  const loadBytes = useCallback(
    async (bytes: ArrayBuffer, saved: PagedLocation) => {
      setError(null)
      setLoading(true)
      try {
        revokeCbzPages(cbzPagesRef.current)
        setCbzPages([])
        pdfRef.current = null
        if (kind === 'cbz') {
          if (!hasZipSignature(bytes)) {
            throw new Error('This file is not a valid CBZ archive.')
          }
          const pages = await parseCbz(bytes)
          if (pages.length === 0) {
            throw new Error('No images found in this CBZ file.')
          }
          setCbzPages(pages)
          setPageCount(pages.length)
          setPage(Math.min(saved.page, pages.length - 1))
          if (saved.fit) setFit(saved.fit)
        } else {
          if (!hasPdfSignature(bytes)) {
            throw new Error('This file is not a valid PDF.')
          }
          const pdf = await loadPdf(bytes)
          pdfRef.current = pdf
          setPageCount(pdf.numPages)
          setPage(Math.min(saved.page, Math.max(pdf.numPages - 1, 0)))
          if (saved.fit) setFit(saved.fit)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setPageCount(0)
      } finally {
        setLoading(false)
      }
    },
    [kind],
  )

  useEffect(() => {
    return () => {
      revokeCbzPages(cbzPages)
    }
  }, [cbzPages])

  const noteId = note?.id || null
  const native = isNativeFile(note)
  const loadKey = noteId ? `${noteId}:${native ? 'native' : 'empty'}` : null
  const noteRef = useRef(note)
  noteRef.current = note

  useEffect(() => {
    const id = noteId
    if (!id || !loadKey) return
    if (loadedIdRef.current === loadKey) return

    let cancelled = false
    let attempts = 0
    let contextTries = 0
    if (native) setLoading(true)

    const open = async () => {
      if (cancelled || loadedIdRef.current === loadKey) return
      if (!pluginContext) {
        contextTries += 1
        if (contextTries > 50) {
          setLoading(false)
          setError('The reader did not start. Reload this document.')
          loadedIdRef.current = loadKey
          return
        }
        window.setTimeout(() => {
          if (!cancelled) void open()
        }, 150)
        return
      }
      if (!native) {
        setLoading(false)
        loadedIdRef.current = loadKey
        return
      }
      const storage = await pluginContext.getCapability<NoteStorageCapability>(
        'document-storage',
      )
      const saved = await readLocation(noteRef.current)
      try {
        const bytes = await storage?.readBytes?.(id)
        if (cancelled) return
        if (bytes && bytes.byteLength > 0) {
          loadedIdRef.current = loadKey
          await loadBytes(bytes, saved)
          return
        }
      } catch (err) {
        attempts += 1
        if (native && attempts < 40) {
          window.setTimeout(() => {
            if (!cancelled) void open()
          }, 250)
          return
        }
        setLoading(false)
        setError(err instanceof Error ? err.message : String(err))
        loadedIdRef.current = loadKey
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
      setError(`Could not read this ${label}.`)
      loadedIdRef.current = loadKey
    }

    void open()
    const stop = onPagedContext(() => {
      if (!cancelled) void open()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [kind, label, loadBytes, loadKey, native, noteId])

  useEffect(() => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!pdf || !canvas || kind !== 'pdf' || pageCount === 0) return
    const width = stage?.clientWidth || 800
    const height = stage?.clientHeight || 600
    void renderPdfPage(pdf, page, canvas, width - 24, fit, height - 24)
  }, [fit, kind, page, pageCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === 'j') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp' || event.key === 'k') {
        event.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  const processFile = async (file: File) => {
    if (!pluginContext) return
    const type = isCbzFileName(file.name) ? 'cbz' : 'pdf'
    const folderId =
      (note as CurrentNote & { folders?: Array<{ folderId?: string }> })?.folders?.[0]
        ?.folderId || null

    const can = (await pluginContext.executeCommand('document.canImportNative', {
      type,
    })) as { supported?: boolean; reason?: string; maxBytes?: number } | null
    if (!can?.supported) {
      setError(
        can?.reason ||
          'This space cannot store this file. Switch to a folder or runtime space.',
      )
      return
    }
    if (can.maxBytes && file.size > can.maxBytes) {
      setError(`${file.name} is too large for this space.`)
      return
    }

    setError(null)
    setLoading(true)
    setLoadingLabel(`Uploading ${file.name}`)

    try {
      const created = (await pluginContext.executeCommand('document.importNative', {
        type,
        fileName: file.name,
        file,
        folderId,
        id: note?.id,
      })) as CurrentNote | null
      if (!created?.id) {
        throw new Error('This space could not save the file.')
      }
      loadedIdRef.current = `${created.id}:native`
      setLoadingLabel(`Opening ${label}`)
      const storage = await pluginContext.getCapability<NoteStorageCapability>(
        'document-storage',
      )
      const bytes = await storage?.readBytes?.(created.id)
      if (bytes) {
        await loadBytes(bytes, { page: 0, fit })
      }
      await pluginContext.executeCommand('document.open', { id: created.id })
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await processFile(file)
  }

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    if (kind === 'cbz' && isCbzFileName(file.name)) await processFile(file)
    if (kind === 'pdf' && (isPdfFileName(file.name) || file.type === 'application/pdf')) {
      await processFile(file)
    }
  }

  const toggleFullscreen = () => {
    const node = stageRef.current
    if (!node) return
    if (!document.fullscreenElement) {
      node.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const hasDocument = pageCount > 0
  const currentCbz = cbzPages[page]

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex flex-shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {note?.title || (kind === 'cbz' ? 'Comic' : 'PDF')}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => {
              setFit((value) => {
                const next = value === 'width' ? 'page' : 'width'
                void writeLocation(note, page, next)
                return next
              })
            }}
          >
            {fit === 'width' ? 'Fit width' : 'Fit page'}
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            onClick={goPrev}
            disabled={page <= 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
            {hasDocument ? `${page + 1} / ${pageCount}` : '-'}
          </span>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            onClick={goNext}
            disabled={!hasDocument || page >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
            aria-label={`Open ${label}`}
          >
            <Upload className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </header>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 overflow-auto bg-muted/30"
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
            {loadingLabel}...
          </div>
        )}
        {error && (
          <div className="p-6 text-sm text-destructive">{error}</div>
        )}
        {!loading && !hasDocument && !error && (
          <button
            type="button"
            className={`m-6 flex h-[min(28rem,70%)] w-[calc(100%-3rem)] flex-col items-center justify-center rounded-xl border-2 border-dashed ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Drop a {kind === 'cbz' ? '.cbz' : '.pdf'} file here</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {kind === 'cbz'
                ? 'CBZ is a zip of page images, the usual comic-book archive format.'
                : 'PDF opens as a paged document in this space.'}
            </p>
          </button>
        )}
        {kind === 'pdf' && hasDocument && (
          <div className="flex justify-center p-3">
            <canvas ref={canvasRef} className="max-w-full shadow-sm" />
          </div>
        )}
        {kind === 'cbz' && currentCbz && (
          <div className="flex justify-center p-3">
            <img
              src={currentCbz.url}
              alt={currentCbz.name}
              className={fit === 'page' ? 'max-h-full max-w-full object-contain' : 'h-auto w-full'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
