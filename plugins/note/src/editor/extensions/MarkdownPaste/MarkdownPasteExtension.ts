import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { markdownToHtml } from '../../markdownUtils'
import { DOMParser } from '@tiptap/pm/model'

// Helper function to detect if text looks like markdown
function isMarkdownText(text: string): boolean {
  // More comprehensive markdown detection
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // Headers (# ## ### etc.)
    /^#{1,6}[^#\s]/m,        // Headers without space after #
    /^\*\s+/m,               // Bullet lists with *
    /^-\s+/m,                // Bullet lists with -
    /^\+\s+/m,               // Bullet lists with +
    /^\d+\.\s+/m,            // Numbered lists
    /^\>\s+/m,               // Blockquotes
    /\*\*.*?\*\*/,           // Bold text
    /\*[^*].*?\*[^*]/,       // Italic text (not bold)
    /`[^`]+`/,               // Inline code
    /```[\s\S]*?```/,        // Code blocks
    /\[.*?\]\(.*?\)/,        // Links
    /!\[.*?\]\(.*?\)/,       // Images
    /^---+$/m,               // Horizontal rules
    /^===+$/m,               // Horizontal rules
    /^\|.*\|$/m,             // Tables
    /^\s*[-*+]\s/,           // Indented bullet lists
    /^\s*\d+\.\s/,           // Indented numbered lists
    /^\s*>\s/,               // Indented blockquotes
    /^\s*[-*+]\s+\[ \]/,     // Task lists (unchecked)
    /^\s*[-*+]\s+\[x\]/,     // Task lists (checked)
    /^\s*[-*+]\s+\[X\]/,     // Task lists (checked uppercase)
  ]
  
  const hasMarkdownPatterns = markdownPatterns.some(pattern => pattern.test(text))
  
  // Additional checks for common markdown characteristics
  const hasMultipleHeaders = (text.match(/^#{1,6}/gm) || []).length > 1
  const hasListItems = (text.match(/^[\s]*[-*+]\s/mg) || []).length > 0
  const hasNumberedLists = (text.match(/^[\s]*\d+\.\s/mg) || []).length > 0
  const hasTaskLists = (text.match(/^[\s]*[-*+]\s+\[[ xX]\]/mg) || []).length > 0
  const hasCodeBlocks = text.includes('```')
  const hasInlineCode = /`[^`\n]+`/.test(text)
  const hasLinks = /\[.*?\]\(.*?\)/.test(text)
  const hasBoldItalic = /\*\*.*?\*\*|\*.*?\*/.test(text)
  
  // Check for markdown-like structure
  const lines = text.split('\n')
  const hasStructuredContent = lines.some(line => 
    line.trim().match(/^#{1,6}|^[\s]*[-*+]\s|^[\s]*\d+\.\s|^>\s|^[\s]*[-*+]\s+\[[ xX]\]/)
  )
  
  const isMarkdown = hasMarkdownPatterns || hasMultipleHeaders || hasListItems || 
                    hasNumberedLists || hasTaskLists || hasCodeBlocks || hasInlineCode || 
                    hasLinks || hasBoldItalic || hasStructuredContent
  
  return isMarkdown
}

export const MarkdownPasteExtension = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view, event, slice) => {
            const clipboardData = event.clipboardData
            if (!clipboardData) return false

            const items = Array.from(clipboardData.items)
            
            // Check for markdown content synchronously
            for (const item of items) {
              if (item.type === 'text/plain') {
                // Get text synchronously
                const text = clipboardData.getData('text/plain')
                
                if (isMarkdownText(text)) {
                  try {
                    const html = markdownToHtml(text)
                    
                    // Create a temporary DOM element to parse the HTML
                    const tempDiv = document.createElement('div')
                    tempDiv.innerHTML = html
                    
                    // Convert HTML to ProseMirror nodes using TipTap's built-in parser
                    const { state, dispatch } = view
                    const { tr } = state
                    
                    // Clear any existing selection
                    const { from, to } = state.selection
                    if (from !== to) {
                      tr.delete(from, to)
                    }
                    
                    // Parse HTML and insert at cursor position
                    const slice = DOMParser.fromSchema(state.schema).parseSlice(tempDiv)
                    tr.replaceSelection(slice)
                    dispatch(tr)
                  } catch (error) {
                    console.error('Error converting markdown:', error)
                  }
                  
                  return true // Prevent default paste handling
                }
                break
              }
            }
            
            return false // Let default handling continue for non-markdown
          }
        }
      })
    ]
  }
})
