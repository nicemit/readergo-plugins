'use client';

import React, { useEffect } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import { GraphEditor } from './editor/GraphEditor';
import { parseGraphDocumentData, shouldHydrateGraphEngine } from './graphDocumentUtils';
import { useGraphEngine } from './hooks/useGraphEngine';

type NoteWithData = NonNullable<EditorProps['currentNote']> & { data?: unknown };

export function GraphDocumentEditor(props: EditorProps) {
  const { currentNote, context } = props as EditorProps & { context?: unknown };
  const engine = useGraphEngine((currentNote as NoteWithData | null | undefined) ?? null);

  useEffect(() => {
    if (!engine || !currentNote?.id) return;
    const note = currentNote as NoteWithData;
    if (!note.data) return;

    const engineState = engine.getState();
    const docData = parseGraphDocumentData(note.data);
    if (shouldHydrateGraphEngine(engineState, docData)) {
      engine.actions.replaceState({
        nodes: docData.nodes ?? [],
        edges: docData.edges ?? [],
      }, { markDirty: false });
    }
  }, [(currentNote as NoteWithData | null | undefined)?.data, currentNote?.id, engine]);

  if (!currentNote?.id || !engine) {
    return null;
  }

  return <GraphEditor key={currentNote.id} engine={engine} context={context} {...props} />;
}
