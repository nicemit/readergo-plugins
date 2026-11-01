import { Editor } from '@tiptap/react'
import { showToast } from './toast'

// Table manipulation functions
export const insertTable = (editor: Editor) => {
  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

export const addColumnBefore = (editor: Editor) => {
  editor.chain().focus().addColumnBefore().run()
}

export const addColumnAfter = (editor: Editor) => {
  editor.chain().focus().addColumnAfter().run()
}

export const deleteColumn = (editor: Editor) => {
  editor.chain().focus().deleteColumn().run()
}

export const addRowBefore = (editor: Editor) => {
  editor.chain().focus().addRowBefore().run()
}

export const addRowAfter = (editor: Editor) => {
  editor.chain().focus().addRowAfter().run()
}

export const deleteRow = (editor: Editor) => {
  editor.chain().focus().deleteRow().run()
}

export const deleteTable = (editor: Editor) => {
  editor.chain().focus().deleteTable().run()
}

// Table copy functions
export const copyTable = (editor: Editor) => {
  const htmlContent = editor.getHTML()
  const tableMatch = htmlContent.match(/<table[^>]*>[\s\S]*?<\/table>/)

  if (!tableMatch) {
    showToast.error('No table found to copy')
    return
  }

  navigator.clipboard.writeText(tableMatch[0]).then(() => {
    showToast.success('Table copied to clipboard')
  }).catch(() => {
    showToast.error('Failed to copy table')
  })
}

export const copyTableAsMarkdown = (editor: Editor, htmlToMarkdown: (html: string) => string) => {
  const htmlContent = editor.getHTML()
  const tableMatch = htmlContent.match(/<table[^>]*>[\s\S]*?<\/table>/)

  if (!tableMatch) {
    showToast.error('No table found to copy')
    return
  }

  const markdownContent = htmlToMarkdown(tableMatch[0])

  navigator.clipboard.writeText(markdownContent).then(() => {
    showToast.success('Table copied as markdown')
  }).catch(() => {
    showToast.error('Failed to copy table')
  })
}

export const copyRow = (editor: Editor) => {
  if (!editor.isActive('table')) {
    showToast.error('Please click in a table row to copy')
    return
  }

  const { state } = editor
  const { selection } = state

  const selectedText = state.doc.textBetween(selection.from, selection.to)

  if (!selectedText.trim()) {
    showToast.error('Please select some text in the row to copy')
    return
  }

  navigator.clipboard.writeText(selectedText).then(() => {
    showToast.success('Row content copied to clipboard')
  }).catch(() => {
    showToast.error('Failed to copy row content')
  })
}

export const copyCell = (editor: Editor) => {
  if (!editor.isActive('tableCell') && !editor.isActive('tableHeader')) {
    showToast.error('Please click in a table cell to copy')
    return
  }

  const { state } = editor
  const { selection } = state

  const selectedText = state.doc.textBetween(selection.from, selection.to)

  if (!selectedText.trim()) {
    showToast.error('Please select some text in the cell to copy')
    return
  }

  navigator.clipboard.writeText(selectedText).then(() => {
    showToast.success('Cell content copied to clipboard')
  }).catch(() => {
    showToast.error('Failed to copy cell content')
  })
}

// Table position detection
export const getTablePosition = (editor: Editor) => {
  if (!editor.isActive('table')) {
    return null
  }

  // Find the closest table to the current cursor/selection
  const editorElement = editor.view.dom

  // A robust way to find the active table is by resolving the DOM node at the selection
  const { view } = editor
  const { selection } = view.state
  let activeTableNode: HTMLElement | null = null

  try {
    const domAtPos = view.domAtPos(selection.from)
    const node = domAtPos.node as HTMLElement
    if (node && node.closest) {
      activeTableNode = node.closest('table')
    }
  } catch (e) {
    // If resolution fails, fallback to querySelector
  }

  if (!activeTableNode) {
    const tables = editorElement.querySelectorAll('table')
    if (tables.length > 0) {
      activeTableNode = tables[0] as HTMLElement
    }
  }

  if (activeTableNode) {
    const rect = activeTableNode.getBoundingClientRect()

    // Position toolbar directly below the table in fixed viewport coordinates
    // We add a small offset to prevent the toolbar from overlapping the table border
    return {
      top: rect.bottom + 10,
      left: rect.left
    }
  }

  return null
}
