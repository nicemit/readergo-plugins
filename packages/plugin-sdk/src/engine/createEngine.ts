import { Action, ActionMap, CommittedState, Phase1Engine, PluginEngine } from './types';

type LegacyEngineConfig<State, Actions> = {
  initialState: State;
  actions: (
    set: (updater: (state: State) => State) => void,
    get: () => State,
    updateVolatile?: (interaction: string | null, data: any) => void
  ) => Actions;
};

export function createEngine<State>(
  initialState: State,
  actionMap: ActionMap<State>
): Phase1Engine<State>;
export function createEngine<State, Actions>(
  config: LegacyEngineConfig<State, Actions>
): PluginEngine<State, Actions>;
export function createEngine<State, Actions>(
  initialStateOrConfig: State | LegacyEngineConfig<State, Actions>,
  maybeActionMap?: ActionMap<State>
): Phase1Engine<State> | PluginEngine<State, Actions> {
  const isLegacyConfig =
    typeof initialStateOrConfig === 'object' &&
    initialStateOrConfig !== null &&
    'initialState' in initialStateOrConfig &&
    'actions' in initialStateOrConfig;

  const initialState = isLegacyConfig
    ? initialStateOrConfig.initialState
    : (initialStateOrConfig as State);
  const actionMap = isLegacyConfig ? ({} as ActionMap<State>) : (maybeActionMap ?? {});

  let committedState: CommittedState<State> = {
    data: initialState,
    version: 0,
    source: 'local',
    updatedAt: Date.now(),
  };

  const listeners = new Set<(state: State) => void>();
  let isDisposed = false;

  const getState = () => committedState.data;
  const getCommittedState = () => committedState;

  const commit = (nextData: State) => {
    committedState = {
      data: nextData,
      version: committedState.version + 1,
      source: 'local',
      updatedAt: Date.now(),
    };
    listeners.forEach((listener) => listener(committedState.data));
  };

  const apply = (action: Action) => {
    if (isDisposed) return;
    const handler = actionMap[action.type];
    if (!handler) return;
    const nextData = handler(committedState.data, action.payload);
    commit(nextData);
  };

  if (!isLegacyConfig) {
    return {
      getState,
      getCommittedState,
      apply,
    };
  }

  const set = (updater: (state: State) => State) => {
    if (isDisposed) return;
    commit(updater(committedState.data));
  };

  const actions = initialStateOrConfig.actions(set, getState, () => {});

  return {
    getState,
    getCommittedState,
    apply,
    subscribe: (listener) => {
      if (isDisposed) return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions,
    dispose: () => {
      isDisposed = true;
      listeners.clear();
    },
  };
}
