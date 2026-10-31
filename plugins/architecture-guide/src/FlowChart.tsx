'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartNode, ChartTone, Diagram } from './diagrams'
import { layoutGraph } from './layout'

const TONE: Record<ChartTone, string> = {
  ui: 'border-primary/40 bg-primary/10 text-foreground',
  kernel: 'border-border bg-card text-foreground',
  runtime: 'border-amber-500/40 bg-amber-500/10 text-foreground',
  data: 'border-sky-500/35 bg-sky-500/10 text-foreground',
  plugin: 'border-violet-500/40 bg-violet-500/10 text-foreground',
}

const BAR: Record<ChartTone, string> = {
  ui: 'bg-primary/70',
  kernel: 'bg-foreground/35',
  runtime: 'bg-amber-500/80',
  data: 'bg-sky-500/80',
  plugin: 'bg-violet-500/80',
}

function labelWidth(text: string) {
  return Math.max(28, text.length * 6.4 + 16)
}

export function FlowChart({
  diagram,
  selectedId,
  revealedIds,
  onSelect,
}: {
  diagram: Diagram
  selectedId: string | null
  revealedIds: string[]
  onSelect: (id: string) => void
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const apply = () => setWidth(el.clientWidth)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const revealed = useMemo(() => new Set(revealedIds), [revealedIds])
  const latestId = revealedIds[revealedIds.length - 1] || null
  const visibleNodes = useMemo(
    () => diagram.nodes.filter((node) => revealed.has(node.id)),
    [diagram.nodes, revealed],
  )
  const visibleEdges = useMemo(
    () =>
      diagram.edges.filter((edge) => revealed.has(edge.from) && revealed.has(edge.to)),
    [diagram.edges, revealed],
  )
  const byId = useMemo(() => {
    const map = new Map<string, ChartNode>()
    for (const node of diagram.nodes) map.set(node.id, node)
    return map
  }, [diagram.nodes])

  const layout = useMemo(
    () => layoutGraph(visibleNodes, visibleEdges, width || 720),
    [visibleNodes, visibleEdges, width],
  )
  const boxById = useMemo(() => {
    const map = new Map(layout.nodes.map((box) => [box.id, box]))
    return map
  }, [layout.nodes])

  return (
    <div ref={shellRef} className="relative w-full">
      {width > 0 && (
        <div
          className="relative w-full"
          style={{
            height: layout.height,
            backgroundImage:
              'radial-gradient(circle, color-mix(in oklab, var(--border) 70%, transparent) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="absolute inset-0 h-full w-full overflow-visible"
            preserveAspectRatio="xMinYMin meet"
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

            {layout.edges.map((edge) => {
              const live = edge.to === latestId || edge.from === latestId
              const chip = edge.label ? labelWidth(edge.label) : 0
              return (
                <g key={`${edge.from}->${edge.to}:${edge.label || ''}`}>
                  <path
                    d={edge.d}
                    fill="none"
                    strokeWidth={live ? 2.4 : 1.6}
                    strokeDasharray={edge.dashed ? '7 6' : live ? '10 7' : undefined}
                    markerEnd={`url(#${live ? `rg-arrow-live-${diagram.id}` : `rg-arrow-${diagram.id}`})`}
                    className={`rg-arrive ${live ? 'stroke-primary rg-edge-live' : 'stroke-muted-foreground/55'}`}
                  />
                  {edge.label && (
                    <g>
                      <rect
                        x={edge.labelX - chip / 2}
                        y={edge.labelY - 11}
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
                        x={edge.labelX}
                        y={edge.labelY + 3.5}
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

          {visibleNodes.map((node) => {
            const box = boxById.get(node.id)
            if (!box) return null
            const selected = selectedId === node.id || latestId === node.id
            const tone = node.tone || 'kernel'
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelect(node.id)}
                className={`rg-arrive absolute flex flex-col justify-center overflow-hidden rounded-2xl border pl-3.5 pr-3 text-left shadow-sm transition-[left,top,width,height] duration-300 ${
                  TONE[tone]
                } ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.w,
                  height: box.h,
                }}
              >
                <span className={`absolute inset-y-2 left-1.5 w-1 rounded-full ${BAR[tone]}`} />
                <span className="flex items-center gap-2 pl-1">
                  {node.step != null && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      {node.step}
                    </span>
                  )}
                  {node.lane && (
                    <span className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {node.lane}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 line-clamp-2 pl-1 text-[13px] font-semibold leading-tight sm:text-sm">
                  {node.label}
                </span>
                {node.sub && (
                  <span className="mt-0.5 line-clamp-2 pl-1 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                    {node.sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes rg-flow {
          to { stroke-dashoffset: -34; }
        }
        @keyframes rg-arrive {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
        .rg-arrive {
          animation: rg-arrive 0.4s ease-out both;
        }
        .rg-edge-live {
          animation: rg-flow 0.9s linear infinite;
        }
      `}</style>
    </div>
  )
}
