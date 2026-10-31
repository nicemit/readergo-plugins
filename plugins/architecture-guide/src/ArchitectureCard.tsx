'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'

const STEPS = ['UI', 'Command', 'Capability', 'Provider', 'Storage']

export function ArchitectureCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">How ReaderGo works</p>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
        Watch a flow build: Create a spreadsheet, open a note, save, chat, install. One box at a time.
      </p>
      <div className="mt-3 flex items-center gap-1">
        {STEPS.map((step, index) => (
          <React.Fragment key={step}>
            {index > 0 && <span className="h-px flex-1 bg-border" aria-hidden />}
            <span className="rounded-md border border-border bg-muted/60 px-1.5 py-1 text-[10px] font-semibold">
              {step}
            </span>
          </React.Fragment>
        ))}
      </div>
    </button>
  )
}
