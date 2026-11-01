'use client'

import { useState } from 'react'
import { X, Link2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportArticleDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (title: string, content: string, metadata?: any) => void
}

export function ImportArticleDialog({ isOpen, onClose, onImport }: ImportArticleDialogProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log('🔗 Importing article from:', url)

      const { urlContentClient } = await import("@/platform/capabilityClient");
      const data = await urlContentClient.fetch(url) as any;

      if (!data) {
        throw new Error('Failed to fetch article');
      }

      console.log('✅ Article imported:', data.title)

      // Import the article with HTML content in metadata
      onImport(data.title, data.content, {
        ...data.metadata,
        htmlContent: data.htmlContent
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setUrl('')
        setSuccess(false)
      }, 1000)

    } catch (err) {
      console.error('❌ Import error:', err)
      setError(err instanceof Error ? err.message : 'Failed to import article')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleImport()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/20 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
                Import Article from URL
              </h2>
              <p className="text-sm text-muted-foreground">
                Paste a link to any article or webpage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Article URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 border border-border/20 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={loading}
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/10 border border-red-900/20 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-500">
                Import Failed
              </p>
              <p className="text-sm text-red-500/80 mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-accent" />
            <p className="text-sm font-bold text-accent">
              Article imported successfully!
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border-2 border-transparent"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !url.trim()}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Import Article</span>
              </>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 pt-4 border-t border-border/10">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> This works with articles from Medium, blogs, news sites, documentation pages, and more.
            The content will be cleaned and formatted automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

