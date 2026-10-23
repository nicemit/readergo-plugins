export type Action = {
  type: string;
  payload: any;
};

export interface CommittedState<T> {
  data: T;
  version: number;
  source: 'local' | 'remote';
  updatedAt: number;
}

export type ActionHandler<TState> = (state: TState, payload: any) => TState;
export type ActionMap<TState> = Record<string, ActionHandler<TState>>;

/** Phase 1 engine: committed state, synchronous apply. */
export interface Phase1Engine<TState> {
  getState(): TState;
  getCommittedState(): CommittedState<TState>;
  apply(action: Action): void;
}

/** Engine with imperative actions + subscribe (structured plugins). */
export type PluginEngine<State, Actions = unknown> = Phase1Engine<State> & {
  subscribe(listener: (state: State) => void): () => void;
  actions: Actions;
  dispose(): void;
};
