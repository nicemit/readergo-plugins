'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import { AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { showToast } from './toast'

// Import refactored components
import { Toolbar } from './Toolbar'
import { MobileToolbar } from './MobileToolbar'
import { TableToolbar } from './TableToolbar'
import { LinkDialog } from './LinkDialog'
import { MobileImageUpload } from './MobileImageUpload'
import { ConfirmDialog } from './ConfirmDialog'
import { getTipTapExtensions } from './tiptap/TipTapExtensions'

// Import utilities
import {
  insertTable, addColumnBefore, addColumnAfter, deleteColumn,
  addRowBefore, addRowAfter, deleteRow, deleteTable,
  copyTable, copyTableAsMarkdown, copyRow, copyCell
} from './tableUtils'
import { createImageFileInput } from './imageUtils'
import { markdownToHtml, htmlToMarkdown, insertMarkdownContent, insertDateTime } from './markdownUtils'
import { ImportArticleDialog } from './ImportArticleDialog'

// Import hooks
import {
  useTableToolbar,
  useImagePaste,
  useMobileListIndentation
} from './useEditorHooks'
import { useCaretVisibility } from './useCaretVisibility'
import { applyCollapsedHeadings, HEADING_TOGGLE_EVENT } from './extensions/CollapsibleHeadings'
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions'
import {
  CHAT_SOURCE_COMMAND_SET_SELECTION,
  CHAT_SOURCE_COMMAND_CLEAR_SELECTION,
} from '@readergo/plugin-sdk'
// audit-ignore: sdk-boundary
import { useDisplayName } from '@/components/providers/I18nProvider'
import { useAutoHideScrollbar } from '@/hooks/useAutoHideScrollbar'
import { useMargin } from '@/contexts/MarginContext'
import { useHeadingCollapse } from '@/contexts/HeadingCollapseContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard'
import { usePluginCapabilities } from '@/hooks/usePluginCapabilities'
import { usePlaceContributions } from '@/hooks/usePlaceContributions'
// audit-ignore: sdk-boundary
import { usePluginSystemInitialized, usePluginManager } from '@/app/providers/PluginProvider'
import { EditorExtension, WellKnownPlaces, type TextFormattingCapability } from '@readergo/plugin-sdk'
// audit-ignore: sdk-boundary
import { SelectionMenuHost } from '@/components/editor/SelectionMenuHost'

/** Keep in sync with the fixed toolbar height in `MobileToolbar`. */
const MOBILE_TOOLBAR_HEIGHT = 52

interface TipTapEditorProps {
  instanceId?: string
  content?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
  showRawMarkdown?: boolean
  placeholder?: string
  className?: string
  currentNote?: { id: string; title: string } | null
  onDeleteNote?: (noteId: string, noteTitle: string) => void
  onTitleChange?: (title: string) => void
  onTitleSave?: () => void
  onNavigateToNote?: (noteId: string) => void
  handleCreateNote?: (title: string) => void
  notes?: Array<{ id: string; title: string }>
  isLoading?: boolean
  hideToolbars?: boolean
}

function safeGetHTML(ed: Editor | null | undefined): string {
  if (!ed || ed.isDestroyed || !ed.schema) return "";
  try {
    return ed.getHTML();
  } catch {
    return "";
  }
}

