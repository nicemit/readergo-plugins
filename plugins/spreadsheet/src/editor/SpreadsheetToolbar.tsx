'use client';

import { EditorProps } from '@readergo/plugin-sdk';
import { executeCommand } from '@/lib/platform/actions';

export function SpreadsheetToolbar(props: EditorProps) {
    if (props.currentNote?.type !== 'spreadsheet' && props.currentNote?.type !== 'grid') {
        return null; // Only show this toolbar when a spreadsheet is active
    }

    const editorInstanceId = props.currentNote?.id ? `spreadsheet-${props.currentNote.id}` : undefined;
    const runCommand = (commandId: string) => {
        executeCommand(commandId, { editorInstanceId });
    };

    return (
        <div className="flex items-center gap-1.5 p-2 bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => runCommand('readergo.spreadsheet.addRow')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 transition-colors"
                >
                    + Row
                </button>
                <button
                    onClick={() => runCommand('readergo.spreadsheet.deleteRow')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
                >
                    - Row
                </button>
            </div>

            <div className="flex items-center gap-1 pr-2 border-r border-slate-200 dark:border-slate-700 pl-1">
                <button
                    onClick={() => runCommand('readergo.spreadsheet.addColumn')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/30 dark:hover:text-purple-300 transition-colors"
                >
                    + Col
                </button>
                <button
                    onClick={() => runCommand('readergo.spreadsheet.deleteColumn')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors"
                >
                    - Col
                </button>
            </div>

            <div className="flex items-center gap-1 pl-1">
                <button
                    onClick={() => runCommand('readergo.spreadsheet.clearCell')}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    Clear Cell
                </button>
            </div>

            <div className="ml-auto flex items-center gap-2 px-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">DataGrid Plugin</span>
            </div>
        </div>
    );
}
