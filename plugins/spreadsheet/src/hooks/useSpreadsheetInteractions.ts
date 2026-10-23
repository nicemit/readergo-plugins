import { useState, useEffect, useCallback } from 'react';
import type { SpreadsheetActions } from '../core/SpreadsheetEngine';

type SpreadsheetEngineRef = { actions: SpreadsheetActions };

export function useSpreadsheetInteractions(engine: SpreadsheetEngineRef) {
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);

    const handleFocus = useCallback((row: number, col: number) => {
        engine.actions.setActiveCell(row, col);
    }, [engine]);

    const handleContextMenu = useCallback((e: React.MouseEvent, row: number, col: number) => {
        e.preventDefault();
        engine.actions.setActiveCell(row, col);
        setContextMenu({ x: e.clientX, y: e.clientY, row, col });
    }, [engine]);

    const dispatchMenuAction = useCallback((action: string) => {
        switch(action) {
            case 'add-row-above': engine.actions.addRowAbove(); break;
            case 'add-row-below': engine.actions.addRowBelow(); break;
            case 'delete-row': engine.actions.deleteRow(); break;
            case 'add-col-left': engine.actions.addColumnLeft(); break;
            case 'add-col-right': engine.actions.addColumnRight(); break;
            case 'delete-col': engine.actions.deleteColumn(); break;
            case 'clear-cell': engine.actions.clearCell(); break;
        }
        setContextMenu(null);
    }, [engine]);

    // Close context menu on any global click
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return {
        contextMenu,
        setContextMenu,
        handleFocus,
        handleContextMenu,
        dispatchMenuAction
    };
}
