import type { ConceptData } from './types';

export function MapStrip({
  data,
  onSelect,
}: {
  data: ConceptData;
  onSelect: (nodeId: string) => void;
}) {
  const done = new Set(data.progress.completedNodeIds);

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto border-b border-border px-3 py-2">
      {data.map.nodes.map((node, index) => {
        const active = data.activeNodeId === node.id;
        const isDone = done.has(node.id) || node.status === 'done';
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={`flex min-w-[8.5rem] shrink-0 flex-col rounded-md border px-3 py-2 text-left transition-colors ${
              active
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/40'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {index + 1}
              {isDone ? ' · done' : ''}
            </span>
            <span className="mt-0.5 line-clamp-2 text-xs font-medium">
              {node.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
