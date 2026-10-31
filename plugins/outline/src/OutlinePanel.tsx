import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, ListTree } from 'lucide-react'
import { useHeadingCollapse } from '@/contexts/HeadingCollapseContext'

interface HeadingItem {
  id: string
  text: string
  level: number
  element: HTMLElement
}

interface ParagraphItem {
  id: string
  text: string
  element: HTMLElement
}

interface OutlinePanelProps {
  noteId: string | null
}

function throttle(func: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let previous = 0

  return () => {
    const now = Date.now()
    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func()
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func()
      }, remaining)
    }
  }
}

function readLocFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('loc')
}

function findEditor(): HTMLElement | null {
  return document.querySelector('.tiptap') as HTMLElement | null
}

function collectOutline(editor: HTMLElement): {
  headings: HeadingItem[]
  paragraphs: ParagraphItem[]
} {
  const headingElements = editor.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const paragraphElements = editor.querySelectorAll('p')

  const headings = Array.from(headingElements).map((element, index) => ({
    id: element.getAttribute('data-heading-id') || `heading-${index}`,
    text: element.textContent || '',
    level: parseInt(element.tagName.charAt(1), 10),
    element: element as HTMLElement,
  }))

  const paragraphs = Array.from(paragraphElements).map((element, index) => ({
    id: `paragraph-${index}`,
    text: element.textContent || '',
    element: element as HTMLElement,
  }))

  return { headings, paragraphs }
}

/** Type scale mirroring the document so the outline reads as a miniature of it. */
const LEVEL_TYPOGRAPHY: Record<number, string> = {
  1: 'text-[0.9375rem] font-semibold',
  2: 'text-sm font-semibold',
  3: 'text-sm font-medium',
  4: 'text-[0.8125rem] font-medium',
  5: 'text-xs font-medium',
  6: 'text-xs',
}

