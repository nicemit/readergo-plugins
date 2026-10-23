import { useState, useEffect, useRef } from 'react';
import type { PluginEngine } from './types';

export function useEngine<State, Actions>(engine: PluginEngine<State, Actions>): State {
  const stateRef = useRef<State>(engine.getState());
  const [, setVersion] = useState(0);

  useEffect(() => {
    stateRef.current = engine.getState();
    const unsubscribe = engine.subscribe((newState) => {
      stateRef.current = newState;
      // Always bump a version so React re-renders even if a plugin emits
      // the same object reference after mutating nested structures.
      setVersion((v) => v + 1);
    });

    setVersion((v) => v + 1);

    return () => {
      unsubscribe();
    };
  }, [engine]);

  return stateRef.current;
}
