import { PluginContext, EditorProvider, definePlugin, type AgentTrigger } from '@readergo/plugin-sdk';
import { Castle } from 'lucide-react';
import React from 'react';
import { ChessEditor } from './ChessEditor';
import { registerChessTools } from './tools';

const manifest = {
    id: 'readergo.game.chess',
    name: 'Chess',
    version: '0.2.6',
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

function chessData(raw: unknown): { fen?: string; mode?: string; side?: 'w' | 'b' } {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return raw as { fen?: string; mode?: string; side?: 'w' | 'b' };
}

function turnOf(fen: string): 'w' | 'b' {
    return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * When the human plays black and the bot plays white (or vice versa) and the
 * saved board says it is the bot's move, the host starts one agent run for
 * that document version. The run is triggered by the human's committed write.
 */
const chessNeedsMove: AgentTrigger = {
    id: 'chess.bot-move',
    surfaceId: 'chess',
    requiresHuman: true,
    tools: ['chess_get_state', 'chess_move'],
    when: (doc) => {
        const data = chessData(doc.data);
        if (data.mode !== 'bot') return false;
        const humanSide = data.side === 'b' ? 'b' : 'w';
        const botSide = humanSide === 'w' ? 'b' : 'w';
        const fen = typeof data.fen === 'string' && data.fen !== 'start' ? data.fen : START_FEN;
        return turnOf(fen) === botSide;
    },
    prompt: (doc) => {
        const data = chessData(doc.data);
        const humanSide = data.side === 'b' ? 'b' : 'w';
        const botSide = humanSide === 'w' ? 'b' : 'w';
        const fen = typeof data.fen === 'string' && data.fen !== 'start' ? data.fen : START_FEN;
        return (
            `CHESS GAME UPDATE: it is your turn. You play ${botSide === 'w' ? 'white' : 'black'} ` +
            `on chess document "${doc.id}". Current FEN: ${fen}. ` +
            `Call chess_get_state with {"documentId":"${doc.id}"} to see legal moves, then call ` +
            `chess_move with {"documentId":"${doc.id}","from":"<square>","to":"<square>"}. ` +
            `Do not describe a move without calling the tool.`
        );
    },
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
            writePolicy: 'immediate',
            agentTriggers: [chessNeedsMove],
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
