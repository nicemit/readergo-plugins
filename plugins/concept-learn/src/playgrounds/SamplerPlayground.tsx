import type { SamplerPlayground } from '../types';

export function SamplerPlaygroundView({
  value,
  onChange,
  onComplete,
}: {
  value: SamplerPlayground;
  onChange: (next: SamplerPlayground) => void;
  onComplete: () => void;
}) {
  const trials = value.state?.trials ?? 0;
  const successes = value.state?.successes ?? 0;
  const rate = trials > 0 ? successes / trials : 0;

  const draw = (n: number) => {
    let nextTrials = trials;
    let nextSuccesses = successes;
    for (let i = 0; i < n; i++) {
      nextTrials += 1;
      if (Math.random() < value.probability) nextSuccesses += 1;
    }
    onChange({
      ...value,
      state: { trials: nextTrials, successes: nextSuccesses },
    });
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>
        {value.label}: true p = <strong>{value.probability}</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted/50"
          onClick={() => draw(1)}
        >
          Draw 1
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted/50"
          onClick={() => draw(value.trialsSuggested || 20)}
        >
          Draw {value.trialsSuggested || 20}
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted/50"
          onClick={() =>
            onChange({ ...value, state: { trials: 0, successes: 0 } })
          }
        >
          Reset
        </button>
      </div>
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div>
          Trials: {trials} · Successes: {successes}
        </div>
        <div className="mt-1">
          Observed rate: {trials > 0 ? rate.toFixed(3) : '-'}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, rate * 100)}%` }}
          />
        </div>
      </div>
      {trials >= (value.trialsSuggested || 20) ? (
        <button
          type="button"
          className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={onComplete}
        >
          Mark node done
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Draw at least {value.trialsSuggested || 20} trials, then mark done.
        </p>
      )}
    </div>
  );
}
