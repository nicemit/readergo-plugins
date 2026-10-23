/* eslint-disable @typescript-eslint/no-explicit-any -- payload typing matches engine ActionHandler */
import type { ComponentType } from 'react';

/** Plain engine reducer (backward compatible). */
export type PluginActionFn<TState> = (state: TState, payload: any) => TState;

/** Structured action: apply for engine; inverse for history (payload + pre-apply state). Return null/undefined to skip history entry. */
export type PluginActionDef<TState> = {
  apply: (state: TState, payload: any) => TState;
  inverse: (payload: any, prevState: TState) => any;
};

export type PluginActionValue<TState> = PluginActionFn<TState> | PluginActionDef<TState>;

export type PluginActionsMap<TState> = Record<string, PluginActionValue<TState>>;

export function isActionDef<TState>(v: PluginActionValue<TState>): v is PluginActionDef<TState> {
  return typeof v === 'object' && v !== null && 'apply' in v && 'inverse' in v;
}

export type V2PluginDefinition<TState, TActions extends PluginActionsMap<TState> = PluginActionsMap<TState>> = {
  id: string;
  initialState: TState;
  actions: TActions;
  render: ComponentType;
};

export function definePlugin<TState, TActions extends PluginActionsMap<TState>>(
  definition: V2PluginDefinition<TState, TActions>
): V2PluginDefinition<TState, TActions> {
  return definition;
}
