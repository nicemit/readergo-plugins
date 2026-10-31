'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { DIAGRAMS, type Diagram } from './diagrams'
import { FlowChart } from './FlowChart'

export function ArchitectureGuide() {
  const [diagramId, setDiagramId] = useState(DIAGRAMS[0]?.id || 'system')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pathIds, setPathIds] = useState<string[]>([])
  const [playing, setPlaying] = useState(false)

  const diagram: Diagram = DIAGRAMS.find((item) => item.id === diagramId) || DIAGRAMS[0]
  const selected = diagram.nodes.find((node) => node.id === selectedId)

  useEffect(() => {
    setSelectedId(null)
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
    }, 800)
    return () => window.clearInterval(timer)
  }, [playing, diagram])

  const onSelect = useCallback((id: string) => {
    setPlaying(false)
    setPathIds([])
    setSelectedId((current) => (current === id ? null : id))
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
        <div className="min-w-0 max-w-3xl">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{diagram.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{diagram.story}</p>
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
        {DIAGRAMS.map((item, index) => {
          const active = item.id === diagram.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setDiagramId(item.id)}
              title={item.story}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="mr-1.5 tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              {item.title}
            </button>
          )
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        <div className="mx-auto w-full max-w-[1100px] rounded-2xl border border-border/70 bg-muted/15 p-2 sm:p-4">
          <FlowChart
            diagram={diagram}
            selectedId={selectedId}
            pathIds={pathIds}
            onSelect={onSelect}
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="min-h-[2.5rem] max-w-3xl text-sm leading-relaxed">
            {selected ? (
              <>
                <span className="font-semibold">
                  {selected.step != null ? `${selected.step}. ` : ''}
                  {selected.label}
                </span>
                <span className="text-muted-foreground"> · {selected.detail || selected.sub}</span>
              </>
            ) : (
              <span className="text-muted-foreground">
                The boxes and arrows are the explanation. Click one only if you want the extra line.
              </span>
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
