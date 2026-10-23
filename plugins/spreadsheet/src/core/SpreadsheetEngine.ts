import { createEngine } from '@readergo/plugin-sdk';

export type SpreadsheetData = string[][];

/** Persisted shape for structured `note.data` (spreadsheet plugin). */
export type SpreadsheetDocumentData = { grid: SpreadsheetData };

export interface SpreadsheetState {
    data: SpreadsheetData;
    activeCell: { row: number; col: number } | null;
    isDirty: boolean;
    history: SpreadsheetData[];
    historyIndex: number;
}
export interface SpreadsheetActions {
    setActiveCell(row: number | null, col: number | null): void;
    updateCell(row: number, col: number, value: string): void;
    addRowAbove(): void;
    addRowBelow(): void;
    deleteRow(): void;
    addColumnLeft(): void;
    addColumnRight(): void;
    deleteColumn(): void;
    clearCell(): void;
    setDirty(isDirty: boolean): void;
    replaceData(data: SpreadsheetData): void;
    undo(): void;
    redo(): void;
}

export const DEFAULT_ROWS = 10;
export const DEFAULT_COLS = 5;

export const createGrid = (rows: number, cols: number): SpreadsheetData => {
    return Array(rows).fill(null).map(() => Array(cols).fill(''));
};

export const defaultSpreadsheetState: SpreadsheetState = {
    data: [],
    activeCell: null,
    isDirty: false,
    history: [],
    historyIndex: -1
};

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
const cloneGrid = (data: SpreadsheetData): SpreadsheetData => data.map((row) => [...row]);
const normalizeGrid = (data: SpreadsheetData): SpreadsheetData => {
    if (!Array.isArray(data) || data.length === 0) {
        return createGrid(DEFAULT_ROWS, DEFAULT_COLS);
    }
    const maxCols = Math.max(DEFAULT_COLS, ...data.map((row) => (Array.isArray(row) ? row.length : 0)));
    return data.map((row) => {
        const src = Array.isArray(row) ? row : [];
        const next = Array(maxCols).fill('');
        for (let i = 0; i < maxCols; i += 1) {
            next[i] = typeof src[i] === 'string' ? src[i] : (src[i] ?? '').toString();
        }
        return next;
    });
};