export function OutlinePanel({ noteId }: OutlinePanelProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [paragraphs, setParagraphs] = useState<ParagraphItem[]>([])
  const [activeHeading, setActiveHeading] = useState<string | null>(null)
  const [showParagraphs, setShowParagraphs] = useState(false)
  const [loc, setLoc] = useState<string | null>(readLocFromUrl)
  const [hasScrolledToLocation, setHasScrolledToLocation] = useState(false)
  const scrollspyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLElement | null>(null)
  const { collapsedHeadings, toggleHeading, collapseAll, expandAll } = useHeadingCollapse()

  const refreshOutline = useCallback(() => {
    const editor = findEditor()
    editorRef.current = editor
    if (!editor) {
      setHeadings([])
      setParagraphs([])
      return
    }
    const next = collectOutline(editor)
    setHeadings(next.headings)
    setParagraphs(next.paragraphs)
  }, [])

  useEffect(() => {
    setHasScrolledToLocation(false)
    setLoc(readLocFromUrl())
  }, [noteId])

  useEffect(() => {
    const onPopState = () => setLoc(readLocFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!noteId) {
      setHeadings([])
      setParagraphs([])
      return
    }

    let editorObserver: MutationObserver | null = null
    let bodyObserver: MutationObserver | null = null
    const scan = throttle(refreshOutline, 80)

    const attach = (editor: HTMLElement) => {
      editorRef.current = editor
      refreshOutline()
      editorObserver = new MutationObserver(scan)
      editorObserver.observe(editor, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    const existing = findEditor()
    if (existing) {
      attach(existing)
    } else {
      bodyObserver = new MutationObserver(() => {
        const editor = findEditor()
        if (!editor) return
        bodyObserver?.disconnect()
        bodyObserver = null
        attach(editor)
      })
      bodyObserver.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      editorObserver?.disconnect()
      bodyObserver?.disconnect()
    }
  }, [noteId, refreshOutline])

  const updateUrlWithLoc = useCallback(
    (headingId: string) => {
      if (!noteId) return
      window.history.pushState({}, '', `/notes?noteId=${noteId}&loc=${headingId}`)
      setLoc(headingId)
    },
    [noteId],
  )

  const scrollToHeading = useCallback(
    (headingId: string) => {
      const heading = headings.find((item) => item.id === headingId)
      if (!heading || !document.body.contains(heading.element)) {
        refreshOutline()
        return
      }
      heading.element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      updateUrlWithLoc(headingId)
    },
    [headings, refreshOutline, updateUrlWithLoc],
  )

  const scrollToParagraph = useCallback(
    (paragraphId: string) => {
      const paragraph = paragraphs.find((item) => item.id === paragraphId)
      if (!paragraph || !document.body.contains(paragraph.element)) {
        refreshOutline()
        return
      }
      paragraph.element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      updateUrlWithLoc(paragraphId)
    },
    [paragraphs, refreshOutline, updateUrlWithLoc],
  )

  useEffect(() => {
    if (!loc || headings.length === 0 || hasScrolledToLocation) return

    if (headings.some((heading) => heading.id === loc)) {
      const timer = setTimeout(() => {
        scrollToHeading(loc)
        setHasScrolledToLocation(true)
      }, 100)
      return () => clearTimeout(timer)
    }

    if (paragraphs.some((paragraph) => paragraph.id === loc)) {
      const timer = setTimeout(() => {
        scrollToParagraph(loc)
        setHasScrolledToLocation(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loc, headings, paragraphs, hasScrolledToLocation, scrollToHeading, scrollToParagraph])

  useEffect(() => {
    if (headings.length === 0) return

    const updateActiveHeading = () => {
      const editor = editorRef.current || findEditor()
      const scrollContainer =
        (editor?.closest('.overflow-y-auto') as HTMLElement | null) || editor
      if (!scrollContainer) return

      let currentActive = headings[0]?.id || null
      const containerRect = scrollContainer.getBoundingClientRect()

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i]
        if (!document.body.contains(heading.element)) continue
        const rect = heading.element.getBoundingClientRect()
        if (rect.top - containerRect.top <= 150) {
          currentActive = heading.id
          break
        }
      }

      setActiveHeading(currentActive)
    }

    const throttledScrollHandler = throttle(updateActiveHeading, 100)
    const editor = editorRef.current || findEditor()
    const scrollContainer =
      (editor?.closest('.overflow-y-auto') as HTMLElement | null) || editor

    if (!scrollContainer) return

    scrollContainer.addEventListener('scroll', throttledScrollHandler, { passive: true })
    const timer = setTimeout(updateActiveHeading, 100)

    return () => {
      scrollContainer.removeEventListener('scroll', throttledScrollHandler)
      clearTimeout(timer)
    }
  }, [headings])

  const outline = useMemo(() => {
    const withDepth: Array<HeadingItem & { depth: number; hasChildren: boolean }> = []
    const stack: number[] = []

    headings.forEach((heading, index) => {
      while (stack.length > 0 && stack[stack.length - 1] >= heading.level) {
        stack.pop()
      }
      stack.push(heading.level)

      const next = headings[index + 1]
      withDepth.push({
        ...heading,
        depth: stack.length - 1,
        hasChildren: !!next && next.level > heading.level,
      })
    })

    const visible: typeof withDepth = []
    let hiddenBelowLevel: number | null = null

    withDepth.forEach((heading) => {
      if (hiddenBelowLevel !== null) {
        if (heading.level > hiddenBelowLevel) return
        hiddenBelowLevel = null
      }

      visible.push(heading)

      if (heading.hasChildren && collapsedHeadings.has(heading.id)) {
        hiddenBelowLevel = heading.level
      }
    })

    return { all: withDepth, visible }
  }, [headings, collapsedHeadings])

  const collapsibleIds = useMemo(
    () => outline.all.filter((heading) => heading.hasChildren).map((heading) => heading.id),
    [outline.all],
  )

  const allCollapsed =
    collapsibleIds.length > 0 && collapsibleIds.every((id) => collapsedHeadings.has(id))

  const truncatedParagraphs = useMemo(
    () =>
      paragraphs.map((paragraph) => ({
        ...paragraph,
        displayText:
          paragraph.text.length > 100 ? `${paragraph.text.slice(0, 100)}...` : paragraph.text,
      })),
    [paragraphs],
  )

  if (!noteId) return null

  if (headings.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        <ListTree className="w-5 h-5 mx-auto mb-2 opacity-60" />
        <p className="text-sm">No headings yet</p>
        <p className="text-xs mt-1">Use # ## ### to create headings</p>
      </div>
    )
  }

  return (
    <div className="space-y-3" ref={scrollspyRef}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Document Structure
        </h3>
        {collapsibleIds.length > 0 && (
          <button
            type="button"
            onClick={() => (allCollapsed ? expandAll() : collapseAll(collapsibleIds))}
            className="px-2 py-1 text-xs rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        )}
      </div>

      <div className="space-y-0.5">
        {outline.visible.map((heading) => {
          const isActive = activeHeading === heading.id
          const isCollapsed = heading.hasChildren && collapsedHeadings.has(heading.id)

          return (
            <div
              key={heading.id}
              className={`group flex items-start gap-1 rounded-md pr-1 transition-colors ${
                isActive ? 'bg-primary/10' : 'hover:bg-foreground/5'
              }`}
              style={{ marginLeft: `${heading.depth * 12}px` }}
            >
              {heading.hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleHeading(heading.id)}
                  aria-expanded={!isCollapsed}
                  aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${heading.text}`}
                  className="mt-1 flex-shrink-0 p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      isCollapsed ? '' : 'rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <span className="w-[1.125rem] flex-shrink-0" aria-hidden="true" />
              )}

              <button
                type="button"
                onClick={() => scrollToHeading(heading.id)}
                title={heading.text}
                className={`flex-1 min-w-0 flex items-baseline gap-2 py-1 text-left ${
                  LEVEL_TYPOGRAPHY[heading.level] ?? LEVEL_TYPOGRAPHY[6]
                } ${isActive ? '' : 'heading-tone-' + heading.level}`}
                style={isActive ? { color: 'hsl(var(--primary))' } : undefined}
              >
                <span className="text-[0.625rem] font-semibold uppercase opacity-60 flex-shrink-0">
                  H{heading.level}
                </span>
                <span className="truncate">{heading.text || 'Untitled heading'}</span>
                {isCollapsed && (
                  <span className="flex-shrink-0 text-[0.625rem] px-1.5 rounded-full bg-primary/15 text-primary">
                    …
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowParagraphs(!showParagraphs)}
          className={`w-full px-2 py-1 text-xs rounded-md transition-colors ${
            showParagraphs
              ? 'bg-primary/12 text-primary'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
          }`}
        >
          {showParagraphs ? 'Hide' : 'Show'} paragraphs
        </button>

        {showParagraphs && truncatedParagraphs.length > 0 && (
          <div className="space-y-0.5 mt-2">
            {truncatedParagraphs.map((paragraph) => (
              <button
                type="button"
                key={paragraph.id}
                className="w-full text-left rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors truncate"
                onClick={() => scrollToParagraph(paragraph.id)}
                title={paragraph.text}
              >
                {paragraph.displayText}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
