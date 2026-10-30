'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { CAPTIONS, DIAGRAMS, type Diagram } from './diagrams'
import { FlowChart } from './FlowChart'

export function ArchitectureGuide() {
  const [diagramId, setDiagramId] = useState(DIAGRAMS[0]?.id || 'system')
  const [selectedId, setSelectedId] = useState<string | null>(DIAGRAMS[0]?.nodes[0]?.id || null)
  const [pathIds, setPathIds] = useState<string[]>([])
  const [playing, setPlaying] = useState(false)

  const diagram: Diagram = DIAGRAMS.find((item) => item.id === diagramId) || DIAGRAMS[0]

  useEffect(() => {
    setSelectedId(diagram.nodes[0]?.id || null)
    setPathIds([])
    setPlaying(false)
  }, [diagram.id])

  useEffect(() => {
    if (!playing || !diagram.play?.length) return
    const order = diagram.play
    setPathIds([order[0]])
    setSelectedId(order[0])
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      if (index >= order.length) {
        window.clearInterval(timer)
        setPlaying(false)
        setPathIds(order)
        return
      }
      setPathIds(order.slice(0, index + 1))
      setSelectedId(order[index])
    }, 650)
    return () => window.clearInterval(timer)
  }, [playing, diagram])

  const onSelect = useCallback((id: string) => {
    setPlaying(false)
    setPathIds([])
    setSelectedId(id)
  }, [])

  const caption = selectedId ? CAPTIONS[selectedId] : null

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">How ReaderGo works</h1>
          <p className="text-xs text-muted-foreground">{diagram.hint}</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying(true)}
          disabled={!diagram.play || playing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary/50 disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5" />
          Play flow
        </button>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/80 px-3 py-2 sm:px-6">
        {DIAGRAMS.map((item) => {
          const active = item.id === diagram.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setDiagramId(item.id)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.title}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        <div className="mx-auto max-w-[1100px] rounded-2xl border border-border/70 bg-muted/15 p-2 sm:p-4">
          <FlowChart
            diagram={diagram}
            selectedId={selectedId}
            pathIds={pathIds}
            onSelect={onSelect}
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
          <p className="min-h-[1.25rem] text-sm">
            {caption ? (
              <>
                <span className="font-semibold">
                  {diagram.nodes.find((node) => node.id === selectedId)?.label}
                </span>
                <span className="text-muted-foreground"> · {caption}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Click a box or play the flow.</span>
            )}
          </p>
          <div className="flex flex-wrap gap-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary/70" /> UI
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-foreground/40" /> Kernel
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500/80" /> Plugin
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500/80" /> Runtime
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500/80" /> Data
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
