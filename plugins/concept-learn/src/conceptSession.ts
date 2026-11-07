import type { ConceptData } from './types';

/** Live concept open in the editor - preferred over disk for tutor tools. */
export type ConceptSession = {
  documentId: string;
  title?: string;
  data: ConceptData;
};

let live: ConceptSession | null = null;

export function bindConceptSession(session: ConceptSession): void {
  live = session;
}

export function touchConceptSession(data: ConceptData): void {
  if (!live) return;
  live = { ...live, data };
}

export function unbindConceptSession(documentId: string): void {
  if (live?.documentId === documentId) live = null;
}

export function getConceptSession(): ConceptSession | null {
  return live;
}
