import { useMemo } from 'react';
import { createSpreadsheetEngine, createGrid, DEFAULT_ROWS, DEFAULT_COLS } from '../core/SpreadsheetEngine';
import type { SpreadsheetData } from '../core/SpreadsheetEngine';

function initialGridFromNoteData(data: unknown): SpreadsheetData {
  if (!data || typeof data !== 'object') {
    return createGrid(DEFAULT_ROWS, DEFAULT_COLS);
  }
  const grid = (data as { grid?: unknown }).grid;
  if (Array.isArray(grid) && grid.length > 0 && Array.isArray(grid[0])) {
    return grid as SpreadsheetData;
  }
  return createGrid(DEFAULT_ROWS, DEFAULT_COLS);
}

export function useSpreadsheetEngine(
  currentNote: { id: string; data?: unknown } | null | undefined,
) {
  return useMemo(() => {
    const initial = currentNote
      ? initialGridFromNoteData(currentNote.data)
      : createGrid(DEFAULT_ROWS, DEFAULT_COLS);
    return createSpreadsheetEngine(initial);
  }, [currentNote?.id]);
}
