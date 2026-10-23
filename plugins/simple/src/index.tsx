/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { PluginContext, EditorProvider, definePlugin } from '@readergo/plugin-sdk';
import { SimpleTextEditor } from './editor/SimpleTextEditor';

const manifest = {
    id: 'readergo.editor.simple',
    name: 'Simple Text Editor',
    category: 'editor',
    version: '1.0.0',
    description: 'A simple textarea-based editor for verification',
    provides: ['editor-provider'] as string[],
    permissions: [] as any[], // Cast to any to avoid strict Permission type issues in verification plugin
} as const;

const simpleEditorProvider: EditorProvider = {
    id: 'simple-editor',
    name: 'Simple Editor',
    description: 'Basic textarea editor',
    componentId: 'simple',
};

export default definePlugin({
    manifest: manifest as any,
    async setup(context: PluginContext) {
        context.log.info('Simple Text Editor plugin activated');
        context.registerCapability('editor-provider', simpleEditorProvider);
        
        context.registerEditor({
            type: 'simple',
            component: SimpleTextEditor,
            capabilityId: simpleEditorProvider.id
        });
        
        return async () => {
            context.log.info('Simple Text Editor plugin deactivated');
        };
    },
});
