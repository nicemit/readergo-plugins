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
  return { page: typeof page === 'number' && page >= 0 ? page : 0 }
}

async function writeLocation(
  note: CurrentNote | null | undefined,
  page: number,
): Promise<void> {
  const key = locationKey(note)
  if (!key || !pluginContext) return
  const store = await pluginContext.getCapability<UserStateCapability>(
    USER_STATE_CAPABILITY_ID,
  )
  await store?.set(LOCATION_NS, key, { page } satisfies PagedLocation)
}

export function PagedDocumentEditor(props: EditorProps) {
  const note = props.currentNote as CurrentNote | null
  const kind = kindOf(note)
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [fit, setFit] = useState<PagedFit>('width')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cbzPages, setCbzPages] = useState<CbzPage[]>([])
  const pdfRef = useRef<PdfDocument | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const loadedIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const accept = kind === 'cbz' ? '.cbz' : '.pdf'
  const Icon = kind === 'cbz' ? BookImage : FileText
  const label = kind === 'cbz' ? 'comic' : 'PDF'

  const goTo = useCallback(
    (next: number) => {
      setPage((current) => {
        const clamped = Math.max(0, Math.min(next, Math.max(pageCount - 1, 0)))
        void writeLocation(note, clamped)
        return clamped
      })
    },
    [note, pageCount],
  )

  const goPrev = useCallback(() => goTo(page - 1), [goTo, page])
  const goNext = useCallback(() => goTo(page + 1), [goTo, page])

  const loadBytes = useCallback(
    async (bytes: ArrayBuffer, saved: PagedLocation) => {
      setError(null)
      setLoading(true)
      try {
        revokeCbzPages(cbzPages)
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
        } else {
          if (!hasPdfSignature(bytes)) {
            throw new Error('This file is not a valid PDF.')
          }
          const pdf = await loadPdf(bytes)
          pdfRef.current = pdf
          setPageCount(pdf.numPages)
          setPage(Math.min(saved.page, Math.max(pdf.numPages - 1, 0)))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setPageCount(0)
      } finally {
        setLoading(false)
      }
    },
    [cbzPages, kind],
  )

  useEffect(() => {
    return () => {
      revokeCbzPages(cbzPages)
    }
  }, [cbzPages])

  useEffect(() => {
    const id = note?.id
    if (!id) return
    if (loadedIdRef.current === id) return

    let cancelled = false
    let attempts = 0
    const native = isNativeFile(note)
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
          loadedIdRef.current = id
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
    return () => {
      cancelled = true
    }
  }, [loadBytes, note])

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
    const bytes = await file.arrayBuffer()
    const storage = await pluginContext.getCapability<NoteStorageCapability>(
      'document-storage',
    )
    const folderId =
      (note as CurrentNote & { folders?: Array<{ folderId?: string }> })?.folders?.[0]
        ?.folderId || null
    const type = isCbzFileName(file.name) ? 'cbz' : 'pdf'

    if (isNativeFile(note) && note?.id && storage?.writeBytes && type === kind) {
      await storage.writeBytes(note.id, bytes)
      loadedIdRef.current = note.id
      await loadBytes(bytes, await readLocation(note))
      return
    }

    if (storage?.createNativeFile) {
      const created = await storage.createNativeFile({
        type,
        fileName: file.name,
        bytes,
        folderId,
      })
      if (note?.id && created.id !== note.id) {
        try {
          await storage.delete(note.id)
        } catch {
          // keep stub
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
    await loadBytes(bytes, { page: 0 })
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
            onClick={() => setFit((value) => (value === 'width' ? 'page' : 'width'))}
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
            Opening {label}...
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
