type Action = {
  type: string;
  payload: any;
};

type HistoryEntry = {
  action: Action;
  inverse: Action;
};

type EngineLike = {
  apply: (action: Action) => void;
};

export function createHistory(engine: EngineLike) {
  const past: HistoryEntry[] = [];
  const future: HistoryEntry[] = [];

  const push = (entry: HistoryEntry) => {
    past.push(entry);
    future.length = 0;
  };

  const undo = () => {
    const entry = past.pop();
    if (!entry) return;
    engine.apply(entry.inverse);
    future.push(entry);
  };

  const redo = () => {
    const entry = future.pop();
    if (!entry) return;
    engine.apply(entry.action);
    past.push(entry);
  };

  return {
    push,
    undo,
    redo,
  };
}

export type { Action as HistoryAction, HistoryEntry };
