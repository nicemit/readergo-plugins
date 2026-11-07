import { Check, ChevronLeft, ChevronRight, ListTree } from 'lucide-react';
import type { ConceptData } from './types';

export function MapRail({
  data,
  collapsed,
  onToggleCollapsed,
  onSelect,
}: {
  data: ConceptData;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (nodeId: string) => void;
}) {
  const done = new Set(data.progress.completedNodeIds);

  if (collapsed) {
    return (
      <aside className="flex h-full min-h-0 w-10 shrink-0 flex-col items-center border-r border-border bg-background py-2">
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onToggleCollapsed}
          aria-label="Expand map"
          title="Expand map"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <ListTree className="mt-3 h-4 w-4 text-muted-foreground" />
        <span className="mt-2 text-[10px] text-muted-foreground">
          {data.progress.completedNodeIds.length}/{data.map.nodes.length}
        </span>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-[13.5rem] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-2">
        <div className="min-w-0">
          <div className="text-xs font-medium">Map</div>
          <div className="text-[10px] text-muted-foreground">
            {data.progress.completedNodeIds.length}/{data.map.nodes.length} done
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onToggleCollapsed}
          aria-label="Collapse map"
          title="Collapse map"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {data.map.nodes.map((node, index) => {
          const active = data.activeNodeId === node.id;
          const isDone = done.has(node.id) || node.status === 'done';
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node.id)}
              className={`flex w-full items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:bg-muted/50'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isDone
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : active
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-xs font-medium leading-snug">
                  {node.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/** @deprecated use MapRail */
export const MapStrip = MapRail;