function TipTapEditorContent({
  instanceId,
  content = '',
  onChange,
  onSave,
  onUnsavedChangesChange,
  showRawMarkdown = false,
  placeholder,
  className = '',
  currentNote,
  onDeleteNote,
  onTitleChange,
  onTitleSave,
  onNavigateToNote,
  handleCreateNote,
  notes = [],
  isLoading = false,
  hideToolbars = false
}: TipTapEditorProps) {
  const manager = usePluginManager()
  const effectiveInstanceId = instanceId || (currentNote?.id ? `note-${currentNote.id}` : 'note-default')

  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedContent, setLastSavedContent] = useState(content)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [selectionMenu, setSelectionMenu] = useState<{
    text: string
    top: number
    left: number
  } | null>(null)
  const currentNoteIdRef = useRef(currentNote?.id)
  useEffect(() => {
    currentNoteIdRef.current = currentNote?.id
  }, [currentNote?.id])

  const [showImportArticleDialog, setShowImportArticleDialog] = useState(false)
  const [showClearContentConfirm, setShowClearContentConfirm] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)
  const isUserTypingRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Custom hooks
  const { offset: keyboardOffset, isOpen: isKeyboardOpen } = useVirtualKeyboard()
  const getDisplayName = useDisplayName()
  const { attachScrollListener, detachScrollListener } = useAutoHideScrollbar()
  const { margin } = useMargin()
  const isMobile = useIsMobile()
  const { collapsedHeadings, toggleHeading } = useHeadingCollapse()

  // Height of the fixed mobile toolbar that floats above the keyboard.
  const mobileToolbarHeight = isMobile && !hideToolbars ? MOBILE_TOOLBAR_HEIGHT : 0
  // Room the editor must leave at the bottom so the caret can never end up
  // behind the keyboard or the toolbar.
  const bottomInset = isMobile ? keyboardOffset + mobileToolbarHeight : 0
  // Collect extensions from plugins - REACTIVE
  const editorExtensionProviders = usePluginCapabilities<EditorExtension>('editor-extension')

  const selectionContributions = usePlaceContributions({
    place: WellKnownPlaces.EDITOR_SELECTION_MENU,
    surface: {
      editorType: 'note',
      capabilities: ['text-range', 'rich-text'],
    },
    context: {
      hasSelection: !!selectionMenu && selectionMenu.text.length > 0,
      selectionLength: selectionMenu?.text.length ?? 0,
      readOnly: false,
    },
  })

  // Collect all extensions from plugin providers.
  // On first render, editorExtensionProviders might be empty if no external plugins
  // provide additional extensions. We get the base extensions from TipTapExtensions.ts.

  const pluginExtensions = useMemo(() => {
    const allExtensions: AnyExtension[] = getTipTapExtensions()

    for (const extProvider of editorExtensionProviders) {
      const extensions = extProvider.getExtensions()
      if (Array.isArray(extensions)) {
        allExtensions.push(...extensions)
      } else {
        allExtensions.push(extensions)
      }
    }

    return allExtensions
  }, [editorExtensionProviders])

  // Attach auto-hide scrollbar functionality
  useEffect(() => {
    if (editorContainerRef.current) {
      attachScrollListener(editorContainerRef.current)
    }
    if (titleRef.current) {
      const el = titleRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }

    return () => {
      detachScrollListener()
    }
  }, [attachScrollListener, detachScrollListener, currentNote?.title])

  // Handle editor updates
  const handleUpdate = useCallback(({ editor: e }: { editor: Editor }) => {
    const currentContent = safeGetHTML(e)

    // Move updates to a microtask/timeout to prevent React flushSync errors
    setTimeout(() => {
      if (onChange) {
        onChange(currentContent)
      }

      if (onUnsavedChangesChange && lastSavedContent !== undefined) {
        const hasChanges = currentContent !== lastSavedContent
        onUnsavedChangesChange(hasChanges)
      }
    }, 0)
  }, [onChange, onUnsavedChangesChange, lastSavedContent])

  const editor = useEditor({
    extensions: pluginExtensions,
    content,
    immediatelyRender: false,
    onUpdate: handleUpdate,
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to, empty } = ed.state.selection
      if (empty || from === to) {
        setSelectionMenu(null)
        void executeCommand(CHAT_SOURCE_COMMAND_CLEAR_SELECTION)
        return
      }
      const text = ed.state.doc.textBetween(from, to, ' ')
      if (!text.trim()) {
        setSelectionMenu(null)
        void executeCommand(CHAT_SOURCE_COMMAND_CLEAR_SELECTION)
        return
      }
      void executeCommand(CHAT_SOURCE_COMMAND_SET_SELECTION, {
        text,
        start: from,
        end: to,
        documentId: currentNoteIdRef.current,
      })
      try {
        const start = ed.view.coordsAtPos(from)
        const end = ed.view.coordsAtPos(to)
        setSelectionMenu({
          text,
          top: Math.min(start.top, end.top),
          left: (start.left + end.left) / 2,
        })
      } catch {
        setSelectionMenu(null)
      }
    },
    onFocus: () => {
      manager.setActiveEditor(effectiveInstanceId)
    },
    onBlur: () => {
      // Delay so menu button clicks can run before hide
      window.setTimeout(() => setSelectionMenu(null), 150)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none focus:outline-none leading-relaxed whitespace-normal break-words',
      },
      transformPastedHTML(html) {
        return html
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain')
        if (text && text.includes('[[') && text.includes(']]')) {
          // Normal paste rules will handle wiki-link syntax
        }
        return false
      },
    },
  }, [pluginExtensions, effectiveInstanceId, manager])

  // Multi-instance Editor Capability registration
  const formattingCapability = useMemo<TextFormattingCapability>(() => {
    if (!editor || editor.isDestroyed) {
      return {}
    }
    return {
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      canUndo: () => editor.can().undo(),
      canRedo: () => editor.can().redo(),
      toggleBold: () => editor.chain().focus().toggleBold().run(),
      toggleItalic: () => editor.chain().focus().toggleItalic().run(),
      toggleUnderline: () => editor.chain().focus().toggleUnderline().run(),
      toggleStrike: () => editor.chain().focus().toggleStrike().run(),
      toggleCode: () => editor.chain().focus().toggleCode().run(),
      toggleHeading: (level) => editor.chain().focus().toggleHeading({ level: level as any }).run(),
      toggleParagraph: () => editor.chain().focus().setParagraph().run(),
      toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
      toggleTaskList: () => editor.chain().focus().toggleTaskList().run(),
      toggleBlockquote: () => editor.chain().focus().toggleBlockquote().run(),
      toggleCodeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
      indent: () => editor.chain().focus().sinkListItem('listItem').run(),
      outdent: () => editor.chain().focus().liftListItem('listItem').run(),
      insertHorizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
      setTextAlign: (alignment) => editor.chain().focus().setTextAlign(alignment).run(),
      isActive: (name, attrs) => editor.isActive(name, attrs),
    }
  }, [editor])

  useEffect(() => {
    if (!formattingCapability || !effectiveInstanceId) return
    const cleanup = manager.registerEditorCapability(effectiveInstanceId, formattingCapability)
    manager.setActiveEditor(effectiveInstanceId)
    return () => {
      cleanup()
    }
  }, [manager, effectiveInstanceId, formattingCapability])

  // Expose editor for debugging
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      (window as any).editor = editor
    }
  }, [editor])

  const handleOpenShare = useCallback(() => {
    if (!currentNote) return;
    void executeCommand('readergo.share.open', {
      note: {
        id: currentNote.id,
        title: currentNote.title,
        content: safeGetHTML(editor) || content,
        createdAt: (currentNote as any).createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }, [currentNote, editor, content]);

  const handleSave = useCallback(
    async () => {
      if (onSave && editor && !editor.isDestroyed && editor.view) {
        setIsSaving(true)
        try {
          const htmlContent = safeGetHTML(editor)
          await onSave(htmlContent)
          setLastSavedContent(htmlContent)
          onUnsavedChangesChange?.(false)
        } catch (error) {
          console.error('Error in editor save:', error)
        } finally {
          setIsSaving(false)
        }
      }
    },
    [editor, onSave, onUnsavedChangesChange, currentNote?.id]
  )

  // Update hooks with editor instance
  const { activeTablePosition } = useTableToolbar(editor)
  useImagePaste(editor)
  useMobileListIndentation(editor)
  useCaretVisibility(editor, editorContainerRef, {
    bottomInset,
    revalidateKey: keyboardOffset,
  })
  // Note: Keyboard shortcuts are now handled globally in the main page

  // Mirror the shared collapse state into the editor's decorations.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view) return
    applyCollapsedHeadings(editor.view, collapsedHeadings)
  }, [editor, collapsedHeadings])

  // Heading toggles are plain DOM inside ProseMirror, so they report clicks by
  // bubbling an event up to the editor element.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view) return

    const dom = editor.view.dom
    const handleToggle = (event: Event) => {
      const headingId = (event as CustomEvent<{ headingId?: string }>).detail?.headingId
      if (headingId) toggleHeading(headingId)
    }

    dom.addEventListener(HEADING_TOGGLE_EVENT, handleToggle)
    return () => dom.removeEventListener(HEADING_TOGGLE_EVENT, handleToggle)
  }, [editor, toggleHeading])

  // Track when user is typing to prevent cursor jumps
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      isUserTypingRef.current = true

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set flag to false after 1 second of no typing
      typingTimeoutRef.current = setTimeout(() => {
        isUserTypingRef.current = false
      }, 1000)
    }

    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [editor])

  // Update content when prop changes and keep title height in sync
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.schema && content !== safeGetHTML(editor)) {
      // Don't update content if user is actively typing
      if (isUserTypingRef.current) {
        return
      }

      // Save current cursor position
      const { from, to } = editor.state.selection

      // Update content without emitting update event
      // Wrap in setTimeout to avoid "flushSync was called from inside a lifecycle method" error
      setTimeout(() => {
        if (!editor || editor.isDestroyed) return

        editor.commands.setContent(content, { emitUpdate: false })

        // Restore cursor position if it's still valid
        try {
          const docSize = editor.state.doc.content.size
          if (from <= docSize && to <= docSize) {
            editor.commands.setTextSelection({ from, to })
          }
        } catch (e) {
          // If position is invalid, just focus at the end
        }
      }, 0)
    }
    if (titleRef.current) {
      const el = titleRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [content, editor, currentNote?.title])

  // Link dialog handlers
  const openLinkDialog = () => {
    if (editor) {
      setShowLinkDialog(true)
    }
  }

  const closeLinkDialog = () => {
    setShowLinkDialog(false)
  }

  const insertLink = (text: string, url: string) => {
    if (editor) {
      editor.chain().focus().setLink({ href: url }).insertContent(text).run()
    }
  }

  const removeLink = () => {
    if (editor) {
      editor.chain().focus().unsetLink().run()
    }
  }

  // Table handlers
  // Table handlers - Memoized
  const handleInsertTable = useCallback(() => insertTable(editor!), [editor])
  const handleAddColumnBefore = useCallback(() => addColumnBefore(editor!), [editor])
  const handleAddColumnAfter = useCallback(() => addColumnAfter(editor!), [editor])
  const handleDeleteColumn = useCallback(() => deleteColumn(editor!), [editor])
  const handleAddRowBefore = useCallback(() => addRowBefore(editor!), [editor])
  const handleAddRowAfter = useCallback(() => addRowAfter(editor!), [editor])
  const handleDeleteRow = useCallback(() => deleteRow(editor!), [editor])
  const handleDeleteTable = useCallback(() => deleteTable(editor!), [editor])
  const handleCopyTable = useCallback(() => copyTable(editor!), [editor])
  const handleCopyTableAsMarkdown = useCallback(() => copyTableAsMarkdown(editor!, htmlToMarkdown), [editor])
  const handleCopyRow = useCallback(() => copyRow(editor!), [editor])
  const handleCopyCell = useCallback(() => copyCell(editor!), [editor])

  // Other handlers
  // Other handlers - Memoized
  const handleInsertImage = useCallback(() => {
    if (editor) {
      createImageFileInput(editor)
    }
  }, [editor])

  const handleInsertMarkdown = useCallback((markdown: string) => {
    if (editor) {
      insertMarkdownContent(editor, markdown)
    }
  }, [editor])

  const handleClearContent = useCallback(() => {
    if (editor) {
      setShowClearContentConfirm(true)
    }
  }, [editor])

  const confirmClearContent = useCallback(() => {
    if (editor) {
      editor.chain().focus().clearContent().run()
      showToast.success(getDisplayName('contentClearedSuccessfully', 'ui') || 'Content cleared successfully')
    }
    setShowClearContentConfirm(false)
  }, [editor, getDisplayName])

  const handleInsertDateTime = useCallback(() => {
    if (editor) {
      insertDateTime(editor)
    }
  }, [editor])

  const handleDeleteNote = useCallback(() => {
    if (currentNote && onDeleteNote) {
      onDeleteNote(currentNote.id, currentNote.title)
    }
  }, [currentNote, onDeleteNote])

  // We explicitly check if the current editor instance has 'taskList' to guarantee
  // TipTap has finished re-instantiating with the full plugin extensions.
  const isEditorFullyLoaded = editor && editor.extensionManager.extensions.some(ext => ext.name === 'taskList')

  if (!isEditorFullyLoaded) {
    return (
      <div className={`border border-gray-200/50 dark:border-white/10 rounded-lg p-4 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading editor...</p>
        </div>
      </div>
    )
  }

  // Show loading state when content is being loaded
  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Desktop Toolbar */}
        {!hideToolbars && (
          <div className="hidden lg:block">
            <Toolbar
              editor={editor}
              instanceId={effectiveInstanceId}
              documentId={currentNote?.id}
              editorType="note"
              surfaceCapabilities={['text-range', 'rich-text']}
              onSave={handleSave}
              isSaving={isSaving}
              onDeleteNote={handleDeleteNote}
              onInsertLink={openLinkDialog}
              onInsertTable={handleInsertTable}
              onInsertImage={handleInsertImage}
              onInsertDateTime={handleInsertDateTime}
              onRemoveLink={removeLink}
              onInsertMarkdown={handleInsertMarkdown}
              onClearContent={handleClearContent}
              onShare={handleOpenShare}
              onImportArticle={() => setShowImportArticleDialog(true)}
            />
          </div>
        )}

        {/* Loading Content */}
        <div className="flex-1 p-6 sm:p-8 pb-8 overflow-y-auto bg-transparent mobile-full-width auto-hide-scrollbar">
          <div className="w-full transition-all duration-300 ease-in-out">
            {/* Title Loading Skeleton */}
            {onTitleChange && (
              <div className="mb-6">
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-6"></div>
                <div className="border-t border-gray-300 dark:border-gray-600 my-6"></div>
              </div>
            )}

            {/* Content Loading Skeleton */}
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
            </div>

            {/* Loading Indicator */}
            {/* Loading Indicator */}
            <div className="flex items-center justify-center mt-8">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Image Upload */}
        <MobileImageUpload editor={editor} />
      </div>
    )
  }



  return (
    <div className={`flex flex-col h-full min-h-0 relative ${className}`}>
      {/* Desktop Toolbar - Hidden on mobile */}
      {!hideToolbars && (
        <div className="hidden lg:block">
          <Toolbar
            editor={editor}
            instanceId={effectiveInstanceId}
            documentId={currentNote?.id}
            editorType="note"
            surfaceCapabilities={['text-range', 'rich-text']}
            onSave={handleSave}
            isSaving={isSaving}
            onDeleteNote={handleDeleteNote}
            onInsertLink={openLinkDialog}
            onInsertTable={handleInsertTable}
            onInsertImage={handleInsertImage}
            onInsertDateTime={handleInsertDateTime}
            onRemoveLink={removeLink}
            onInsertMarkdown={handleInsertMarkdown}
            onShare={handleOpenShare}
            onClearContent={handleClearContent}
            onImportArticle={() => setShowImportArticleDialog(true)}
          />
        </div>
      )}

      {/* Editor Content with Integrated Title */}
      <div
        ref={editorContainerRef}
        className="flex-1 min-h-0 p-4 sm:p-6 md:p-8 pb-8 overflow-y-auto mobile-pane-scroll bg-transparent mobile-full-width auto-hide-scrollbar"
      >
        <div
          className="w-full transition-all duration-300 ease-in-out whitespace-normal break-words"
          style={isMobile ? {
            marginLeft: '0.5rem',
            marginRight: '0.5rem',
            maxWidth: 'calc(100% - 1rem)'
          } : {
            marginLeft: `${margin * 100}%`,
            marginRight: `${margin * 100}%`,
            maxWidth: `${(1 - margin * 2) * 100}%`
          }}
        >
          {/* Title Input */}
          {onTitleChange && (
            <div className="mb-6">
              <textarea
                ref={titleRef}
                rows={1}
                value={currentNote?.title || ''}
                onChange={(e) => {
                  onTitleChange(e.target.value)
                  // grow with content
                  if (titleRef.current) {
                    titleRef.current.style.height = 'auto'
                    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
                  }
                }}
                onBlur={onTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                  }
                }}
                className="w-full text-3xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none focus:outline-none transition-all duration-200 max-w-none leading-relaxed whitespace-pre-wrap break-words resize-none px-4 sm:px-6 py-3 sm:py-4 -mx-4 sm:-mx-6 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800"
                placeholder={getDisplayName('untitledNote', 'ui')}
                style={{
                  fontFamily: 'inherit',
                  lineHeight: 'inherit',
                  letterSpacing: 'inherit',
                  overflow: 'hidden'
                }}
              />
              <div className="border-t border-gray-300 dark:border-gray-600 my-6"></div>
            </div>
          )}

          {showRawMarkdown ? (
            <div className="min-h-full">
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Raw Markdown View:</strong> This shows the markdown source. Changes here will be lost when switching back to rendered view.
                </p>
              </div>
              <textarea
                value={htmlToMarkdown(editor?.getHTML() || '')}
                onChange={(e) => {
                  const html = markdownToHtml(e.target.value)
                  editor?.commands.setContent(html)
                }}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={getDisplayName('rawMarkdownPlaceholder', 'ui')}
              />
            </div>
          ) : (
            <>
              <EditorContent
                editor={editor}
                className="min-h-full focus:outline-none"
              />
              {!editor.getText() && (
                <div className="text-gray-500 pointer-events-none select-none space-y-3 text-center py-12">
                  <div className="text-lg font-medium text-gray-400">{placeholder || getDisplayName('editor.placeholder', 'ui')}</div>
                  <div className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                    💡 <strong>Pro tip:</strong> You can paste images from your clipboard (Ctrl+V) or use the image button above.
                    You can also paste markdown content and it will be automatically converted!
                    Try pasting: <code className="bg-gray-100 px-1 rounded text-xs">**bold**</code>, <code className="bg-gray-100 px-1 rounded text-xs">*italic*</code>, <code className="bg-gray-100 px-1 rounded text-xs">`code`</code>, <code className="bg-gray-100 px-1 rounded text-xs"># headers</code>, <code className="bg-gray-100 px-1 rounded text-xs">- lists</code>, <code className="bg-gray-100 px-1 rounded text-xs">&gt; quotes</code>, etc.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Scroll runway. `mobile-full-width` strips the container's padding on
            small screens, so the space that lets the last lines clear the
            toolbar and the on-screen keyboard has to be a real element. */}
        <div aria-hidden="true" style={{ height: bottomInset + (isMobile ? 96 : 0) }} />

        {/* Floating Table Toolbar */}
        {activeTablePosition && (
          <TableToolbar
            editor={editor}
            position={activeTablePosition}
            onAddColumnBefore={handleAddColumnBefore}
            onAddColumnAfter={handleAddColumnAfter}
            onDeleteColumn={handleDeleteColumn}
            onAddRowBefore={handleAddRowBefore}
            onAddRowAfter={handleAddRowAfter}
            onDeleteRow={handleDeleteRow}
            onDeleteTable={handleDeleteTable}
            onCopyTable={handleCopyTable}
            onCopyTableAsMarkdown={handleCopyTableAsMarkdown}
            onCopyRow={handleCopyRow}
            onCopyCell={handleCopyCell}
          />
        )}
      </div>

      {/* Mobile Toolbar */}
      {!hideToolbars && (
        <MobileToolbar
          editor={editor}
          instanceId={effectiveInstanceId}
          documentId={currentNote?.id}
          editorType="note"
          surfaceCapabilities={['text-range', 'rich-text']}
          onSave={handleSave}
          isSaving={isSaving}
          hasUnsavedChanges={Boolean(editor && !editor.isDestroyed && editor.schema && safeGetHTML(editor) !== lastSavedContent)}
          onDeleteNote={handleDeleteNote}
          onInsertTable={handleInsertTable}
          keyboardOffset={keyboardOffset}
          onShare={handleOpenShare}
          onClearContent={handleClearContent}
          onInsertLink={openLinkDialog}
          onInsertImage={handleInsertImage}
          onInsertDateTime={handleInsertDateTime}
          onRemoveLink={removeLink}
        />
      )}

      {/* Contribution Places: editor/selection-menu */}
      <SelectionMenuHost
        anchor={selectionMenu ? { top: selectionMenu.top, left: selectionMenu.left } : null}
        selectedText={selectionMenu?.text || ''}
        contributions={selectionContributions}
        editorType="note"
        documentId={currentNote?.id}
        onActionComplete={() => setSelectionMenu(null)}
      />

      {/* Link Dialog */}
      <LinkDialog
        editor={editor}
        isOpen={showLinkDialog}
        onClose={closeLinkDialog}
        onInsertLink={insertLink}
      />

      {/* Import Article Dialog */}
      <ImportArticleDialog
        isOpen={showImportArticleDialog}
        onClose={() => setShowImportArticleDialog(false)}
        onImport={(title, content, metadata) => {
          if (editor) {
            // Update the note title if we have a handler
            if (onTitleChange && title) {
              onTitleChange(title)
            }

            // Clear existing content first
            editor.commands.clearContent()

            // Insert the article content (use HTML if available, otherwise markdown)
            if (metadata?.htmlContent) {
              // Insert HTML content directly
              editor.commands.setContent(metadata.htmlContent)
            } else {
              // Fallback to markdown conversion
              insertMarkdownContent(editor, content)
            }

            // Add metadata footer
            if (metadata?.byline || metadata?.sourceUrl) {
              // Move to the end and add separator and metadata
              editor.commands.focus('end')
              editor.commands.setHorizontalRule()
              editor.commands.insertContent('<p></p>')

              // Add source link
              if (metadata.sourceUrl) {
                const sourceText = `Source: ${metadata.siteName || new URL(metadata.sourceUrl).hostname}`
                editor.commands.insertContent(`<p><em><a href="${metadata.sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceText}</a></em></p>`)
              }

              // Add byline
              if (metadata.byline) {
                editor.commands.insertContent(`<p><em>By: ${metadata.byline}</em></p>`)
              }
            }

            setShowImportArticleDialog(false)
          }
        }}
      />

      {/* Clear Content Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearContentConfirm}
        onClose={() => setShowClearContentConfirm(false)}
        onConfirm={confirmClearContent}
        title={getDisplayName('clearContent', 'ui') || 'Clear Content'}
        description={getDisplayName('clearContentConfirm', 'ui') || 'Are you sure you want to clear all editor content?'}
        confirmText={getDisplayName('clear', 'ui') || 'Clear'}
        cancelText={getDisplayName('cancel', 'ui') || 'Cancel'}
        variant="warning"
      />

      {/* Mobile Image Upload - Only show on mobile */}
      <MobileImageUpload editor={editor} />
    </div>
  )
}

export function TipTapEditor(props: TipTapEditorProps) {
  const initialized = usePluginSystemInitialized()

  if (!initialized) {
    return (
      <div className={`border border-gray-200/50 dark:border-white/10 rounded-lg p-4 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md ${props.className || ''}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading editor system...</p>
        </div>
      </div>
    )
  }

  return <TipTapEditorContent {...props} />
}
