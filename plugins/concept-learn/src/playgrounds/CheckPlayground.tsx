import type { CheckPlayground } from '../types';

export function CheckPlaygroundView({
  value,
  onChange,
  onComplete,
}: {
  value: CheckPlayground;
  onChange: (next: CheckPlayground) => void;
  onComplete: () => void;
}) {
  const answers = value.state?.answers || {};
  const allAnswered = value.questions.every((q) => answers[q.id] != null);
  const allCorrect = value.questions.every(
    (q) => answers[q.id] === q.correctIndex,
  );

  return (
    <div className="flex flex-col gap-4">
      {value.questions.map((q) => {
        const picked = answers[q.id];
        return (
          <div key={q.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium">{q.prompt}</p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((opt, idx) => {
                const selected = picked === idx;
                const showResult = picked != null;
                const isCorrect = idx === q.correctIndex;
                return (
                  <button
                    key={`${q.id}-${idx}`}
                    type="button"
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      selected
                        ? isCorrect
                          ? 'border-emerald-600 bg-emerald-500/10'
                          : 'border-destructive bg-destructive/10'
                        : showResult && isCorrect
                          ? 'border-emerald-600/50'
                          : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() =>
                      onChange({
                        ...value,
                        state: {
                          answers: { ...answers, [q.id]: idx },
                        },
                      })
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {picked != null ? (
              <p className="text-xs text-muted-foreground">{q.explanation}</p>
            ) : null}
          </div>
        );
      })}
      {allAnswered ? (
        <button
          type="button"
          className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={onComplete}
        >
          {allCorrect ? 'Mark node done' : 'Mark done anyway'}
        </button>
      ) : null}
    </div>
  );
}
