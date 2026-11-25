import { PluginContext, EditorProvider, definePlugin } from '@readergo/plugin-sdk';
import { Castle } from 'lucide-react';
import React from 'react';
import { ChessEditor } from './ChessEditor';
import { registerChessTools } from './tools';

const manifest = {
    id: 'readergo.game.chess',
    name: 'Chess',
    version: '0.2.5',
    description: 'Play chess in your workspace. Engine or chat-agent opponent, or two players.',
    category: 'editor' as const,
    provides: ['editor-provider', 'activity-bar-item'],
    permissions: [],
};

const chessEditorProvider: EditorProvider = {
    id: 'chess-editor',
    name: 'Chess',
    componentId: 'chess',
    supportedTypes: ['chess'],
};

export default definePlugin({
    manifest: manifest as any,
    async setup(context: PluginContext) {
        context.log.info('Chess plugin activated');
        context.registerCapability('editor-provider', chessEditorProvider);

        context.registerDocumentType({
            type: 'chess',
            label: 'Chess',
            icon: Castle,
            create: () => ({
                content: '',
                data: { fen: 'start' },
            }),
        });

        context.registerEditor({
            type: 'chess',
            component: ChessEditor,
            capabilityId: chessEditorProvider.id,
        });

        // Activity bar item for creating a new game.
        context.registerCapability('activity-bar-item', {
            id: 'chess-new',
            icon: Castle,
            label: 'New Chess Game',
            order: 4,
            position: 'top',
            noteType: 'chess',
        });

        // Agent/MCP tools so a chat agent can play on the active board.
        await registerChessTools(context);
    },
});
