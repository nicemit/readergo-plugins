import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/react'
import { ToolbarButton } from './ToolbarButton'

interface TableToolbarProps {
  editor: Editor
  position: { top: number; left: number }
  onAddColumnBefore: () => void
  onAddColumnAfter: () => void
  onDeleteColumn: () => void
  onAddRowBefore: () => void
  onAddRowAfter: () => void
  onDeleteRow: () => void
  onDeleteTable: () => void
  onCopyTable: () => void
  onCopyTableAsMarkdown: () => void
  onCopyRow: () => void
  onCopyCell: () => void
}

export const TableToolbar = React.memo(function TableToolbar({
  editor,
  position,
  onAddColumnBefore,
  onAddColumnAfter,
  onDeleteColumn,
  onAddRowBefore,
  onAddRowAfter,
  onDeleteRow,
  onDeleteTable,
  onCopyTable,
  onCopyTableAsMarkdown,
  onCopyRow,
  onCopyCell
}: TableToolbarProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Portalled to the body. The editor's scroll container clips `position: fixed`
  // children on mobile, where an ancestor pane carries a transform.
  const toolbar = (
    <div
      data-no-swipe="true"
      className="table-toolbar rg-menu-surface fixed z-[110] p-1.5 flex items-center gap-0.5 overflow-x-auto scrollbar-thin max-w-[90vw]"
      style={{
        top: position.top,
        left: position.left
      }}
    >
      {/* Column Controls */}
      <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          onClick={onAddColumnBefore}
          title="Add Column Before"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onAddColumnAfter}
          title="Add Column After"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onDeleteColumn}
          title="Delete Column"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Row Controls */}
      <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          onClick={onAddRowBefore}
          title="Add Row Before"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onAddRowAfter}
          title="Add Row After"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onDeleteRow}
          title="Delete Row"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Copy Controls */}
      <div className="flex items-center space-x-1 border-r border-gray-200 dark:border-gray-700 pr-2">
        <ToolbarButton
          onClick={onCopyTable}
          title="Copy Table"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onCopyTableAsMarkdown}
          title="Copy as Markdown"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onCopyRow}
          title="Copy Row"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={onCopyCell}
          title="Copy Cell"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Delete Table */}
      <ToolbarButton
        onClick={onDeleteTable}
        variant="danger"
        title="Delete Table"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </ToolbarButton>
    </div>
  )

  return mounted ? createPortal(toolbar, document.body) : null
})
