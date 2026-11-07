import type { ScenarioPlayground } from '../types';

export function ScenarioPlaygroundView({
  value,
  onChange,
  onComplete,
}: {
  value: ScenarioPlayground;
  onChange: (next: ScenarioPlayground) => void;
  onComplete: () => void;
}) {
  const chosen = value.choices.find((c) => c.id === value.state?.chosenId);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed">{value.prompt}</p>
      <div className="flex flex-col gap-2">
        {value.choices.map((choice) => {
          const selected = value.state?.chosenId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/60'
              }`}
              onClick={() =>
                onChange({ ...value, state: { ...value.state, chosenId: choice.id } })
              }
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      {chosen ? (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p>{chosen.outcome}</p>
          {chosen.reveals ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Concept: {chosen.reveals}
            </p>
          ) : null}
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
