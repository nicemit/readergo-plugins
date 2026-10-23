'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { EditorProps } from '@readergo/plugin-sdk';
import { SpreadsheetCapability } from '../index';
import { useEngine } from '@readergo/plugin-sdk';
import {
    SpreadsheetState,
    createSpreadsheetEngine,
    type SpreadsheetDocumentData,
} from '../core/SpreadsheetEngine';
import { useSpreadsheetInteractions } from '../hooks/useSpreadsheetInteractions';

type SpreadsheetEngineRef = ReturnType<typeof createSpreadsheetEngine>;

export function SimpleSpreadsheetEditor({
    engine,
    onDataChange,
    onSave,
    onUnsavedChangesChange,
    className = '',
    currentNote,
    context,
}: EditorProps & { engine: SpreadsheetEngineRef }) {
    const state = useEngine(engine) as SpreadsheetState;
    const {
        contextMenu,
        handleFocus,
        handleContextMenu,
        dispatchMenuAction: dispatchMenuEvent
    } = useSpreadsheetInteractions(engine);

    useEffect(() => {
        if (onUnsavedChangesChange) {
            onUnsavedChangesChange(state.isDirty);
        }
    }, [state.isDirty, onUnsavedChangesChange]);

    const lastGridJsonRef = useRef('');
    useEffect(() => {
        lastGridJsonRef.current = '';
    }, [currentNote?.id]);

    useEffect(() => {
        if (!state.isDirty) return;
        const payload: SpreadsheetDocumentData = { grid: state.data };
        const json = JSON.stringify(payload);
        if (json === lastGridJsonRef.current) return;
        lastGridJsonRef.current = json;
        onDataChange?.(payload);
    }, [state.data, state.isDirty, onDataChange]);

    const capability = useMemo<SpreadsheetCapability>(() => ({
        addRowAbove: () => engine.actions.addRowAbove(),
        addRowBelow: () => engine.actions.addRowBelow(),
        deleteRow: () => engine.actions.deleteRow(),
        addColumnLeft: () => engine.actions.addColumnLeft(),
        addColumnRight: () => engine.actions.addColumnRight(),
        deleteColumn: () => engine.actions.deleteColumn(),
        clearCell: () => engine.actions.clearCell(),
        exportCSV: () => {
            console.log('Export CSV not fully implemented yet');
        }
    }), [engine]);

    useEffect(() => {
        if (!context || !engine || !currentNote?.id) return;

        const instanceId = `spreadsheet-${currentNote.id}`;
        const cleanup = context.registerEditorCapability?.(instanceId, capability);
        context.setActiveEditor?.(instanceId);
        return () => {
            cleanup?.();
        };
    }, [context, engine, currentNote?.id, capability]);

    const handleSave = () => {
        const payload: SpreadsheetDocumentData = { grid: state.data };
        onDataChange?.(payload);
        onSave?.('');
        engine.actions.setDirty(false);
    };

    const data = state.data;
    const activeCellState = state.activeCell;

    return (
        <div className={`p-4 md:p-8 overflow-auto ${className} bg-slate-50/50 dark:bg-slate-900/50 h-full flex flex-col items-center`}>
            <div className="w-full max-w-6xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="border-collapse w-full text-left">
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="w-12 h-8 border-b border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 sticky left-0 z-30 select-none"></th>
                                {data[0]?.map((_, colIndex) => (
                                    <th
                                        key={colIndex}
                                        className={`min-w-[140px] h-8 border-b border-r border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 text-center select-none transition-colors ${activeCellState?.col === colIndex ? 'bg-blue-100/50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : ''}`}
                                    >
                                        {String.fromCharCode(65 + colIndex)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="group">
                                    <td className={`w-12 h-8 border-b border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-center text-xs text-slate-400 font-mono sticky left-0 z-10 select-none transition-colors ${activeCellState?.row === rowIndex ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}`}>
                                        {rowIndex + 1}
                                    </td>
                                    {row.map((cell, colIndex) => {
                                        const isActive = activeCellState?.row === rowIndex && activeCellState?.col === colIndex;
                                        return (
                                            <td
                                                key={`${rowIndex}-${colIndex}`}
                                                className={`border-b border-r border-slate-200 dark:border-slate-700/50 p-0 h-8 relative transition-colors ${isActive ? 'bg-blue-50/30 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                            >
                                                {isActive && (
                                                    <div className="absolute inset-0 pointer-events-none ring-2 ring-blue-500 z-10 shadow-[0_0_0_1px_rgba(255,255,255,1)] dark:shadow-[0_0_0_1px_rgba(15,23,42,1)]" />
                                                )}
                                                <input
                                                    type="text"
                                                    value={state.data[rowIndex]?.[colIndex] ?? ''}
                                                    onFocus={() => handleFocus(rowIndex, colIndex)}
                                                    onChange={(e) => {
                                                        engine.actions.updateCell(rowIndex, colIndex, e.target.value);
                                                    }}
                                                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                                                    className="w-full h-full px-3 py-1.5 border-none outline-none bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-700 z-0 relative"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Minimal floating save button since toolbar is external */}
            <button
                onClick={handleSave}
                className="fixed bottom-6 right-6 px-4 py-2 bg-blue-600 shadow-lg text-white font-medium rounded-full hover:bg-blue-700 active:scale-95 transition-all text-sm flex items-center gap-2 z-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save Data
            </button>

            {/* Right-click Context Menu mapped to body to break out of all CSS offset contexts */}
            {contextMenu && typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed z-50 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[160px] text-sm overflow-hidden"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <button onClick={() => dispatchMenuEvent('add-row-above')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Insert Row Above</button>
                    <button onClick={() => dispatchMenuEvent('add-row-below')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Insert Row Below</button>
                    <button onClick={() => dispatchMenuEvent('delete-row')} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">Delete Row</button>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => dispatchMenuEvent('add-col-left')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Insert Column Left</button>
                    <button onClick={() => dispatchMenuEvent('add-col-right')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Insert Column Right</button>
                    <button onClick={() => dispatchMenuEvent('delete-col')} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">Delete Column</button>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                    <button onClick={() => dispatchMenuEvent('clear-cell')} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Clear Cell</button>
                </div>,
                document.body
            )}
        </div>
    );
}
