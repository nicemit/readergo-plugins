import { Chess, type Move, type Square } from 'chess.js';

const VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

/** Material evaluation, positive for white. */
function evaluate(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      score += cell.color === 'w' ? VALUES[cell.type] : -VALUES[cell.type];
    }
  }
  return score;
}

function negamax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isCheckmate()) return game.turn() === 'w' ? -99999 : 99999;
  if (game.isDraw()) return 0;
  if (depth === 0 || game.isGameOver()) return evaluate(game);

  const maximizing = game.turn() === 'w';
  let best = maximizing ? -Infinity : Infinity;

  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    const score = negamax(game, depth - 1, alpha, beta);
    game.undo();
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

export interface CpuMove {
  from: Square;
  to: Square;
  promotion?: string;
}

/**
 * Best move for the current position via negamax with alpha-beta pruning.
 * Depth 2 is the default: a casual opponent, instant to compute.
 */
export function findBestMove(fen: string, depth = 2): CpuMove | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const maximizing = game.turn() === 'w';
  let bestScore = maximizing ? -Infinity : Infinity;
  let best: Move | null = null;

  for (const move of moves) {
    game.move(move);
    const score = negamax(game, depth - 1, -Infinity, Infinity);
    game.undo();
    if ((maximizing && score > bestScore) || (!maximizing && score < bestScore)) {
      bestScore = score;
      best = move;
    }
  }

  if (!best) return null;
  return { from: best.from, to: best.to, promotion: best.promotion };
}
