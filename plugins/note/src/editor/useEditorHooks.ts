import { useEffect, useCallback, useState } from 'react'
import { Editor } from '@tiptap/react'
import { showToast } from './toast'
import { handleImagePaste, handleMobileImagePaste } from './imageUtils'
import { getTablePosition } from './tableUtils'

// Hook for managing virtual keyboard offset on mobile
export const useKeyboardOffset = () => {
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as unknown as { visualViewport?: VisualViewport }).visualViewport) return

    const vv = (window as unknown as { visualViewport: VisualViewport }).visualViewport
    const update = () => {
      const offset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
      setKeyboardOffset(offset)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return keyboardOffset
}

// Hook for managing table toolbar position
export const useTableToolbar = (editor: Editor | null) => {
  const [activeTablePosition, setActiveTablePosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!editor) {
      return
    }

    const handleSelectionUpdate = () => {
      const position = getTablePosition(editor)
      setActiveTablePosition(position)
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('table') && !target.closest('.table-toolbar')) {
        setActiveTablePosition(null)
      }
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    document.addEventListener('click', handleClickOutside)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [editor])

  return { activeTablePosition, setActiveTablePosition }
}

// Hook for managing image paste functionality
export const useImagePaste = (editor: Editor | null) => {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const handlePaste = async (event: Event) => {
      await handleImagePaste(event as ClipboardEvent, editor)
    }

    const handleMobilePaste = async (event: Event) => {
      await handleMobileImagePaste(event as ClipboardEvent, editor)
    }

    let attachedDom: HTMLElement | null = null

    const attachListeners = () => {
      if (editor.isDestroyed || !editor.view) return
      try {
        attachedDom = editor.view.dom
      } catch (e) {
        return
      }
      if (!attachedDom) return
      attachedDom.addEventListener('paste', handlePaste)
      attachedDom.addEventListener('paste', handleMobilePaste)
    }

    let isDomReady = false
    try {
      isDomReady = !!(editor.view && editor.view.dom)
    } catch (e) {
      isDomReady = false
    }

    if (isDomReady) {
      attachListeners()
    } else {
      editor.on('create', attachListeners)
    }

    return () => {
      if (attachedDom) {
        attachedDom.removeEventListener('paste', handlePaste)
        attachedDom.removeEventListener('paste', handleMobilePaste)
      }
      editor.off('create', attachListeners)
    }
  }, [editor])
}

// Hook for managing mobile list indentation
export const useMobileListIndentation = (editor: Editor | null) => {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    let tapCount = 0
    let tapTimer: NodeJS.Timeout | null = null
    const TAP_DELAY = 300

    const handleTap = (event: Event) => {
      const e = event as TouchEvent
      const target = e.target as HTMLElement
      const listItem = target.closest('li')
      if (!listItem) return

      tapCount++

      if (tapTimer) {
        clearTimeout(tapTimer)
      }

      tapTimer = setTimeout(() => {
        if (tapCount === 2) {
          editor.chain().focus().sinkListItem('listItem').run()
          showToast.success('List item indented')
        } else if (tapCount === 3) {
          editor.chain().focus().liftListItem('listItem').run()
          showToast.success('List item outdented')
        }

        tapCount = 0
        tapTimer = null
      }, TAP_DELAY)
    }

    let attachedDom: HTMLElement | null = null

    const attachListeners = () => {
      if (editor.isDestroyed || !editor.view) return
      try {
        attachedDom = editor.view.dom
      } catch (e) {
        return
      }
      if (!attachedDom) return
      attachedDom.addEventListener('touchend', handleTap, { passive: true })
    }

    let isDomReady = false
    try {
      isDomReady = !!(editor.view && editor.view.dom)
    } catch (e) {
      isDomReady = false
    }

    if (isDomReady) {
      attachListeners()
    } else {
      editor.on('create', attachListeners)
    }

    return () => {
      if (attachedDom) {
        attachedDom.removeEventListener('touchend', handleTap)
      }
      editor.off('create', attachListeners)
      if (tapTimer) {
        clearTimeout(tapTimer)
      }
    }
  }, [editor])
}

// Hook for managing keyboard shortcuts
export const useKeyboardShortcuts = (editor: Editor | null, onSave?: () => void) => {
  useEffect(() => {
    if (!onSave) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        onSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSave])
}

// Hook for managing content updates
export const useContentUpdates = (
  editor: Editor | null,
  content: string,
  onChange?: (content: string) => void,
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void,
  lastSavedContent?: string
) => {
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    const currentContent = editor.getHTML()

    if (onChange) {
      onChange(currentContent)
    }

    if (onUnsavedChangesChange && lastSavedContent !== undefined) {
      const hasChanges = currentContent !== lastSavedContent
      onUnsavedChangesChange(hasChanges)
    }
  }, [onChange, onUnsavedChangesChange, lastSavedContent])

  return { handleUpdate }
}
