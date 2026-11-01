'use client'

import { RefObject, useEffect } from 'react'
import { Editor } from '@tiptap/react'

interface CaretVisibilityOptions {
  /** Space reserved at the bottom of the visible area, e.g. the mobile toolbar. */
  bottomInset?: number
  /** Space reserved at the top of the visible area, e.g. a sticky header. */
  topInset?: number
  /** Re-runs the check whenever this value changes (used for keyboard open/close). */
  revalidateKey?: number
  enabled?: boolean
}

/** Extra breathing room so the caret never sits flush against an edge. */
const EDGE_PADDING = 24

/**
 * Resolves the band of the scroll container that the user can actually see.
 *
 * On mobile the on-screen keyboard shrinks the visual viewport without
 * shrinking the container, so the container's own rect overstates what is
 * visible. Intersecting the two gives the real target.
 */
function getVisibleBand(container: HTMLElement, topInset: number, bottomInset: number) {
  const rect = container.getBoundingClientRect()
  const viewport = typeof window !== 'undefined' ? window.visualViewport : undefined

  const viewportTop = viewport ? viewport.offsetTop : 0
  const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight

  return {
    top: Math.max(rect.top, viewportTop) + topInset + EDGE_PADDING,
    bottom: Math.min(rect.bottom, viewportBottom) - bottomInset - EDGE_PADDING,
  }
}

/**
 * Keeps the text cursor inside the visible part of the editor's scroll
 * container while typing.
 *
 * ProseMirror's built-in `scrollIntoView` measures against the scroll
 * container, which on mobile extends underneath the on-screen keyboard and the
 * bottom toolbar. The result is a caret that scrolls to a position the user
 * cannot see. This scrolls the container itself against the true visible band.
 */
export function useCaretVisibility(
  editor: Editor | null,
  containerRef: RefObject<HTMLElement | null>,
  { bottomInset = 0, topInset = 0, revalidateKey = 0, enabled = true }: CaretVisibilityOptions = {}
) {
  useEffect(() => {
    if (!editor || !enabled) return

    let frame: number | null = null

    const ensureCaretVisible = () => {
      frame = null

      const container = containerRef.current
      if (!container || editor.isDestroyed || !editor.view) return
      // Nothing to do while the editor is not the focus target.
      if (!editor.view.hasFocus()) return

      let caret: { top: number; bottom: number }
      try {
        caret = editor.view.coordsAtPos(editor.state.selection.head)
      } catch {
        return
      }

      const band = getVisibleBand(container, topInset, bottomInset)
      if (band.bottom <= band.top) return

      let delta = 0
      if (caret.bottom > band.bottom) {
        delta = caret.bottom - band.bottom
      } else if (caret.top < band.top) {
        delta = caret.top - band.top
      }

      if (Math.abs(delta) < 1) return
      container.scrollTop += delta
    }

    const schedule = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(ensureCaretVisible)
    }

    editor.on('selectionUpdate', schedule)
    editor.on('update', schedule)
    editor.on('focus', schedule)

    return () => {
      editor.off('selectionUpdate', schedule)
      editor.off('update', schedule)
      editor.off('focus', schedule)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [editor, containerRef, bottomInset, topInset, enabled])

  // The keyboard animates open over a few hundred ms; a single re-check after
  // it settles catches the caret that ended up behind it.
  useEffect(() => {
    if (!editor || !enabled) return

    const timers = [0, 150, 350].map((delay) =>
      window.setTimeout(() => {
        const container = containerRef.current
        if (!container || editor.isDestroyed || !editor.view || !editor.view.hasFocus()) return

        let caret: { top: number; bottom: number }
        try {
          caret = editor.view.coordsAtPos(editor.state.selection.head)
        } catch {
          return
        }

        const band = getVisibleBand(container, topInset, bottomInset)
        if (band.bottom <= band.top) return

        if (caret.bottom > band.bottom) {
          container.scrollTop += caret.bottom - band.bottom
        } else if (caret.top < band.top) {
          container.scrollTop += caret.top - band.top
        }
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [editor, containerRef, bottomInset, topInset, revalidateKey, enabled])
}
