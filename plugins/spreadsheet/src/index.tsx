import { SpreadsheetToolbar } from './editor/SpreadsheetToolbar';
import { PluginContext, EditorProvider, EditorCapability, ExtensionSlotProvider, definePlugin } from '@readergo/plugin-sdk';
import { Table } from 'lucide-react';
import { SpreadsheetDocumentEditor } from './SpreadsheetDocumentEditor';
import { createGrid, DEFAULT_COLS, DEFAULT_ROWS } from './core/SpreadsheetEngine';
import React from 'react';
// audit-ignore: sdk-boundary - Internal plugin uses shared skeleton component
import { SpreadsheetSkeleton } from '@/components/ui/LoadingSkeleton';

export interface SpreadsheetCapability extends EditorCapability {
    addRowAbove(): void;
    addRowBelow(): void;
    deleteRow(): void;
    addColumnLeft(): void;
    addColumnRight(): void;
    deleteColumn(): void;
    clearCell(): void;
    exportCSV(): void;
}

const manifest = {
    id: 'readergo.editor.spreadsheet',
    name: 'Simple Spreadsheet',
    version: '1.0.0',
    description: 'A basic grid-based editor for spreadsheet data',
    category: 'editor' as const,
    provides: ['editor-provider', 'activity-bar-item', 'extension-slot'],
    permissions: [],
};

const spreadsheetEditorProvider: EditorProvider = {
    id: 'spreadsheet-editor',
    name: 'Spreadsheet',
    componentId: 'spreadsheet',
    supportedTypes: ['spreadsheet', 'grid'],
};

export default definePlugin({
    manifest: manifest as any,
    async setup(context: PluginContext) {
        context.log.info('Spreadsheet Editor plugin activated');
        context.registerCapability('editor-provider', spreadsheetEditorProvider);

        context.registerDocumentType({
            type: 'spreadsheet',
            label: 'Spreadsheet',
            icon: Table,
            create: () => ({
                content: '',
                data: { grid: createGrid(DEFAULT_ROWS, DEFAULT_COLS) },
            }),
        });

        spreadsheetEditorProvider.supportedTypes?.forEach((type) => {
            context.registerEditor({
                type,
                component: SpreadsheetDocumentEditor,
                capabilityId: spreadsheetEditorProvider.id,
                loadingComponent: SpreadsheetSkeleton,
            });
        });

        // Register Activity Bar item for creating new spreadsheets
        context.registerCapability('activity-bar-item', {
            id: 'spreadsheet-new',
            icon: Table,
            label: 'New Spreadsheet',
            order: 2,
            position: 'top',
            noteType: 'spreadsheet',
        });
        context.log.info('Registered activity-bar-item capability');

        // Register Spreadsheet Commands
        context.registerCommand({
            id: 'readergo.spreadsheet.addRow',
            title: 'Add Row',
            handler: (payload?: { editorInstanceId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (editor && editor.addRowBelow) { editor.addRowBelow(); return true; }
                return false;
            }
        });
        context.registerCommand({
            id: 'readergo.spreadsheet.deleteRow',
            title: 'Delete Row',
            handler: (payload?: { editorInstanceId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (editor && editor.deleteRow) { editor.deleteRow(); return true; }
                return false;
            }
        });
        context.registerCommand({
            id: 'readergo.spreadsheet.addColumn',
            title: 'Add Column',
            handler: (payload?: { editorInstanceId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (editor && editor.addColumnRight) { editor.addColumnRight(); return true; }
                return false;
            }
        });
        context.registerCommand({
            id: 'readergo.spreadsheet.deleteColumn',
            title: 'Delete Column',
            handler: (payload?: { editorInstanceId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (editor && editor.deleteColumn) { editor.deleteColumn(); return true; }
                return false;
            }
        });
        context.registerCommand({
            id: 'readergo.spreadsheet.export',
            title: 'Export CSV',
            handler: (payload?: { editorInstanceId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (editor && editor.exportCSV) { editor.exportCSV(); return true; }
                return false;
            }
        });

        context.registerCommand({
            id: 'readergo.spreadsheet.clearCell',
            title: 'Clear Cell',
            handler: (payload?: { editorInstanceId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (editor && editor.clearCell) { editor.clearCell(); return true; }
                return false;
            }
        });

        // Register the toolbar
        context.registerCapability<ExtensionSlotProvider>('extension-slot', {
            id: 'spreadsheet-toolbar',
            slotId: 'editor-toolbar',
            component: SpreadsheetToolbar,
            order: 10
        });
        context.log.info('Registered spreadsheet toolbar extension slot');
        
        return async () => {
            context.log.info('Spreadsheet Editor plugin deactivated');
        };
    },
});
