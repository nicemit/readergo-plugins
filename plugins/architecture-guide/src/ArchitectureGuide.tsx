'use client'

import React, { useCallback, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Box,
  Command,
  Database,
  FolderTree,
  Layers,
  LayoutDashboard,
  MessageSquare,
  MousePointerClick,
  Puzzle,
  Server,
  Sparkles,
  SquareDashedMousePointer,
} from 'lucide-react'
import {
  NODES,
  PIPELINE_STEPS,
  SCENES,
  STORIES,
  type GuideNode,
  type GuideScene,
} from './content'

const SCENE_ICONS: Record<GuideScene, React.ComponentType<{ className?: string }>> = {
  shell: LayoutDashboard,
  pipeline: Layers,
  documents: BookOpen,
  stories: MousePointerClick,
}

const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'activity-bar': SquareDashedMousePointer,
  sidebar: FolderTree,
  dashboard: LayoutDashboard,
  editor: BookOpen,
  'right-dock': MessageSquare,
  marketplace: Puzzle,
  host: Box,
  runtime: Server,
  plugins: Puzzle,
  ui: LayoutDashboard,
  command: Command,
  capability: Layers,
  provider: Sparkles,
  storage: Database,
  document: BookOpen,
  'content-vs-data': Layers,
  'editor-registry': Puzzle,
  space: FolderTree,
}

function NodeIcon({ id, className }: { id: string; className?: string }) {
  const Icon = NODE_ICONS[id] || Box
  return <Icon className={className} />
}

function DetailCard({
  node,
  onSelect,
}: {
  node: GuideNode | null
  onSelect: (id: string) => void
}) {
  if (!node) {
    return (
      <aside className="rounded-2xl border border-border/70 bg-card/60 p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Click anything</p>
        <p className="mt-2 leading-relaxed">
          Regions, pipeline boxes, and story hops all open the same inspector. Use it to learn
          what a piece is, when to reach for it, and what a click actually does.
        </p>
      </aside>
    )
  }

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-border/70 bg-card p-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {node.kind}
        </p>
        <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <NodeIcon id={node.id} className="h-4 w-4 text-primary" />
          {node.title}
        </h3>
      </div>
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          What it is
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed">{node.what}</p>
      </section>
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          When to use it
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed">{node.when}</p>
      </section>
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          What happens when you click
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed">{node.click}</p>
      </section>
      {node.related && node.related.length > 0 && (
        <section>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Related
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {node.related.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium hover:border-primary/50 hover:text-primary"
              >
                {NODES[id]?.title || id}
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}

function ShellMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const cell = (id: string, extra: string, label: string, sub: string) => {
    const selected = selectedId === id
    return (
      <button
        type="button"
        onClick={() => onSelect(id)}
        className={`flex min-h-0 flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${extra} ${
          selected
            ? 'border-primary bg-primary/10'
            : 'border-border/80 bg-background/70 hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        <NodeIcon id={id} className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        <div>
          <div className="text-xs font-semibold">{label}</div>
          <div className="text-[10px] text-muted-foreground">{sub}</div>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-red-400/80" />
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          <span className="ml-2">ReaderGo host</span>
        </div>
        <div className="grid h-[280px] grid-cols-[52px_minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,0.7fr)] grid-rows-2 gap-2">
          {cell('activity-bar', 'col-start-1 row-start-1 row-span-2', 'Bar', 'icons')}
          {cell('sidebar', 'col-start-2 row-start-1 row-span-2', 'Sidebar', 'folders')}
          {cell('dashboard', 'col-start-3 row-start-1', 'Dashboard', 'home + pins')}
          {cell('editor', 'col-start-3 row-start-2', 'Editor', 'resolved by type')}
          {cell('right-dock', 'col-start-4 row-start-1 row-span-2', 'Chat / dock', 'agent + panels')}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {cell('host', 'min-h-[72px]', 'Host', 'Next.js kernel')}
        {cell('runtime', 'min-h-[72px]', 'Local Runtime', 'port 28787')}
        {cell('marketplace', 'min-h-[72px]', 'Marketplace', 'catalog plugins')}
      </div>
    </div>
  )
}

function PipelineMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {PIPELINE_STEPS.map((id, index) => {
          const node = NODES[id]
          const selected = selectedId === id
          return (
            <React.Fragment key={id}>
              {index > 0 && (
                <div className="flex items-center justify-center text-muted-foreground">
                  <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onSelect(id)}
                className={`flex flex-1 flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <span className="text-[10px] font-mono text-muted-foreground">0{index + 1}</span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <NodeIcon id={id} className="h-4 w-4 text-primary" />
                  {node.title}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {node.what.slice(0, 90)}...
                </span>
              </button>
            </React.Fragment>
          )
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        This is the non-negotiable path. UI never talks to storage. Commands never import a
        provider class. Capabilities are named slots. Providers are swappable backends.
      </p>
    </div>
  )
}

function DocumentsMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const ids = ['document', 'content-vs-data', 'editor-registry', 'space', 'plugins']
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ids.map((id) => {
        const node = NODES[id]
        const selected = selectedId === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`rounded-2xl border p-4 text-left transition-all ${
              selected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <NodeIcon id={id} className="h-4 w-4 text-primary" />
              {node.title}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{node.what}</p>
          </button>
        )
      })}
    </div>
  )
}

function StoriesMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [storyId, setStoryId] = useState(STORIES[0]?.id || '')
  const [hopIndex, setHopIndex] = useState(0)
  const story = STORIES.find((item) => item.id === storyId) || STORIES[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {STORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setStoryId(item.id)
              setHopIndex(0)
              onSelect(item.hops[0]?.nodeId || '')
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              story.id === item.id
                ? 'border-primary bg-primary/15 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{story.prompt}</p>
      <ol className="space-y-2">
        {story.hops.map((hop, index) => {
          const active = hopIndex === index
          return (
            <li key={`${hop.nodeId}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  setHopIndex(index)
                  onSelect(hop.nodeId)
                }}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-mono">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{hop.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {hop.detail}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export function ArchitectureGuide() {
  const [scene, setScene] = useState<GuideScene>('shell')
  const [selectedId, setSelectedId] = useState<string | null>('activity-bar')
  const selected = selectedId ? NODES[selectedId] || null : null
  const sceneMeta = useMemo(() => SCENES.find((item) => item.id === scene), [scene])

  const onSelect = useCallback((id: string) => {
    if (NODES[id]) setSelectedId(id)
  }, [])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b border-border/80 px-5 py-4 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Architecture guide
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          How ReaderGo works
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A plugin-hosted document platform. Click the chrome, follow the pipeline, or walk a
          real click from UI to storage.
        </p>
      </header>

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/80 px-3 py-2 sm:px-8">
        {SCENES.map((item) => {
          const Icon = SCENE_ICONS[item.id]
          const active = scene === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setScene(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="min-h-0 overflow-y-auto pr-1">
          <p className="mb-3 text-xs text-muted-foreground">{sceneMeta?.hint}</p>
          {scene === 'shell' && <ShellMap selectedId={selectedId} onSelect={onSelect} />}
          {scene === 'pipeline' && <PipelineMap selectedId={selectedId} onSelect={onSelect} />}
          {scene === 'documents' && <DocumentsMap selectedId={selectedId} onSelect={onSelect} />}
          {scene === 'stories' && <StoriesMap selectedId={selectedId} onSelect={onSelect} />}
        </div>
        <DetailCard node={selected} onSelect={onSelect} />
      </div>
    </div>
  )
}
