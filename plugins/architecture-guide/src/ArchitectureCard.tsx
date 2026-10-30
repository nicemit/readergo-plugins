'use client'

import React from 'react'
import { ArrowRight, Waypoints } from 'lucide-react'

export function ArchitectureCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Waypoints className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">How ReaderGo works</p>
            <p className="text-[11px] text-muted-foreground">Interactive architecture guide</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Click the shell, follow UI to storage, and see what happens when you open a note, send
        chat, or install a plugin.
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {['UI', 'Command', 'Capability', 'Provider', 'Storage'].map((step, index) => (
          <span key={step} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            {index > 0 && <span className="opacity-40">-</span>}
            <span className="rounded-md bg-muted px-1.5 py-0.5">{step}</span>
          </span>
        ))}
      </div>
    </button>
  )
}
