'use client'

import React, { useMemo } from 'react'
import type { ChartEdge, ChartNode, ChartTone, Diagram } from './diagrams'

const TONE: Record<ChartTone, string> = {
  ui: 'bg-primary/10 border-primary/40 text-foreground',
  kernel: 'bg-card border-border text-foreground',
  runtime: 'bg-amber-500/10 border-amber-500/40 text-foreground',
  data: 'bg-sky-500/10 border-sky-500/35 text-foreground',
  plugin: 'bg-violet-500/10 border-violet-500/40 text-foreground',
}

function ports(from: ChartNode, to: ChartNode) {
  const acx = from.x + from.w / 2
  const acy = from.y + from.h / 2
  const bcx = to.x + to.w / 2
  const bcy = to.y + to.h / 2
  const dx = bcx - acx
  const dy = bcy - acy
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { x1: from.x + from.w, y1: acy, x2: to.x, y2: bcy }
    }
    return { x1: from.x, y1: acy, x2: to.x + to.w, y2: bcy }
  }
  if (dy >= 0) {
    return { x1: acx, y1: from.y + from.h, x2: bcx, y2: to.y }
  }
  return { x1: acx, y1: from.y, x2: bcx, y2: to.y + to.h }
}

function curve(from: ChartNode, to: ChartNode) {
  const p = ports(from, to)
  const mx = (p.x1 + p.x2) / 2
  const my = (p.y1 + p.y2) / 2
  if (Math.abs(p.x2 - p.x1) >= Math.abs(p.y2 - p.y1)) {
    return { d: `M ${p.x1} ${p.y1} C ${mx} ${p.y1}, ${mx} ${p.y2}, ${p.x2} ${p.y2}`, p }
  }
  return { d: `M ${p.x1} ${p.y1} C ${p.x1} ${my}, ${p.x2} ${my}, ${p.x2} ${p.y2}`, p }
}

function edgeKey(edge: ChartEdge) {
  return `${edge.from}->${edge.to}:${edge.label || ''}`
}

function labelWidth(text: string) {
  return Math.max(28, text.length * 6.4 + 16)
}

export function FlowChart({
  diagram,
  selectedId,
  pathIds,
  onSelect,
}: {
  diagram: Diagram
  selectedId: string | null
  pathIds: string[]
  onSelect: (id: string) => void
}) {
  const byId = useMemo(() => {
    const map = new Map<string, ChartNode>()
    for (const node of diagram.nodes) map.set(node.id, node)
    return map
  }, [diagram.nodes])

  const pathSet = useMemo(() => new Set(pathIds), [pathIds])
  const pathEdges = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < pathIds.length - 1; i += 1) {
      set.add(`${pathIds[i]}->${pathIds[i + 1]}`)
    }
    return set
  }, [pathIds])

  const connected = useMemo(() => {
    const set = new Set<string>()
    if (!selectedId) return set
    set.add(selectedId)
    for (const edge of diagram.edges) {
      if (edge.from === selectedId) set.add(edge.to)
      if (edge.to === selectedId) set.add(edge.from)
    }
    return set
  }, [diagram.edges, selectedId])

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: `${diagram.width} / ${diagram.height}` }}
    >
      <svg
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <marker
            id={`rg-arrow-${diagram.id}`}
            viewBox="0 0 10 7"
            refX="9"
            refY="3.5"
            markerWidth="8"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 3.5 L 0 7 z" className="fill-muted-foreground" />
          </marker>
          <marker
            id={`rg-arrow-live-${diagram.id}`}
            viewBox="0 0 10 7"
            refX="9"
            refY="3.5"
            markerWidth="8"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 0 L 10 3.5 L 0 7 z" className="fill-primary" />
          </marker>
        </defs>

        {diagram.lanes?.map((lane) => (
          <g key={lane.label}>
            <rect
              x={8}
              y={lane.y}
              width={diagram.width - 16}
              height={lane.h}
              rx={20}
              className="fill-muted/25 stroke-border/60"
              strokeWidth={1}
            />
            <text
              x={20}
              y={lane.y + 28}
              className="fill-muted-foreground"
              fontSize={10}
              fontWeight={700}
              style={{ letterSpacing: '0.1em' }}
            >
              {lane.label.toUpperCase()}
            </text>
          </g>
        ))}

        {diagram.edges.map((edge) => {
          const from = byId.get(edge.from)
          const to = byId.get(edge.to)
          if (!from || !to) return null
          const { d, p } = curve(from, to)
          const live =
            pathEdges.has(`${edge.from}->${edge.to}`) ||
            (selectedId !== null &&
              pathIds.length === 0 &&
              (edge.from === selectedId || edge.to === selectedId))
          const mx = (p.x1 + p.x2) / 2
          const my = (p.y1 + p.y2) / 2
          const chip = edge.label ? labelWidth(edge.label) : 0
          return (
            <g key={edgeKey(edge)}>
              <path
                d={d}
                fill="none"
                strokeWidth={live ? 2.5 : 1.6}
                strokeDasharray={edge.dashed ? '7 6' : live ? '10 7' : undefined}
                markerEnd={`url(#${live ? `rg-arrow-live-${diagram.id}` : `rg-arrow-${diagram.id}`})`}
                className={live ? 'stroke-primary rg-edge-live' : 'stroke-muted-foreground/50'}
              />
              {edge.label && (
                <g>
                  <rect
                    x={mx - chip / 2}
                    y={my - 11}
                    width={chip}
                    height={20}
                    rx={10}
                    className={
                      live
                        ? 'fill-primary/15 stroke-primary/40'
                        : 'fill-background stroke-border/80'
                    }
                    strokeWidth={1}
                  />
                  <text
                    x={mx}
                    y={my + 3.5}
                    textAnchor="middle"
                    className={live ? 'fill-primary' : 'fill-muted-foreground'}
                    fontSize={11}
                    fontWeight={700}
                  >
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {diagram.nodes.map((node) => {
        const selected = selectedId === node.id
        const inPath = pathSet.has(node.id)
        const dim = selectedId && !connected.has(node.id) && !inPath
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={`absolute flex flex-col items-center justify-center rounded-2xl border px-3 text-center shadow-sm transition-all ${
              TONE[node.tone || 'kernel']
            } ${selected || inPath ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${
              dim ? 'opacity-35' : 'opacity-100'
            }`}
            style={{
              left: `${(node.x / diagram.width) * 100}%`,
              top: `${(node.y / diagram.height) * 100}%`,
              width: `${(node.w / diagram.width) * 100}%`,
              height: `${(node.h / diagram.height) * 100}%`,
            }}
          >
            {node.step != null && (
              <span className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {node.step}
              </span>
            )}
            <span className="text-[13px] font-semibold leading-tight sm:text-sm">{node.label}</span>
            {node.sub && (
              <span className="mt-1 max-w-[95%] text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                {node.sub}
              </span>
            )}
          </button>
        )
      })}

      <style>{`
        @keyframes rg-flow {
          to { stroke-dashoffset: -34; }
        }
        .rg-edge-live {
          animation: rg-flow 0.9s linear infinite;
        }
      `}</style>
    </div>
  )
}
