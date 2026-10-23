export type HydrationUpdate<T> = {
  data: T;
  version: number;
};

type InteractionState = 'idle' | 'dragging';

type HydrationManagerOptions<T> = {
  getInteractionState: () => InteractionState;
  getCurrentVersion: () => number;
  applyUpdate: (update: HydrationUpdate<T>) => void;
};

export function createHydrationManager<T>(options: HydrationManagerOptions<T>) {
  const queue: HydrationUpdate<T>[] = [];

  const tryApply = (update: HydrationUpdate<T>) => {
    if (update.version > options.getCurrentVersion()) {
      options.applyUpdate(update);
    }
  };

  const enqueue = (update: HydrationUpdate<T>) => {
    if (options.getInteractionState() === 'dragging') {
      queue.push(update);
      return;
    }
    tryApply(update);
  };

  const process = () => {
    if (options.getInteractionState() === 'dragging') return;
    while (queue.length > 0) {
      const update = queue.shift();
      if (!update) continue;
      tryApply(update);
    }
  };

  return {
    enqueue,
    process,
  };
}
