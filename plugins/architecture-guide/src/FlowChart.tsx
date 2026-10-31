'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartTone, Diagram } from './diagrams'
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
  return Math.max(24, text.length * 5.5 + 14)
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
              'radial-gradient(circle, color-mix(in oklab, var(--border) 45%, transparent) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
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
                refX="8"
                refY="3.5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 3.5 L 0 7 z" className="fill-muted-foreground/70" />
              </marker>
              <marker
                id={`rg-arrow-live-${diagram.id}`}
                viewBox="0 0 10 7"
                refX="8"
                refY="3.5"
                markerWidth="6"
                markerHeight="6"
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
                    strokeWidth={live ? 1.8 : 1.25}
                    strokeDasharray={edge.dashed ? '5 5' : undefined}
                    markerEnd={`url(#${live ? `rg-arrow-live-${diagram.id}` : `rg-arrow-${diagram.id}`})`}
                    className={`rg-arrive ${live ? 'stroke-primary' : 'stroke-muted-foreground/40'}`}
                  />
                  {edge.label && (
                    <g>
                      <rect
                        x={edge.labelX - chip / 2}
                        y={edge.labelY - 8}
                        width={chip}
                        height={16}
                        rx={8}
                        className={
                          live
                            ? 'fill-background stroke-primary/50'
                            : 'fill-muted/80 stroke-border/70'
                        }
                        strokeWidth={1}
                      />
                      <text
                        x={edge.labelX}
                        y={edge.labelY + 3}
                        textAnchor="middle"
                        className={live ? 'fill-primary' : 'fill-muted-foreground'}
                        fontSize={9}
                        fontWeight={600}
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
                className={`rg-arrive absolute flex flex-col justify-center overflow-hidden rounded-2xl border px-4 py-3 text-left shadow-sm transition-[left,top,width,height] duration-300 ${
                  TONE[tone]
                } ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.w,
                  height: box.h,
                }}
              >
                <span className={`absolute inset-y-3 left-2 w-1 rounded-full ${BAR[tone]}`} />
                <span className="flex items-center gap-2 pl-2.5">
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
                  <span className="line-clamp-1 text-[13px] font-semibold leading-tight sm:text-sm">
                    {node.label}
                  </span>
                </span>
                {node.sub && (
                  <span className="mt-1.5 line-clamp-2 pl-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    {node.sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes rg-arrive {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
        .rg-arrive {
          animation: rg-arrive 0.4s ease-out both;
        }
        .rg-edge-live {
          stroke-width: 1.8;
        }
      `}</style>
    </div>
  )
}
