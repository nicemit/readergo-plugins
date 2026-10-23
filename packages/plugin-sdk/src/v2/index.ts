import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import { createEngine } from '../engine/createEngine';
import type { Phase1Engine } from '../engine/types';
export { definePlugin } from './definePlugin';
export type {
  PluginActionDef,
  PluginActionFn,
  PluginActionValue,
  PluginActionsMap,
  V2PluginDefinition,
} from './definePlugin';
export { isActionDef } from './definePlugin';

export {
  PluginRuntimeProvider,
  pluginActionsToActionMap,
  useHistory,
  usePlugin,
  usePluginHost,
} from './runtime';

export { createEngine };
export type {
  Action,
  ActionMap,
  ActionHandler,
  CommittedState,
  Phase1Engine,
} from '../engine/types';

/**
 * Volatile state lives outside React state so pointer-move can run at 60fps
 * without triggering reconciliation.
 */
export type VolatileState = {
  activeInteraction: 'dragging' | null;
  nodeId?: string;
  startX?: number;
  startY?: number;
  currentX?: number;
  currentY?: number;
};

type CommitContext = {
  id: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type UseInteractionOptions = {
  onCommit: (ctx: CommitContext) => void;
  /** Live world (canvas) position while dragging; clear with null on pointer-up after commit. */
  onDragWorldPosition?: (live: { id: string; x: number; y: number } | null) => void;
};

export function useInteraction<TState>(_engine: Phase1Engine<TState>, options: UseInteractionOptions) {
  const volatileRef = useRef<VolatileState>({ activeInteraction: null });
  const draggingElementRef = useRef<HTMLElement | null>(null);
  const draggingBaseRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const flushDrag = useCallback(() => {
    rafRef.current = null;
    const volatile = volatileRef.current;
    if (volatile.activeInteraction !== 'dragging' || !volatile.nodeId) return;

    const element = draggingElementRef.current;
    const base = draggingBaseRef.current;
    if (!element || !base) return;

    const dx = (volatile.currentX ?? volatile.startX ?? 0) - (volatile.startX ?? 0);
    const dy = (volatile.currentY ?? volatile.startY ?? 0) - (volatile.startY ?? 0);
    const scaleRaw = Number(element.dataset.scale ?? 1);
    const scale = Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw : 1;
    // World-space deltas: viewport zoom is applied only on the canvas container.
    const wx = base.x + dx / scale;
    const wy = base.y + dy / scale;
    element.style.left = `${wx}px`;
    element.style.top = `${wy}px`;
    element.style.transform = '';
    optionsRef.current.onDragWorldPosition?.({ id: volatile.nodeId, x: wx, y: wy });
  }, []);

  const onWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      const volatile = volatileRef.current;
      if (volatile.activeInteraction !== 'dragging') return;

      // Interaction flow: pointer move updates volatile coordinates only.
      volatile.currentX = event.clientX;
      volatile.currentY = event.clientY;

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(flushDrag);
      }
    },
    [flushDrag]
  );

  const endDragging = useCallback(() => {
    const volatile = volatileRef.current;
    if (volatile.activeInteraction !== 'dragging' || !volatile.nodeId) return;

    const startX = volatile.startX ?? 0;
    const startY = volatile.startY ?? 0;
    const currentX = volatile.currentX ?? startX;
    const currentY = volatile.currentY ?? startY;

    // Commit boundary: pointerup computes final drag context, then delegates commit.
    optionsRef.current.onCommit({
      id: volatile.nodeId,
      startX,
      startY,
      currentX,
      currentY,
    });
    optionsRef.current.onDragWorldPosition?.(null);

    draggingElementRef.current = null;
    draggingBaseRef.current = null;
    volatileRef.current = { activeInteraction: null };
  }, []);

  const onWindowPointerUp = useCallback(() => {
    // Commit boundary: release ends interaction and writes to committed state once.
    endDragging();
  }, [endDragging]);

  useEffect(() => {
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [onWindowPointerMove, onWindowPointerUp]);

  const getNodeHandlers = useCallback(
    (nodeId: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;

        // Read committed position from DOM dataset to avoid React state writes during drag.
        const element = event.currentTarget as HTMLElement;
        const baseX = Number(element.dataset.x);
        const baseY = Number(element.dataset.y);
        if (Number.isNaN(baseX) || Number.isNaN(baseY)) return;

        draggingElementRef.current = element;
        draggingBaseRef.current = { x: baseX, y: baseY };
        volatileRef.current = {
          activeInteraction: 'dragging',
          nodeId,
          startX: event.clientX,
          startY: event.clientY,
          currentX: event.clientX,
          currentY: event.clientY,
        };
      },
    }),
    []
  );

  return {
    getNodeHandlers,
    getInteractionState: () =>
      volatileRef.current.activeInteraction === 'dragging' ? 'dragging' : 'idle',
  };
}
