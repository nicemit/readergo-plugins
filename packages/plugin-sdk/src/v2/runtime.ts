/* eslint-disable @typescript-eslint/no-explicit-any -- dispatch payloads mirror engine Action.payload */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { createEngine } from '../engine/createEngine';
import type { Action, ActionMap, Phase1Engine } from '../engine/types';
import { createHistory } from '../state/history';
import { createHydrationManager, type HydrationUpdate } from '../state/hydration';
import type { PluginActionsMap, V2PluginDefinition } from './definePlugin';
import { isActionDef } from './definePlugin';

type InteractionState = 'idle' | 'dragging';
type InteractionStateGetter = () => InteractionState;

export function pluginActionsToActionMap<TState>(actions: PluginActionsMap<TState>): ActionMap<TState> {
  const map = {} as ActionMap<TState>;
  for (const type of Object.keys(actions)) {
    const v = actions[type]!;
    map[type] = isActionDef(v) ? (state, payload) => v.apply(state, payload) : v;
  }
  return map;
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

type DispatchMap<TActions extends PluginActionsMap<any>> = {
  [K in keyof TActions]: (payload: any) => void;
};

type Runtime<TState, TActions extends PluginActionsMap<TState>> = {
  engine: Phase1Engine<TState>;
  getState: () => TState;
  subscribe: (listener: (state: TState) => void) => () => void;
  actions: DispatchMap<TActions>;
  undo: () => void;
  redo: () => void;
  enqueueHydration: (update: HydrationUpdate<TState>) => void;
  processHydration: () => void;
  registerInteractionGetter: (getter: InteractionStateGetter) => void;
};

function createPluginRuntime<TState, TActions extends PluginActionsMap<TState>>(
  plugin: V2PluginDefinition<TState, TActions>
): Runtime<TState, TActions> {
  const engine = createEngine(plugin.initialState, pluginActionsToActionMap(plugin.actions));
  const history = createHistory(engine);
  const listeners = new Set<(state: TState) => void>();
  const interactionGetterRef = { current: (() => 'idle') as InteractionStateGetter };
  let latestHydrationVersion = engine.getCommittedState().version;

  const emit = () => {
    const state = engine.getState();
    listeners.forEach((listener) => listener(state));
  };

  const hydration = createHydrationManager<TState>({
    getInteractionState: () => interactionGetterRef.current(),
    getCurrentVersion: () => latestHydrationVersion,
    applyUpdate: (update) => {
      if (interactionGetterRef.current() === 'dragging') return;
      engine.apply({ type: 'HYDRATE_REPLACE', payload: update.data });
      latestHydrationVersion = update.version;
      emit();
    },
  });

  const actions = Object.keys(plugin.actions).reduce((acc, type) => {
    const def = plugin.actions[type]!;
    (acc as Record<string, (payload: any) => void>)[type] = (payload: any) => {
      const prevState = engine.getState();
      const action: Action = { type, payload };
      engine.apply(action);

      if (isActionDef(def)) {
        const inversePayload = def.inverse(payload, prevState);
        if (inversePayload != null) {
          history.push({
            action,
            inverse: { type, payload: inversePayload },
          });
        }
      }

      latestHydrationVersion = engine.getCommittedState().version;
      emit();
      hydration.process();
    };
    return acc;
  }, {} as DispatchMap<TActions>);

  return {
    engine,
    getState: () => engine.getState(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions,
    undo: () => {
      history.undo();
      latestHydrationVersion = engine.getCommittedState().version;
      emit();
    },
    redo: () => {
      history.redo();
      latestHydrationVersion = engine.getCommittedState().version;
      emit();
    },
    enqueueHydration: (update) => hydration.enqueue(update),
    processHydration: () => hydration.process(),
    registerInteractionGetter: (getter) => {
      interactionGetterRef.current = getter;
    },
  };
}

// Context erases plugin generics; hooks cast after useContext (same pattern as React context).
const PluginRuntimeContext = createContext<Runtime<any, any> | null>(null);

export function PluginRuntimeProvider<TState, TActions extends PluginActionsMap<TState>>({
  plugin,
  children,
}: {
  plugin: V2PluginDefinition<TState, TActions>;
  children?: ReactNode;
}) {
  const runtime = useMemo(() => createPluginRuntime(plugin), [plugin]);
  return createElement(PluginRuntimeContext.Provider, { value: runtime }, children);
}

export function usePlugin<TState, TActions extends PluginActionsMap<TState>>(): {
  state: TState;
  actions: DispatchMap<TActions>;
};

export function usePlugin<TState, TActions extends PluginActionsMap<TState>, TSelected>(
  selector: (state: TState) => TSelected
): {
  state: TSelected;
  actions: DispatchMap<TActions>;
};

export function usePlugin<TState, TActions extends PluginActionsMap<TState>, TSelected = TState>(
  selector?: (state: TState) => TSelected
): {
  state: TSelected;
  actions: DispatchMap<TActions>;
} {
  const runtime = useContext(PluginRuntimeContext) as Runtime<TState, TActions> | null;
  if (!runtime) {
    throw new Error('usePlugin must be used inside PluginRuntimeProvider');
  }

  const selectedRef = useRef<TSelected | undefined>(undefined);
  const selectorRef = useRef<typeof selector>(selector);
  selectorRef.current = selector;

  const [state, setState] = useState<TSelected>(() => {
    const s = runtime.getState();
    if (selector) {
      const sel = selector(s) as TSelected;
      selectedRef.current = sel;
      return sel;
    }
    selectedRef.current = s as unknown as TSelected;
    return s as unknown as TSelected;
  });

  useEffect(() => {
    const initial = runtime.getState();
    if (selectorRef.current) {
      selectedRef.current = selectorRef.current(initial) as TSelected;
      setState(selectedRef.current);
    } else {
      selectedRef.current = initial as unknown as TSelected;
      setState(initial as unknown as TSelected);
    }

    return runtime.subscribe((next) => {
      const sel = selectorRef.current;
      if (!sel) {
        selectedRef.current = next as unknown as TSelected;
        setState(next as unknown as TSelected);
        return;
      }
      const nextSelected = sel(next) as TSelected;
      if (!shallowEqual(nextSelected, selectedRef.current)) {
        selectedRef.current = nextSelected;
        setState(nextSelected);
      }
    });
  }, [runtime]);

  return {
    state,
    actions: runtime.actions,
  };
}

export function useHistory<TState, TActions extends PluginActionsMap<TState>>() {
  const runtime = useContext(PluginRuntimeContext) as Runtime<TState, TActions> | null;
  if (!runtime) {
    throw new Error('useHistory must be used inside PluginRuntimeProvider');
  }
  return {
    undo: runtime.undo,
    redo: runtime.redo,
  };
}

export function usePluginHost<TState, TActions extends PluginActionsMap<TState>>() {
  const runtime = useContext(PluginRuntimeContext) as Runtime<TState, TActions> | null;
  if (!runtime) {
    throw new Error('usePluginHost must be used inside PluginRuntimeProvider');
  }
  return {
    engine: runtime.engine,
    enqueueHydration: runtime.enqueueHydration,
    processHydration: runtime.processHydration,
    registerInteractionGetter: runtime.registerInteractionGetter,
  };
}
