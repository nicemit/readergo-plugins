'use client'

import React from 'react'
import { Editor } from '@tiptap/react'
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
    RotateCcw,
    RotateCw,
    Trash2,
    Share2,
    Link2,
    Minus,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify
} from 'lucide-react'

import { Toolbar as ToolbarRoot, ToolbarGroup, ToolbarSeparator, Button, HeadingButton, TextAlignButton } from "./ToolbarComponents"
// audit-ignore: sdk-boundary
import { ToolbarContributions } from '@/components/editor/ToolbarContributions'
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions'
import type { SurfaceCapability } from '@readergo/plugin-sdk'

// Import legacy components we want to keep using for now
import { ColorPicker } from './ColorPicker'
import { MarginControl } from './MarginControl'
// audit-ignore: sdk-boundary
import { useDisplayName } from '@/components/providers/I18nProvider'
import { useMargin } from '@/contexts/MarginContext'

interface ToolbarProps {
    editor: Editor
    instanceId?: string
    documentId?: string
    editorType?: string
    surfaceCapabilities?: SurfaceCapability[]
    onSave?: () => void
    isSaving?: boolean
    onDeleteNote?: () => void
    onInsertLink?: () => void
    onInsertTable?: () => void
    onInsertImage?: () => void
    onInsertDateTime?: () => void
    onRemoveLink?: () => void
    onInsertMarkdown?: (markdown: string) => void
    onClearContent?: () => void
    onShare?: () => void
    onImportArticle?: () => void
}

