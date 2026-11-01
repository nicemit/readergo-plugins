'use client'

import React, { useState, useMemo } from 'react'
import {
  X,
  Search,
  BookOpen,
  Bookmark,
  Trash2,
  Clock,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import {
  EpubBook,
  EpubTocItem,
  EpubBookmark,
  ThemeStyle,
} from './types'
import { splitEpubHref } from './parseEpub'

interface EpubTocDrawerProps {
  book: EpubBook
  currentChapterIndex: number
  theme: ThemeStyle
  bookmarks: EpubBookmark[]
  onOpenHref: (href: string) => void
  onSelectBookmark: (bm: EpubBookmark) => void
  onDeleteBookmark: (id: string) => void
  onClose: () => void
}

export function EpubTocDrawer({
  book,
  currentChapterIndex,
  theme,
  bookmarks,
  onOpenHref,
  onSelectBookmark,
  onDeleteBookmark,
  onClose,
}: EpubTocDrawerProps) {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks'>('toc')
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedHrefs, setCollapsedHrefs] = useState<Set<string>>(new Set())

  const toggleCollapse = (href: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedHrefs((prev) => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      return next
    })
  }

  // Filter TOC based on search query
  const filteredToc = useMemo(() => {
    if (!searchQuery.trim()) return book.toc

    const q = searchQuery.toLowerCase()
    const filterItem = (item: EpubTocItem): EpubTocItem | null => {
      const matchLabel = item.label.toLowerCase().includes(q)
      const matchingChildren = item.children
        ?.map(filterItem)
        .filter((c): c is EpubTocItem => c !== null)

      if (matchLabel || (matchingChildren && matchingChildren.length > 0)) {
        return {
          ...item,
          children: matchingChildren,
        }
      }
      return null
    }

    return book.toc
      .map(filterItem)
      .filter((i): i is EpubTocItem => i !== null)
  }, [book.toc, searchQuery])

  // Total words & reading time estimate for the entire book
  const totalStats = useMemo(() => {
    let words = 0
    for (const c of book.chapters) {
      words += c.text.split(/\s+/).filter(Boolean).length
    }
    const minutes = Math.max(1, Math.round(words / 225))
    const hours = Math.floor(minutes / 60)
    const remMins = minutes % 60
    const timeStr = hours > 0 ? `${hours}h ${remMins}m` : `${minutes} min`
    return { words, timeStr }
  }, [book.chapters])

  const renderTocList = (items: EpubTocItem[], depth = 0) => {
    return (
      <div className={depth === 0 ? 'space-y-1' : 'ml-3 pl-2.5 border-l space-y-1'} style={{ borderColor: theme.border }}>
        {items.map((item, idx) => {
          const { path } = splitEpubHref(item.href)
          const currentChapter = book.chapters[currentChapterIndex]
          const isCurrent =
            currentChapter &&
            (currentChapter.href === item.href ||
              splitEpubHref(currentChapter.href).path === path)
          const hasChildren = item.children && item.children.length > 0
          const isCollapsed = collapsedHrefs.has(item.href)

          return (
            <div key={`${item.href}-${idx}`}>
              <div
                className={`group flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                  isCurrent ? 'shadow-xs' : 'hover:opacity-85'
                }`}
                style={{
                  backgroundColor: isCurrent ? `${theme.accent}18` : 'transparent',
                  color: isCurrent ? theme.accent : theme.text,
                }}
                onClick={() => {
                  if (item.href) {
                    onOpenHref(item.href)
                    onClose()
                  }
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {depth === 0 ? (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: isCurrent ? theme.accent : theme.muted,
                        opacity: isCurrent ? 1 : 0.4,
                      }}
                    />
                  ) : null}
                  <span className={`truncate ${isCurrent ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </div>

                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => toggleCollapse(item.href, e)}
                    className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </button>
                ) : null}
              </div>

              {hasChildren && !isCollapsed ? renderTocList(item.children!, depth + 1) : null}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md h-full shadow-2xl border-r flex flex-col animate-in slide-in-from-left duration-200"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          className="p-4 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: theme.border, backgroundColor: theme.headerBg }}
        >
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{book.title}</h3>
            <p className="text-xs truncate opacity-70 mt-0.5">
              {book.creator ? `${book.creator} · ` : ''}
              {book.chapters.length} chapters · {totalStats.timeStr} read
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border hover:opacity-75 transition-opacity shrink-0"
            style={{ borderColor: theme.border }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b px-4 pt-2 gap-4 shrink-0" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={() => setActiveTab('toc')}
            className="pb-2.5 text-xs font-semibold uppercase tracking-wider relative flex items-center gap-1.5 transition-colors"
            style={{
              color: activeTab === 'toc' ? theme.accent : theme.muted,
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Contents ({book.chapters.length})</span>
            {activeTab === 'toc' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookmarks')}
            className="pb-2.5 text-xs font-semibold uppercase tracking-wider relative flex items-center gap-1.5 transition-colors"
            style={{
              color: activeTab === 'bookmarks' ? theme.accent : theme.muted,
            }}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarks ({bookmarks.length})</span>
            {activeTab === 'bookmarks' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
            )}
          </button>
        </div>

        {/* Search input (for TOC) */}
        {activeTab === 'toc' && (
          <div className="p-3 border-b shrink-0" style={{ borderColor: theme.border }}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter chapters or headings..."
                className="w-full text-xs rounded-xl pl-9 pr-3 py-2 border bg-transparent focus:outline-hidden"
                style={{ borderColor: theme.border }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 opacity-60 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {activeTab === 'toc' ? (
            filteredToc.length > 0 ? (
              renderTocList(filteredToc)
            ) : (
              <div className="py-12 text-center text-xs opacity-60">
                No chapters matched "{searchQuery}"
              </div>
            )
          ) : bookmarks.length > 0 ? (
            <div className="space-y-2">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => {
                    onSelectBookmark(bm)
                    onClose()
                  }}
                  className="group flex items-start justify-between p-3 rounded-xl border cursor-pointer hover:shadow-xs transition-all"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  }}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-semibold truncate">{bm.chapterTitle}</p>
                    {bm.snippet && (
                      <p className="text-[11px] opacity-70 mt-1 line-clamp-2 italic">
                        "{bm.snippet}"
                      </p>
                    )}
                    <p className="text-[10px] opacity-40 mt-1.5 flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(bm.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteBookmark(bm.id)
                    }}
                    className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:text-red-500 transition-all shrink-0"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs opacity-60 space-y-2">
              <Bookmark className="w-6 h-6 mx-auto opacity-30" />
              <p>No bookmarks yet.</p>
              <p className="text-[11px]">Click the bookmark icon in the reading bar to save key locations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
