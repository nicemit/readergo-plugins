'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import {
  createGrid,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  type SpreadsheetData,
  type SpreadsheetDocumentData,
} from './core/SpreadsheetEngine';
import { SimpleSpreadsheetEditor } from './editor/SimpleSpreadsheetEditor';
import { useSpreadsheetEngine } from './hooks/useSpreadsheetEngine';

type NoteWithData = NonNullable<EditorProps['currentNote']> & { data?: unknown };

function gridFromDocumentData(raw: unknown): SpreadsheetData {
  if (!raw || typeof raw !== 'object') {
    return createGrid(DEFAULT_ROWS, DEFAULT_COLS);
  }
  const grid = (raw as SpreadsheetDocumentData).grid;
  if (Array.isArray(grid) && grid.length > 0 && Array.isArray(grid[0])) {
    return grid as SpreadsheetData;
  }
  return createGrid(DEFAULT_ROWS, DEFAULT_COLS);
}

export function SpreadsheetDocumentEditor(props: EditorProps) {
  const { currentNote } = props;
  const note = currentNote as NoteWithData | null | undefined;
  const engine = useSpreadsheetEngine(note ?? null);

  const docGrid = useMemo(
    () => gridFromDocumentData(note?.data),
    [note?.data],
  );
  const docSnapshot = useMemo(() => JSON.stringify(docGrid), [docGrid]);
  const lastHydratedRef = useRef<string | null>(null);
  const lastNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!note?.id) return;
    const isNoteSwitch = lastNoteIdRef.current !== note.id;
    const currentGrid = (engine.getState?.().data ?? []) as SpreadsheetData;
    const engineSnapshot = JSON.stringify(currentGrid);

    // Always hydrate when switching documents.
    if (isNoteSwitch) {
      lastNoteIdRef.current = note.id;
      lastHydratedRef.current = docSnapshot;
      engine.actions.replaceData(docGrid);
      return;
    }

    // No-op when host snapshot already applied.
    if (lastHydratedRef.current === docSnapshot) return;

    // Protect active local edits from being overwritten by stale host snapshots.
    const isEngineDirty = Boolean(engine.getState?.().isDirty);
    if (isEngineDirty && docSnapshot !== engineSnapshot) return;

    if (docSnapshot !== engineSnapshot) {
      engine.actions.replaceData(docGrid);
    }
    lastHydratedRef.current = docSnapshot;
  }, [note?.id, docGrid, docSnapshot, engine]);

  if (!note?.id) {
    return null;
  }

  return <SimpleSpreadsheetEditor {...props} engine={engine} />;
}
