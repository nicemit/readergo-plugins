import type { PluginContext } from '@readergo/plugin-sdk';

function chessEditor(context: PluginContext): any {
  const editor = context.getActiveEditor() as any;
  if (!editor?.actions?.getState) return null;
  return editor;
}

const NO_BOARD = {
  ok: false,
  error: 'No active chess board. Open a chess document first.',
};

/**
 * Agent/MCP tools so a chat agent can play chess against the user (or the
 * CPU). The bot drives the active board through the same actions the UI
 * uses; a cpu-mode game answers each bot move automatically.
 */
export async function registerChessTools(context: PluginContext): Promise<void> {
  await context.registerTool({
    name: 'chess_get_state',
    description:
      'Get the active chess game: FEN, whose turn it is, game status, and all legal moves for the current side. Call this before moving.',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const editor = chessEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.getState();
    },
  });

  await context.registerTool({
    name: 'chess_move',
    description:
      'Make a move on the active chess board. from and to are squares like e2 and e4. Optional promotion: q, r, b, or n. Returns the new game state. In cpu mode the CPU answers your move automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Source square, e.g. e2' },
        to: { type: 'string', description: 'Target square, e.g. e4' },
        promotion: {
          type: 'string',
          description: 'Optional promotion piece: q, r, b, or n',
        },
      },
      required: ['from', 'to'],
    },
    handler: (args: Record<string, unknown>) => {
      const editor = chessEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.move({
        from: args.from,
        to: args.to,
        promotion: args.promotion,
      });
    },
  });

  await context.registerTool({
    name: 'chess_new_game',
    description: 'Reset the active chess board to the starting position. Returns the new game state.',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const editor = chessEditor(context);
      if (!editor) return NO_BOARD;
      return editor.actions.newGame();
    },
  });

  await context.registerTool({
    name: 'chess_best_move',
    description:
      'Suggest the strongest move for the current position (minimax with alpha-beta). Optional depth 1-3, default 2. Returns { from, to, promotion } or null if the game is over.',
    inputSchema: {
      type: 'object',
      properties: {
        depth: {
          type: 'number',
          description: 'Search depth 1-3, default 2',
        },
      },
    },
    handler: (args: Record<string, unknown>) => {
      const editor = chessEditor(context);
      if (!editor) return NO_BOARD;
      const depth = typeof args.depth === 'number' ? args.depth : 2;
      return editor.actions.bestMove(depth);
    },
  });
}
