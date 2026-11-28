import type { PluginContext } from '@readergo/plugin-sdk';
import { Chess, type Square } from 'chess.js';
import { findBestMove } from './cpu';

interface ChessData {
  fen?: string;
  pgn?: string;
  mode?: 'cpu' | 'bot' | 'hotseat';
  side?: 'w' | 'b';
  sidePref?: 'w' | 'b' | 'random';
  [key: string]: unknown;
}

const NO_BOARD = {
  ok: false,
  error: 'No active chess board. Open a chess document or pass a documentId.',
};

function parseData(raw: unknown): ChessData {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ChessData;
    } catch {
      return {};
    }
  }
  return raw as ChessData;
}

function gameFromData(data: ChessData): Chess {
  const fen = typeof data.fen === 'string' && data.fen !== 'start' ? data.fen : undefined;
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch {
    return new Chess();
  }
}

function statusFor(game: Chess): string {
  if (game.isCheckmate()) {
    return `checkmate. ${game.turn() === 'w' ? 'black' : 'white'} wins.`;
  }
  if (game.isStalemate()) return 'stalemate. draw.';
  if (game.isDraw()) return 'draw.';
  const side = game.turn() === 'w' ? 'white' : 'black';
  return game.inCheck() ? `${side} to move - in check.` : `${side} to move.`;
}

function stateFor(game: Chess, data: ChessData) {
  return {
    fen: game.fen(),
    turn: game.turn(),
    isGameOver: game.isGameOver(),
    status: statusFor(game),
    mode: data.mode ?? 'cpu',
    side: data.side ?? 'w',
    legalMoves: game.moves({ verbose: true }).map((move) => ({
      from: move.from,
      to: move.to,
      san: move.san,
      promotion: move.promotion,
    })),
  };
}

function activeEditor(context: PluginContext): any {
  const editor = context.getActiveEditor() as any;
  if (!editor?.actions?.getState) return null;
  return editor;
}

async function loadDocument(
  context: PluginContext,
  documentId: string,
): Promise<{ ok: true; document: any } | { ok: false; error: string }> {
  const res = (await context.executeCommand('document.get', {
    id: documentId,
  })) as { success?: boolean; data?: any; error?: string };
  if (res?.success === false || !res?.data) {
    return { ok: false, error: res?.error || `Document ${documentId} not found` };
  }
  return { ok: true, document: res.data };
}

async function updateDocument(
  context: PluginContext,
  documentId: string,
  document: any,
  data: ChessData,
  game: Chess,
) {
  return (await context.executeCommand('document.update', {
    id: documentId,
    data: { ...data, fen: game.fen(), pgn: game.pgn() },
    content: game.pgn(),
    expectedVersion: typeof document.version === 'number' ? document.version : 0,
    actor: 'agent',
  })) as {
    success?: boolean;
    conflict?: boolean;
    current?: any;
    version?: number;
    error?: string;
  };
}

/**
 * Agent/MCP tools so a chat agent can play chess. When a documentId is given
 * (agent triggers always pass it), the tools read and write that document through
 * the document commands, so they work even when the board is not the open tab.
 * Without a documentId they fall back to the active editor instance.
 */
export async function registerChessTools(context: PluginContext): Promise<void> {
  await context.registerTool({
    name: 'chess_get_state',
    description:
      'Get the active chess game: FEN, whose turn, status, and legal moves. Pass documentId from the run prompt to read that document instead of the active board.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Chess document id. Use the one from the run prompt.',
        },
      },
    },
    handler: async (args: Record<string, unknown>) => {
      const documentId = typeof args.documentId === 'string' ? args.documentId.trim() : '';
      if (documentId) {
        const loaded = await loadDocument(context, documentId);
        if (!loaded.ok) return loaded;
        const data = parseData(loaded.document.data);
        const game = gameFromData(data);
        return {
          ok: true,
          documentId,
          version: loaded.document.version,
          ...stateFor(game, data),
        };
      }
      const editor = activeEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.getState();
    },
  });

  await context.registerTool({
    name: 'chess_move',
    description:
      'Make a move on a chess document. from and to are squares like e2 and e4. Optional promotion: q, r, b, or n. Pass documentId from the run prompt so the move lands on that document. Returns the new state or a version conflict.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Chess document id. Use the one from the run prompt.',
        },
        from: { type: 'string', description: 'Source square, e.g. e2' },
        to: { type: 'string', description: 'Target square, e.g. e4' },
        promotion: {
          type: 'string',
          description: 'Optional promotion piece: q, r, b, or n',
        },
      },
      required: ['from', 'to'],
    },
    handler: async (args: Record<string, unknown>) => {
      const from = typeof args.from === 'string' ? args.from : '';
      const to = typeof args.to === 'string' ? args.to : '';
      const promotion = typeof args.promotion === 'string' ? args.promotion : undefined;
      const documentId = typeof args.documentId === 'string' ? args.documentId.trim() : '';

      if (documentId) {
        const loaded = await loadDocument(context, documentId);
        if (!loaded.ok) return loaded;
        const data = parseData(loaded.document.data);
        const game = gameFromData(data);
        try {
          const move = game.move({ from: from as Square, to: to as Square, promotion });
          if (!move) return { ok: false, error: 'invalid move' };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : 'invalid move',
          };
        }
        const res = await updateDocument(context, documentId, loaded.document, data, game);
        if (res?.conflict) {
          return {
            ok: false,
            conflict: true,
            current: res.current,
            error: 'Document changed since it was read. Fetch the current state and retry.',
          };
        }
        if (res?.success === false) {
          return { ok: false, error: res.error || 'Could not update the chess document' };
        }
        return {
          ok: true,
          documentId,
          version: res?.version,
          ...stateFor(game, data),
        };
      }

      const editor = activeEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.move({ from, to, promotion });
    },
  });

  await context.registerTool({
    name: 'chess_new_game',
    description:
      'Reset a chess document to the starting position. Pass documentId from the run prompt, or omit it to reset the active board.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Chess document id. Use the one from the run prompt.',
        },
      },
    },
    handler: async (args: Record<string, unknown>) => {
      const documentId = typeof args.documentId === 'string' ? args.documentId.trim() : '';
      if (documentId) {
        const loaded = await loadDocument(context, documentId);
        if (!loaded.ok) return loaded;
        const data = parseData(loaded.document.data);
        const game = new Chess();
        const res = await updateDocument(context, documentId, loaded.document, data, game);
        if (res?.conflict) {
          return { ok: false, conflict: true, current: res.current, error: 'Document changed' };
        }
        return { ok: true, documentId, version: res?.version, ...stateFor(game, data) };
      }
      const editor = activeEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.newGame();
    },
  });

  await context.registerTool({
    name: 'chess_best_move',
    description:
      'Suggest the strongest move for a chess document (minimax with alpha-beta). Optional depth 1-3, default 2. Pass documentId from the run prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Chess document id. Use the one from the run prompt.',
        },
        depth: {
          type: 'number',
          description: 'Search depth 1-3, default 2',
        },
      },
    },
    handler: async (args: Record<string, unknown>) => {
      const depth = typeof args.depth === 'number' ? args.depth : 2;
      const documentId = typeof args.documentId === 'string' ? args.documentId.trim() : '';
      if (documentId) {
        const loaded = await loadDocument(context, documentId);
        if (!loaded.ok) return loaded;
        const data = parseData(loaded.document.data);
        const game = gameFromData(data);
        return findBestMove(game.fen(), depth);
      }
      const editor = activeEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.bestMove(depth);
    },
  });
}