export const Toolbar = React.memo(function Toolbar({
    editor,
    instanceId,
    documentId,
    editorType = 'note',
    surfaceCapabilities = ['text-range', 'rich-text'],
    onSave,
    isSaving = false,
    onDeleteNote,
    onInsertLink,
    onInsertTable,
    onInsertImage,
    onInsertDateTime,
    onRemoveLink,
    onInsertMarkdown,
    onClearContent,
    onShare,
    onImportArticle
}: ToolbarProps) {
    const getDisplayName = useDisplayName()
    const { margin, setMargin } = useMargin()

    const runCommand = React.useCallback(
        (commandId: string, extra?: Record<string, unknown>) => {
            executeCommand(commandId, { editorInstanceId: instanceId, ...extra })
        },
        [instanceId]
    )

    if (!editor) {
        return null
    }

    return (
        <ToolbarRoot className="w-full flex-wrap sm:flex-nowrap px-2 py-2 overflow-x-auto bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm border-b border-gray-200/50 dark:border-white/10">
            {/* History */}
            <ToolbarGroup>
                <Button
                    onClick={() => runCommand('readergo.editor.undo')}
                    disabled={!editor.can().undo()}
                    tooltip={`${getDisplayName('undo', 'ui')} (Ctrl+Z)`}
                    size="small"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.redo')}
                    disabled={!editor.can().redo()}
                    tooltip={`${getDisplayName('redo', 'ui')} (Ctrl+Y)`}
                    size="small"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <RotateCw className="w-4 h-4" />
                </Button>
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Headings */}
            <ToolbarGroup>
                <HeadingButton level={1} editor={editor} size="small" />
                <HeadingButton level={2} editor={editor} size="small" />
                <HeadingButton level={3} editor={editor} size="small" />
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Formatting */}
            <ToolbarGroup>
                <Button
                    onClick={() => runCommand('readergo.editor.bold')}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    data-active={editor.isActive('bold') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip={`${getDisplayName('bold', 'ui')} (Ctrl+B)`}
                    size="small"
                    variant="ghost"
                >
                    <Bold className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.italic')}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    data-active={editor.isActive('italic') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip={`${getDisplayName('italic', 'ui')} (Ctrl+I)`}
                    size="small"
                    variant="ghost"
                >
                    <Italic className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.underline')}
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    data-active={editor.isActive('underline') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip={getDisplayName('underline', 'ui')}
                    size="small"
                    variant="ghost"
                >
                    <Underline className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.strike')}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    data-active={editor.isActive('strike') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Strikethrough"
                    size="small"
                    variant="ghost"
                >
                    <Strikethrough className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.code')}
                    disabled={!editor.can().chain().focus().toggleCode().run()}
                    data-active={editor.isActive('code') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Inline Code"
                    size="small"
                    variant="ghost"
                >
                    <Code className="w-4 h-4" />
                </Button>
            </ToolbarGroup>

            {/* Color Picker (Legacy Custom Component) */}
            <ColorPicker editor={editor} title="Text Color" />

            <ToolbarSeparator className="mx-2" />

            {/* Lists */}
            <ToolbarGroup>
                <Button
                    onClick={() => runCommand('readergo.editor.bulletList')}
                    disabled={!editor.can().chain().focus().toggleBulletList().run()}
                    data-active={editor.isActive('bulletList') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Bullet List"
                    size="small"
                    variant="ghost"
                >
                    <List className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.orderedList')}
                    disabled={!editor.can().chain().focus().toggleOrderedList().run()}
                    data-active={editor.isActive('orderedList') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Numbered List"
                    size="small"
                    variant="ghost"
                >
                    <ListOrdered className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.taskList')}
                    disabled={!editor.can().chain().focus().toggleTaskList().run()}
                    data-active={editor.isActive('taskList') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('taskList') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Task List"
                    size="small"
                    variant="ghost"
                >
                    <CheckSquare className="w-4 h-4" />
                </Button>
            </ToolbarGroup>

            {/* Indent/Outdent */}
            <ToolbarGroup>
                <Button
                    onClick={() => runCommand('readergo.editor.outdent')}
                    disabled={!editor.can().liftListItem('listItem')}
                    tooltip="Outdent List Item"
                    size="small"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <Outdent className="w-4 h-4" />
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.indent')}
                    disabled={!editor.can().sinkListItem('listItem')}
                    tooltip="Indent List Item"
                    size="small"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <Indent className="w-4 h-4" />
                </Button>
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Block Quote & Code Block */}
            <ToolbarGroup>
                <Button
                    onClick={() => runCommand('readergo.editor.blockquote')}
                    disabled={!editor.can().chain().focus().toggleBlockquote().run()}
                    data-active={editor.isActive('blockquote') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Blockquote"
                    size="small"
                    variant="ghost"
                >
                    <Quote className="w-4 h-4" />
                </Button>
                {/* Reuse Code Icon but for Block */}
                <Button
                    onClick={() => runCommand('readergo.editor.codeBlock')}
                    disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
                    data-active={editor.isActive('codeBlock') ? 'true' : undefined}
                    className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''}`}
                    tooltip="Code Block"
                    size="small"
                    variant="ghost"
                >
                    <div className="relative">
                        <Code className="w-4 h-4" />
                        <span className="absolute -bottom-1 -right-1 text-[8px] font-bold">B</span>
                    </div>
                </Button>
                <Button
                    onClick={() => runCommand('readergo.editor.horizontalRule')}
                    disabled={!editor.can().chain().focus().setHorizontalRule().run()}
                    tooltip="Horizontal Rule"
                    size="small"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <Minus className="w-4 h-4" />
                </Button>
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Insert */}
            <ToolbarGroup>
                <Button onClick={onInsertTable} tooltip="Insert Table" size="small" variant="ghost" className="h-8 w-8 p-0">
                    <TableIcon className="w-4 h-4" />
                </Button>
                <Button onClick={onInsertImage} tooltip="Add Image" size="small" variant="ghost" className="h-8 w-8 p-0">
                    <ImageIcon className="w-4 h-4" />
                </Button>
                <Button onClick={onInsertLink} tooltip="Link" size="small" variant="ghost" className="h-8 w-8 p-0">
                    <LinkIcon className="w-4 h-4" />
                </Button>
                <Button
                    onClick={onRemoveLink}
                    disabled={!editor.isActive('link')}
                    tooltip="Remove Link"
                    size="small"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <Unlink className="w-4 h-4" />
                </Button>
                <Button onClick={onInsertDateTime} tooltip="Insert Date & Time" size="small" variant="ghost" className="h-8 w-8 p-0">
                    <Calendar className="w-4 h-4" />
                </Button>
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Text Align */}
            <ToolbarGroup>
                <TextAlignButton editor={editor} align="left" size="small" />
                <TextAlignButton editor={editor} align="center" size="small" />
                <TextAlignButton editor={editor} align="right" size="small" />
                <TextAlignButton editor={editor} align="justify" size="small" />
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Plugin Toolbar Extensions */}
            <ToolbarGroup>
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
                />
            </ToolbarGroup>

            <ToolbarSeparator className="mx-2" />

            {/* Right Side Actions */}
            <div className="flex-1 flex justify-end items-center gap-2">
                <MarginControl
                    onMarginChange={setMargin}
                    currentMargin={margin}
                />

                <ToolbarSeparator className="mx-2 bg-border h-6" />

                {onClearContent && (
                    <Button
                        onClick={onClearContent}
                        tooltip={getDisplayName('clearContent', 'ui')}
                        size="small"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}

                {onShare && (
                    <Button
                        onClick={onShare}
                        tooltip="Share"
                        size="small"
                        variant="ghost"
                        className="h-8 px-2 gap-1"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Share</span>
                    </Button>
                )}

                {onImportArticle && (
                    <Button
                        onClick={onImportArticle}
                        tooltip="Import article"
                        size="small"
                        variant="ghost"
                        className="h-8 px-2 gap-1"
                    >
                        <Link2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Import</span>
                    </Button>
                )}

                {onDeleteNote && (
                    <Button
                        onClick={onDeleteNote}
                        tooltip="Delete note"
                        size="small"
                        variant="ghost"
                        className="h-8 px-2 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Delete</span>
                    </Button>
                )}

            </div>

        </ToolbarRoot>
    )
})
