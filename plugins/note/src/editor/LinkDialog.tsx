import React, { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'

interface LinkDialogProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  onInsertLink: (text: string, url: string) => void
}

export function LinkDialog({ editor, isOpen, onClose, onInsertLink }: LinkDialogProps) {
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    if (isOpen && editor) {
      const selectedText = editor.getText().slice(editor.state.selection.from, editor.state.selection.to)
      setLinkText(selectedText)
      setLinkUrl('')
    }
  }, [isOpen, editor])

  const handleInsertLink = () => {
    if (linkText && linkUrl) {
      onInsertLink(linkText, linkUrl)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleInsertLink()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border/20 rounded-xl p-6 w-96 max-w-[90vw] shadow-2xl animate-in zoom-in duration-200">
        <h3 className="text-xl font-bold mb-5 text-foreground" style={{ fontFamily: 'var(--font-space-grotesk)' }}>Insert Link</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Link Text
            </label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter link text"
              className="w-full px-4 py-2.5 border border-border/20 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground transition-all"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              URL
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 border border-border/20 rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground rounded-lg transition-colors border-2 border-transparent"
          >
            Cancel
          </button>
          <button
            onClick={handleInsertLink}
            disabled={!linkText || !linkUrl}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            Insert Link
          </button>
        </div>
      </div>
    </div>
  )
}
