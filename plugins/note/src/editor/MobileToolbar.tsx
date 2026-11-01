import React from 'react'
import { Editor } from '@tiptap/react'
import { ToolbarButton } from './ToolbarButton'
import { ColorPicker } from './ColorPicker'
// audit-ignore: sdk-boundary
import { MobileMenu } from '@/components/ui/MobileMenu'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Indent,
  Outdent,
  Image as ImageIcon,
  Link as LinkIcon,
  Unlink,
  Table as TableIcon,
  Calendar,
  Undo2,
  Redo2,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react'
// audit-ignore: sdk-boundary
import { ToolbarContributions } from '@/components/editor/ToolbarContributions'
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions'
import type { SurfaceCapability } from '@readergo/plugin-sdk'

interface MobileToolbarProps {
  editor: Editor
  instanceId?: string
  documentId?: string
  editorType?: string
  surfaceCapabilities?: SurfaceCapability[]
  onSave?: () => void
  isSaving?: boolean
  hasUnsavedChanges?: boolean
  onDeleteNote?: () => void
  onInsertTable?: () => void
  keyboardOffset?: number
  onShare?: () => void
  onClearContent?: () => void
  onInsertLink?: () => void
  onInsertImage?: () => void
  onInsertDateTime?: () => void
  onRemoveLink?: () => void
}

/** Vertical rule between button groups. */
function Divider() {
  return <div className="w-px h-5 bg-border/60 mx-1 flex-shrink-0" aria-hidden="true" />
}

export const MobileToolbar = React.memo(function MobileToolbar({
  editor,
  instanceId,
  documentId,
  editorType = 'note',
  surfaceCapabilities = ['text-range', 'rich-text'],
  onDeleteNote,
  onInsertTable,
  keyboardOffset = 0,
  onShare,
  onClearContent,
  onInsertLink,
  onInsertImage,
  onInsertDateTime,
  onRemoveLink
}: MobileToolbarProps) {
  const runCommand = React.useCallback(
    (commandId: string, extra?: Record<string, unknown>) => {
      executeCommand(commandId, { editorInstanceId: instanceId, ...extra })
    },
    [instanceId]
  )

  return (
    <div
      data-no-swipe="true"
      className="rg-mobile-toolbar lg:hidden fixed left-0 right-0 z-40 flex items-center gap-0.5 px-2 border-t border-border/60 bg-popover/95 backdrop-blur-md overflow-x-auto scrollbar-thin"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        touchAction: 'pan-x',
        bottom: 0,
        paddingBottom: keyboardOffset ? '0.25rem' : 'calc(0.25rem + env(safe-area-inset-bottom, 0px))',
        transform: keyboardOffset ? `translateY(-${keyboardOffset}px)` : undefined
      }}
    >
      {/* Overflow actions */}
      <MobileMenu
        onShare={onShare}
        onDelete={onDeleteNote}
        onClearContent={onClearContent}
        showShare={!!onShare}
        showDelete={!!onDeleteNote}
        showClearContent={!!onClearContent}
      />

      <Divider />

      {/* History */}
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.undo')} disabled={!editor.can().undo()} title="Undo">
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.redo')} disabled={!editor.can().redo()} title="Redo">
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      {[1, 2, 3].map((level) => (
        <ToolbarButton
          key={level}
          size="compact"
          onClick={() => runCommand('readergo.editor.heading', { level })}
          isActive={editor.isActive('heading', { level })}
          title={`Heading ${level}`}
        >
          <span className="text-xs font-semibold">H{level}</span>
        </ToolbarButton>
      ))}

      <Divider />

      {/* Inline formatting */}
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.bold')} isActive={editor.isActive('bold')} title="Bold">
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.italic')} isActive={editor.isActive('italic')} title="Italic">
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.underline')} isActive={editor.isActive('underline')} title="Underline">
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.strike')} isActive={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.code')} isActive={editor.isActive('code')} title="Inline Code">
        <Code className="w-4 h-4" />
      </ToolbarButton>
      <ColorPicker editor={editor} title="Text Color" />

      <Divider />

      {/* Lists */}
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.bulletList')} isActive={editor.isActive('bulletList')} title="Bullet List">
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.orderedList')} isActive={editor.isActive('orderedList')} title="Numbered List">
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.taskList')} isActive={editor.isActive('taskList')} title="Task List">
        <CheckSquare className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.outdent')} disabled={!editor.can().liftListItem('listItem')} title="Outdent">
        <Outdent className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.indent')} disabled={!editor.can().sinkListItem('listItem')} title="Indent">
        <Indent className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Blocks */}
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.blockquote')} isActive={editor.isActive('blockquote')} title="Blockquote">
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.codeBlock')} isActive={editor.isActive('codeBlock')} title="Code Block">
        <div className="relative">
          <Code className="w-4 h-4" />
          <span className="absolute -bottom-1 -right-1 text-[8px] font-bold">B</span>
        </div>
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.horizontalRule')} title="Horizontal Rule">
        <Minus className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.textAlign', { alignment: 'left' })} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.textAlign', { alignment: 'center' })} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.textAlign', { alignment: 'right' })} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton size="compact" onClick={() => runCommand('readergo.editor.textAlign', { alignment: 'justify' })} isActive={editor.isActive({ textAlign: 'justify' })} title="Justify">
        <AlignJustify className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Insert */}
      {onInsertTable && (
        <ToolbarButton size="compact" onClick={onInsertTable} title="Insert Table">
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>
      )}
      {onInsertImage && (
        <ToolbarButton size="compact" onClick={onInsertImage} title="Insert Image">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
      )}
      {onInsertLink && (
        <ToolbarButton size="compact" onClick={onInsertLink} isActive={editor.isActive('link')} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
      )}
      {onRemoveLink && (
        <ToolbarButton size="compact" onClick={onRemoveLink} disabled={!editor.isActive('link')} title="Remove Link">
          <Unlink className="w-4 h-4" />
        </ToolbarButton>
      )}
      {onInsertDateTime && (
        <ToolbarButton size="compact" onClick={onInsertDateTime} title="Insert Date & Time">
          <Calendar className="w-4 h-4" />
        </ToolbarButton>
      )}

      <Divider />

      {/* Plugin Toolbar Extensions */}
      <ToolbarContributions
        surface={{
          editorType: editorType || 'note',
          capabilities: surfaceCapabilities || ['text-range', 'rich-text'],
        }}
        context={{
          readOnly: !editor.isEditable,
        }}
        editorType={editorType || 'note'}
        documentId={documentId}
        instanceId={instanceId}
        compact
      />
    </div>
  )
})
