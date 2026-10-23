import { useRef } from 'react';
import { createGraphEngine } from '../core/GraphEngine';
import { parseGraphDocumentData } from '../graphDocumentUtils';

/**
 * Creates or returns the graph engine for the current note id.
 * Document hydration runs in {@link GraphDocumentEditor}, not here.
 */
export function useGraphEngine(
  currentNote: { id: string; data?: unknown } | null | undefined,
) {
  const engineRef = useRef<ReturnType<typeof createGraphEngine> | null>(null);

  if (!currentNote?.id) {
    return null;
  }

  if (!engineRef.current || (engineRef.current as any).__docId !== currentNote.id) {
    const parsed = parseGraphDocumentData(currentNote.data);
    engineRef.current = createGraphEngine(parsed);
    (engineRef.current as any).__docId = currentNote.id;
  }

  return engineRef.current;
}
