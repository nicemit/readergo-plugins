'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { DIAGRAMS, type Diagram } from './diagrams'
import { FlowChart } from './FlowChart'

const DEFAULT_PACE_MS = 1700

export function ArchitectureGuide() {
  const [diagramId, setDiagramId] = useState(DIAGRAMS[0]?.id || 'spreadsheet')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [revealedIds, setRevealedIds] = useState<string[]>([])
  const [playing, setPlaying] = useState(true)
  const [runId, setRunId] = useState(0)

  const diagram: Diagram = DIAGRAMS.find((item) => item.id === diagramId) || DIAGRAMS[0]
  const order =
    diagram.play && diagram.play.length > 0
      ? diagram.play
      : diagram.nodes.map((node) => node.id)
  const selected = diagram.nodes.find((node) => node.id === selectedId)
  const latest = diagram.nodes.find((node) => node.id === revealedIds[revealedIds.length - 1])
  const captionNode = selected || latest
  const done = revealedIds.length >= order.length && order.length > 0

  const startFlow = useCallback((id: string) => {
    setDiagramId(id)
    setRevealedIds([])
    setSelectedId(null)
    setPlaying(true)
    setRunId((value) => value + 1)
  }, [])

  const replay = useCallback(() => {
    setRevealedIds([])
    setSelectedId(null)
    setPlaying(true)
    setRunId((value) => value + 1)
  }, [])

  useEffect(() => {
    const steps =
      diagram.play && diagram.play.length > 0
        ? diagram.play
        : diagram.nodes.map((node) => node.id)
    if (!playing || steps.length === 0) return

    if (revealedIds.length === 0) {
      const timer = window.setTimeout(() => {
        setRevealedIds([steps[0]])
        setSelectedId(steps[0])
      }, 320)
      return () => window.clearTimeout(timer)
    }

    if (revealedIds.length >= steps.length) {
      setPlaying(false)
      return
    }

    const timer = window.setTimeout(() => {
      const next = steps[revealedIds.length]
      setRevealedIds((current) => [...current, next])
      setSelectedId(next)
    }, diagram.paceMs || DEFAULT_PACE_MS)

    return () => window.clearTimeout(timer)
  }, [playing, revealedIds, diagram, runId])

  const onSelect = useCallback((id: string) => {
    setPlaying(false)
    setSelectedId((current) => (current === id ? null : id))
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border/80 px-4 py-3 sm:px-6">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Watch a flow
          </p>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{diagram.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{diagram.story}</p>
        </div>
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary/50"
        >
          <Play className="h-3.5 w-3.5" />
          {playing ? 'Playing…' : done ? 'Replay' : 'Play'}
        </button>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/80 px-3 py-2 sm:px-6">
        {DIAGRAMS.map((item) => {
          const active = item.id === diagram.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => startFlow(item.id)}
              title={item.story}
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
        <div className="mx-auto w-full max-w-[1100px] rounded-2xl border border-border/70 bg-muted/15 p-2 sm:p-4">
          {revealedIds.length === 0 ? (
            <div className="flex min-h-[22rem] flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-semibold">{diagram.title}</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                First the UI click appears. Then the command. Then each next step, one at a time.
              </p>
            </div>
          ) : (
            <FlowChart
              diagram={diagram}
              selectedId={selectedId}
              revealedIds={revealedIds}
              onSelect={onSelect}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border/80 px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="min-h-[2.5rem] max-w-3xl text-sm leading-relaxed">
            {captionNode ? (
              <>
                <span className="font-semibold">
                  {captionNode.step != null ? `${captionNode.step}. ` : ''}
                  {captionNode.label}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  · {captionNode.detail || captionNode.sub}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Pick a flow. Boxes are added in order, about two seconds apart.
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
