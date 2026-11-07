import type { TimelinePlayground } from '../types';

export function TimelinePlaygroundView({
  value,
  onChange,
  onComplete,
}: {
  value: TimelinePlayground;
  onChange: (next: TimelinePlayground) => void;
  onComplete: () => void;
}) {
  const selected =
    value.events.find((e) => e.id === value.state?.selectedId) || value.events[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {value.events.map((event) => {
          const active = selected?.id === event.id;
          return (
            <button
              key={event.id}
              type="button"
              className={`shrink-0 rounded-md border px-3 py-2 text-left text-xs ${
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() =>
                onChange({
                  ...value,
                  state: { ...value.state, selectedId: event.id },
                })
              }
            >
              <div className="font-semibold">{event.year}</div>
              <div className="max-w-[9rem] truncate">{event.title}</div>
            </button>
          );
        })}
      </div>
      {selected ? (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <div className="font-medium">
            {selected.year} - {selected.title}
          </div>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            {selected.blurb}
          </p>
          <button
            type="button"
            className="mt-3 text-xs font-medium text-primary underline-offset-2 hover:underline"
            onClick={onComplete}
          >
            Mark node done
          </button>
        </div>
      ) : null}
    </div>
  );
}
