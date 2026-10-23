import { PluginContext, EditorProvider, EditorCapability, definePlugin } from '@readergo/plugin-sdk';
import { Waypoints } from 'lucide-react';
import { GraphDocumentEditor } from './GraphDocumentEditor';
import { GraphSidebarPanel } from './editor/GraphSidebarPanel';
import React from 'react';

export interface GraphCapability extends EditorCapability {
    addNode(node?: { id?: string; x?: number; y?: number; content?: string }): void;
    moveNode(id: string, x: number, y: number): void;
    updateNode(id: string, partial: { content?: string; x?: number; y?: number; documentId?: string }): void;
    connectNodes(sourceId: string, targetId: string): void;
    deleteNode(id: string): void;
    focusNode(id: string): void;
    findNodeByDocumentId(documentId: string): any;
}

const manifest = {
    id: 'readergo.editor.graph',
    name: 'Knowledge Graph',
    version: '1.0.0',
    description: 'An interactive knowledge graph editor on an infinite canvas',
    category: 'editor' as const,
    provides: ['editor-provider', 'activity-bar-item'],
    permissions: [],
};

const graphEditorProvider: EditorProvider = {
    id: 'graph-editor',
    name: 'Knowledge Graph',
    componentId: 'graph',
    supportedTypes: ['graph', 'knowledge-graph'],
};


export default definePlugin({
    manifest: manifest as any,
    async setup(context: PluginContext) {
        context.log.info('Knowledge Graph plugin activated');
        context.registerCapability('editor-provider', graphEditorProvider);
        
        context.registerDocumentType({
            type: 'graph',
            label: 'Knowledge Graph',
            icon: Waypoints,
            create: () => ({ content: '', data: { nodes: [], edges: [] } }),
        });

        graphEditorProvider.supportedTypes?.forEach((type) => {
            context.registerEditor({
                type,
                component: GraphDocumentEditor,
                capabilityId: graphEditorProvider.id,
            });
        });

        // Register Activity Bar item for creating new graphs
        context.registerCapability('activity-bar-item', {
            id: 'graph-new',
            icon: Waypoints,
            label: 'New Graph',
            order: 3,
            position: 'top',
            noteType: 'graph',
        });

        // Register Sidebar Panel for Graph Context
        context.registerCapability('sidebar-panel', {
            id: 'graph-context',
            title: 'Knowledge Graph',
            position: 'right',
            order: 1,
            render: (props: any) => <GraphSidebarPanel noteId={props.noteId} context={context} />
        });

        // Register Graph Commands
        context.registerCommand({
            id: 'readergo.graph.addNode',
            title: 'Add Node',
            handler: (payload?: { editorInstanceId?: string; node?: any }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (!editor) {
                    console.warn('[GRAPH] No active editor');
                    return false;
                }
                if (editor.actions?.addNode) { 
                    editor.actions.addNode(payload?.node); 
                    return true; 
                }
                return false;
            }
        });

        context.registerCommand({
            id: 'readergo.graph.moveNode',
            title: 'Move Node',
            handler: (payload?: { editorInstanceId?: string; id: string; x: number; y: number }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (!editor) {
                    console.warn('[GRAPH] No active editor');
                    return false;
                }
                if (editor.actions?.moveNode && payload?.id !== undefined) { 
                    editor.actions.moveNode(payload.id, payload.x, payload.y); 
                    return true; 
                }
                return false;
            }
        });

        context.registerCommand({
            id: 'readergo.graph.connectNodes',
            title: 'Connect Nodes',
            handler: (payload?: { editorInstanceId?: string; sourceId: string; targetId: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (!editor) {
                    console.warn('[GRAPH] No active editor');
                    return false;
                }
                if (editor.actions?.connectNodes && payload?.sourceId && payload?.targetId) { 
                    editor.actions.connectNodes(payload.sourceId, payload.targetId); 
                    return true; 
                }
                return false;
            }
        });

        context.registerCommand({
            id: 'readergo.graph.updateNode',
            title: 'Update Node',
            handler: (payload?: { editorInstanceId?: string; id: string; partial: { content?: string; x?: number; y?: number } }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (!editor) {
                    console.warn('[GRAPH] No active editor');
                    return false;
                }
                if (editor.actions?.updateNode && payload?.id && payload.partial) { 
                    editor.actions.updateNode(payload.id, payload.partial); 
                    return true; 
                }
                return false;
            }
        });

        context.registerCommand({
            id: 'readergo.graph.deleteNode',
            title: 'Delete Node',
            handler: (payload?: { editorInstanceId?: string; id: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (!editor) {
                    console.warn('[GRAPH] No active editor');
                    return false;
                }
                if (editor.actions?.deleteNode && payload?.id) { 
                    editor.actions.deleteNode(payload.id); 
                    return true; 
                }
                return false;
            }
        });

        context.registerCommand({
            id: 'readergo.graph.focusNode',
            title: 'Focus Node',
            handler: (payload?: { editorInstanceId?: string; id?: string; documentId?: string }) => { 
                const editor = context.getActiveEditor({ editorInstanceId: payload?.editorInstanceId }) as any;
                if (!editor) {
                    console.warn('[GRAPH] No active editor');
                    return false;
                }
                if (editor.actions?.focusNode) { 
                    if (payload?.id) {
                        editor.actions.focusNode(payload.id);
                    } else if (payload?.documentId) {
                        const node = editor.actions.findNodeByDocumentId?.(payload.documentId);
                        if (node) {
                            editor.actions.focusNode(node.id);
                        }
                    }
                    return true; 
                }
                return false;
            }
        });
        
        return async () => {
            context.log.info('Knowledge Graph plugin deactivated');
        };
    },
});
