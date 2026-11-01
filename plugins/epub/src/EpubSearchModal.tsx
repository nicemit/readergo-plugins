'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Search, X, ChevronRight, BookOpen } from 'lucide-react'
import { EpubBook, ThemeStyle } from './types'

interface SearchMatch {
  chapterIndex: number
  chapterTitle: string
  snippetBefore: string
  matchText: string
  snippetAfter: string
  href: string
}

interface EpubSearchModalProps {
  book: EpubBook
  theme: ThemeStyle
  onSelectResult: (chapterIndex: number, query: string) => void
  onClose: () => void
}

export function EpubSearchModal({
  book,
  theme,
  onSelectResult,
  onClose,
}: EpubSearchModalProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results: SearchMatch[] = useMemo(() => {
    const q = query.trim()
    if (!q || q.length < 2) return []

    const matches: SearchMatch[] = []
    const lowerQuery = q.toLowerCase()

    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const chapter = book.chapters[cIdx]
      const text = chapter.text
      const lowerText = text.toLowerCase()

      let pos = 0
      let matchCount = 0
      while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1 && matchCount < 3) {
        const start = Math.max(0, pos - 40)
        const end = Math.min(text.length, pos + q.length + 50)

        matches.push({
          chapterIndex: cIdx,
          chapterTitle: chapter.title,
          snippetBefore: (start > 0 ? '…' : '') + text.slice(start, pos),
          matchText: text.slice(pos, pos + q.length),
          snippetAfter: text.slice(pos + q.length, end) + (end < text.length ? '…' : ''),
          href: chapter.href,
        })

        pos += q.length
        matchCount++
        if (matches.length >= 30) break
      }
      if (matches.length >= 30) break
    }

    return matches
  }, [book.chapters, query])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-16 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.border,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className="p-4 border-b flex items-center gap-3 shrink-0"
          style={{ borderColor: theme.border }}
        >
          <Search className="w-4 h-4 opacity-50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across entire book..."
            className="flex-1 bg-transparent text-sm focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg opacity-50 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:opacity-75 transition-opacity text-xs"
            style={{ borderColor: theme.border }}
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {query.trim().length >= 2 ? (
            results.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1" style={{ color: theme.muted }}>
                  {results.length} matches found
                </p>
                {results.map((m, idx) => (
                  <div
                    key={`${m.chapterIndex}-${idx}`}
                    onClick={() => {
                      onSelectResult(m.chapterIndex, query)
                      onClose()
                    }}
                    className="p-3 rounded-xl border cursor-pointer hover:shadow-xs transition-all group"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1" style={{ color: theme.accent }}>
                      <span className="truncate">{m.chapterTitle}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </div>
                    <p className="text-xs leading-relaxed opacity-85">
                      <span>{m.snippetBefore}</span>
                      <mark
                        className="rounded px-1 py-0.5 font-medium"
                        style={{
                          backgroundColor: `${theme.accent}33`,
                          color: theme.accent,
                        }}
                      >
                        {m.matchText}
                      </mark>
                      <span>{m.snippetAfter}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs opacity-60">
                No occurrences found for "{query}"
              </div>
            )
          ) : (
            <div className="py-12 text-center text-xs opacity-50 space-y-2">
              <BookOpen className="w-6 h-6 mx-auto opacity-30" />
              <p>Type at least 2 characters to search across all book chapters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
