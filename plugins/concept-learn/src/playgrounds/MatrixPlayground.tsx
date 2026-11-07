import type { MatrixPlayground } from '../types';

export function MatrixPlaygroundView({
  value,
  onChange,
  onComplete,
}: {
  value: MatrixPlayground;
  onChange: (next: MatrixPlayground) => void;
  onComplete: () => void;
}) {
  const selectedRow = value.state?.selectedRow;
  const selectedCol = value.state?.selectedCol;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Tap a cell. Payoffs are (row player, column player).
      </p>
      {value.hint ? (
        <p className="text-xs text-muted-foreground">{value.hint}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-border p-2" />
              {value.colLabels.map((label) => (
                <th key={label} className="border border-border p-2 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.rowLabels.map((rowLabel, r) => (
              <tr key={rowLabel}>
                <th className="border border-border p-2 text-left font-medium">
                  {rowLabel}
                </th>
                {value.payoffs[r]?.map((cell, c) => {
                  const selected = selectedRow === r && selectedCol === c;
                  return (
                    <td key={`${r}-${c}`} className="border border-border p-0">
                      <button
                        type="button"
                        className={`block w-full px-3 py-3 text-center ${
                          selected ? 'bg-primary/15 font-semibold' : 'hover:bg-muted/50'
                        }`}
                        onClick={() =>
                          onChange({
                            ...value,
                            state: { ...value.state, selectedRow: r, selectedCol: c },
                          })
                        }
                      >
                        {cell}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedRow != null && selectedCol != null ? (
        <button
          type="button"
          className="self-start text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={onComplete}
        >
          Mark node done
        </button>
      ) : null}
    </div>
  );
}
