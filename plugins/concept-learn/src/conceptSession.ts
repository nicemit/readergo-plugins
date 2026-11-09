import type { ConceptData } from './types';

/** Live concept open in the editor - preferred over disk for tutor tools. */
export type ConceptSession = {
  documentId: string;
  title?: string;
  data: ConceptData;
  persist?: (data: ConceptData) => void;
};

let live: ConceptSession | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeConceptSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bindConceptSession(session: ConceptSession): void {
  live = session;
  emit();
}

export function touchConceptSession(data: ConceptData): void {
  if (!live) return;
  live = { ...live, data };
  emit();
}

export function persistConceptData(data: ConceptData): void {
  if (!live) return;
  const persist = live.persist;
  live = { ...live, data };
  persist?.(data);
  emit();
}

export function unbindConceptSession(documentId: string): void {
  if (live?.documentId === documentId) {
    live = null;
    emit();
  }
}

export function getConceptSession(): ConceptSession | null {
  return live;
}