export function createSpreadsheetEngine(initialData: SpreadsheetData) {
    const initialGrid =
        initialData && initialData.length > 0
            ? normalizeGrid(initialData)
            : createGrid(DEFAULT_ROWS, DEFAULT_COLS);
    const state: SpreadsheetState = {
        ...defaultSpreadsheetState,
        data: initialGrid,
        history: [deepClone(initialGrid)],
        historyIndex: 0
    };

    return createEngine<SpreadsheetState, SpreadsheetActions>({
        initialState: state,
        actions: (set, get) => {
            const pushToHistory = (data: SpreadsheetData) => {
                const snapshot = deepClone(data);
                set(s => {
                    const currentHistory = s.history.slice(0, s.historyIndex + 1);
                    if (currentHistory.length >= 50) currentHistory.shift();
                    return {
                        ...s,
                        history: [...currentHistory, snapshot],
                        historyIndex: Math.min(s.historyIndex + 1, 49),
                        isDirty: true
                    };
                });
            };

            return {
                setActiveCell: (row: number | null, col: number | null) => {
                    set(s => ({
                        ...s,
                        activeCell: row !== null && col !== null ? { row, col } : null
                    }));
                },
                updateCell: (row: number, col: number, value: string) => {
                    const s = get();
                    if (!s.data[row] || s.data[row][col] === undefined) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn('[Spreadsheet] Ignored updateCell for invalid coordinates', { row, col });
                        }
                        return;
                    }
                    const newData = s.data.map((r) => [...r]);
                    newData[row][col] = value;
                    const snapshot = deepClone(newData);
                    set(prev => {
                        const currentHistory = prev.history.slice(0, prev.historyIndex + 1);
                        if (currentHistory.length >= 50) currentHistory.shift();
                        return {
                            ...prev,
                            data: newData,
                            history: [...currentHistory, snapshot],
                            historyIndex: Math.min(prev.historyIndex + 1, 49),
                            isDirty: true,
                        };
                    });
                },
                addRowAbove: () => {
                    const s = get();
                    const cols = s.data[0]?.length || DEFAULT_COLS;
                    const newData = cloneGrid(s.data);
                    const activeRow = s.activeCell?.row;
                    const insertIdx = activeRow !== undefined ? activeRow : 0;
                    newData.splice(insertIdx, 0, Array(cols).fill(''));
                    set(s => ({
                        ...s,
                        data: newData,
                        activeCell: s.activeCell && activeRow !== undefined ? { ...s.activeCell, row: s.activeCell.row + 1 } : s.activeCell
                    }));
                    pushToHistory(newData);
                },
                addRowBelow: () => {
                    const s = get();
                    const cols = s.data[0]?.length || DEFAULT_COLS;
                    const newData = cloneGrid(s.data);
                    const activeRow = s.activeCell?.row;
                    const insertIdx = activeRow !== undefined ? activeRow + 1 : newData.length;
                    newData.splice(insertIdx, 0, Array(cols).fill(''));
                    set(s => ({ ...s, data: newData }));
                    pushToHistory(newData);
                },
                deleteRow: () => {
                    const s = get();
                    if (s.data.length <= 1) return;
                    const targetRow = s.activeCell?.row ?? s.data.length - 1;
                    const newData = s.data.filter((_, i) => i !== targetRow);
                    
                    let newActiveCell = s.activeCell;
                    if (s.activeCell?.row === targetRow) {
                        newActiveCell = null;
                    } else if (s.activeCell && s.activeCell.row > targetRow) {
                        newActiveCell = { ...s.activeCell, row: s.activeCell.row - 1 };
                    }

                    set(s => ({
                        ...s,
                        data: newData,
                        activeCell: newActiveCell
                    }));
                    pushToHistory(newData);
                },
                addColumnLeft: () => {
                    const s = get();
                    const activeCol = s.activeCell?.col;
                    const insertIdx = activeCol !== undefined ? activeCol : 0;
                    const newData = cloneGrid(s.data).map(row => {
                        const newRow = [...row];
                        newRow.splice(insertIdx, 0, '');
                        return newRow;
                    });

                    set(s => ({
                        ...s,
                        data: newData,
                        activeCell: s.activeCell && activeCol !== undefined ? { ...s.activeCell, col: s.activeCell.col + 1 } : s.activeCell
                    }));
                    pushToHistory(newData);
                },
                addColumnRight: () => {
                    const s = get();
                    const activeCol = s.activeCell?.col;
                    const base = s.data.length > 0 ? s.data : createGrid(DEFAULT_ROWS, DEFAULT_COLS);
                    const clonedBase = cloneGrid(base);
                    const insertIdx = activeCol !== undefined ? activeCol + 1 : (clonedBase[0]?.length || DEFAULT_COLS);
                    const newData = clonedBase.map(row => {
                        const newRow = [...row];
                        newRow.splice(insertIdx, 0, '');
                        return newRow;
                    });

                    set(s => ({ ...s, data: newData }));
                    pushToHistory(newData);
                },
                deleteColumn: () => {
                    const s = get();
                    if ((s.data[0]?.length || 0) <= 1) return;
                    const targetCol = s.activeCell?.col ?? (s.data[0]?.length || 1) - 1;
                    const newData = cloneGrid(s.data).map(row => row.filter((_, i) => i !== targetCol));

                    let newActiveCell = s.activeCell;
                    if (s.activeCell?.col === targetCol) {
                        newActiveCell = null;
                    } else if (s.activeCell && s.activeCell.col > targetCol) {
                        newActiveCell = { ...s.activeCell, col: s.activeCell.col - 1 };
                    }

                    set(s => ({
                        ...s,
                        data: newData,
                        activeCell: newActiveCell
                    }));
                    pushToHistory(newData);
                },
                clearCell: () => {
                    const s = get();
                    if (s.activeCell) {
                        const { row, col } = s.activeCell;
                        const newData = cloneGrid(s.data);
                        newData[row][col] = '';
                        set(s => ({ ...s, data: newData }));
                        pushToHistory(newData);
                    }
                },
                setDirty: (isDirty: boolean) => {
                    set(s => ({ ...s, isDirty }));
                },
                /** Replace grid from host document (bridge hydration only). */
                replaceData: (data: SpreadsheetData) => {
                    const grid =
                        data && data.length > 0
                            ? normalizeGrid(deepClone(data))
                            : createGrid(DEFAULT_ROWS, DEFAULT_COLS);
                    set(() => ({
                        ...defaultSpreadsheetState,
                        data: grid,
                        history: [deepClone(grid)],
                        historyIndex: 0,
                        isDirty: false,
                        activeCell: null,
                    }));
                },
                undo: () => {
                    const s = get();
                    if (s.historyIndex > 0) {
                        const prevIndex = s.historyIndex - 1;
                        const prev = s.history[prevIndex];
                        set(s => ({
                            ...s,
                            data: deepClone(prev),
                            historyIndex: prevIndex
                        }));
                    }
                },
                redo: () => {
                    const s = get();
                    if (s.historyIndex < s.history.length - 1) {
                        const nextIndex = s.historyIndex + 1;
                        const next = s.history[nextIndex];
                        set(s => ({
                            ...s,
                            data: deepClone(next),
                            historyIndex: nextIndex
                        }));
                    }
                }
            };
        }
    });
}
