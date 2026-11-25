'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorProps, PluginContext } from '@readergo/plugin-sdk';
import { AGENT_CHAT_UI_COMMAND_OPEN, GENERATIVE_UI_CAPABILITY_ID } from '@readergo/plugin-sdk';
// audit-ignore: sdk-boundary
import { usePluginManager } from '@/app/providers/PluginProvider';
import { Chess, type Square } from 'chess.js';
import { findBestMove } from './cpu';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECES: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const LIGHT = '#f0f1f2';
const DARK = '#5c707d';
const HIGHLIGHT = 'rgba(34, 211, 238, 0.4)'; // Cyan-400 with alpha
const LAST_MOVE = 'rgba(251, 191, 36, 0.3)'; // Amber-400 with alpha

type GameMode = 'cpu' | 'bot' | 'hotseat';
type Side = 'w' | 'b';
type SidePref = Side | 'random';

function squareAt(row: number, col: number): Square {
    return `${FILES[col]}${8 - row}` as Square;
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

function colorName(side: Side): string {
    return side === 'w' ? 'white' : 'black';
}

const CHESS_PLUGIN_ID = 'readergo.game.chess';

/**
 * Chess document editor.
 * - cpu mode: the minimax engine answers automatically after your move.
 * - bot mode: your move triggers the agent in chat (the same path as typing
 *   a message) - it thinks out loud and plays via chess_move.
 * - hotseat: two players on one board, no automatic moves.
 * Side is picked before the game (white, black, or random).
 */
export function ChessEditor(props: EditorProps) {
    const { currentNote, onSave, readOnly } = props;
    const onDataChange = (props as { onDataChange?: (data: unknown) => void }).onDataChange;
    const context = (props as { context?: PluginContext }).context;

    // The host passes the *navigation context* (e.g. { focusNodeId }) in
    // props.context, not a PluginContext. Resolve the real PluginContext from
    // the host manager so the board can reach the chat capability and
    // commands. A PluginContext handed in as props still wins when present.
    let manager: ReturnType<typeof usePluginManager> | null = null;
    try {
        manager = usePluginManager();
    } catch {
        manager = null;
    }

    const pluginContext = useMemo<PluginContext | null>(() => {
        const passed = (props as { context?: PluginContext }).context;
        if (passed && typeof passed.getCapability === 'function') {
            return passed;
        }
        try {
            return manager?.getPluginContext(CHESS_PLUGIN_ID) ?? null;
        } catch {
            return null;
        }
    }, [manager, props.context]);

    const gameRef = useRef<Chess | null>(null);
    if (!gameRef.current) gameRef.current = new Chess();
    const game = gameRef.current;

    const [, setFen] = useState(game.fen());
    const [selected, setSelected] = useState<Square | null>(null);
    const [targets, setTargets] = useState<Square[]>([]);
    const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
    const [mode, setMode] = useState<GameMode>('cpu');
    const [side, setSide] = useState<Side>('w');
    const [sidePref, setSidePref] = useState<SidePref>('w');
    const [botThinking, setBotThinking] = useState(false);
    const [botError, setBotError] = useState<string | null>(null);
    const lastPromptFenRef = useRef<string | null>(null);

    // Hydrate from the document when a different note opens.
    useEffect(() => {
        const data = (currentNote?.data ?? null) as {
            fen?: string;
            mode?: GameMode;
            side?: Side;
            sidePref?: SidePref;
        } | null;
        const fen = data?.fen && data.fen !== 'start' ? data.fen : undefined;
        try {
            gameRef.current = fen ? new Chess(fen) : new Chess();
        } catch {
            gameRef.current = new Chess();
        }
        const currentFen = gameRef.current.fen();
        setFen(currentFen);
        setSelected(null);
        setTargets([]);
        setPromotion(null);
        setMode(data?.mode === 'bot' || data?.mode === 'hotseat' ? data.mode : 'cpu');
        setSide(data?.side === 'b' ? 'b' : 'w');
        setSidePref(data?.sidePref === 'b' || data?.sidePref === 'random' ? data.sidePref : 'w');

        // If we hydrated a FEN that matches our last prompt, keep thinking;
        // otherwise, we've moved past it.
        if (currentFen !== lastPromptFenRef.current) {
            setBotThinking(false);
        }
    }, [currentNote?.id]);

    const opponentSide = (): Side => (side === 'w' ? 'b' : 'w');

    const persist = () => {
        const currentFen = gameRef.current!.fen();
        onDataChange?.({
            fen: currentFen,
            pgn: gameRef.current!.pgn(),
            mode,
            side,
            sidePref,
        });
        onSave?.(gameRef.current!.pgn());
    };

    const getState = () => {
        const g = gameRef.current!;
        return {
            fen: g.fen(),
            turn: g.turn(),
            isGameOver: g.isGameOver(),
            status: statusFor(g),
            mode,
            side,
            legalMoves: g.moves({ verbose: true }).map((m) => ({
                from: m.from,
                to: m.to,
                san: m.san,
                promotion: m.promotion,
            })),
        };
    };

    /**
     * Ask the chat agent to play. Same path as the user typing the message:
     * the generative-ui capability hands the text to the chat composer, the
     * agent thinks visibly in the panel, and its chess_move lands here.
     */
    const triggerBot = async (): Promise<'submitted' | 'missing-capability' | 'failed' | 'already-prompted'> => {
        const g = gameRef.current!;
        const currentFen = g.fen();

        // Don't prompt twice for the same position.
        if (lastPromptFenRef.current === currentFen) {
            return 'already-prompted';
        }

        // Open the chat panel first so the thinking is visible.
        try {
            await pluginContext?.executeCommand(AGENT_CHAT_UI_COMMAND_OPEN);
        } catch (error) {
            console.warn('[chess-bot] chat panel open failed', error);
        }
        try {
            const genUi = await pluginContext?.getCapability<{
                dispatchAction?: (name: string, params?: Record<string, unknown>) => Promise<any>;
            }>(GENERATIVE_UI_CAPABILITY_ID);
            if (!genUi?.dispatchAction) {
                return 'missing-capability';
            }

            const history = g.history();
            const last = history.length > 0 ? history[history.length - 1] : null;
            const text =
                `CHESS GAME UPDATE: It is your turn. You are playing as ${colorName(opponentSide())}. ` +
                `Current FEN: ${currentFen}. ` +
                (last ? `Last move was ${last}. ` : '') +
                `INSTRUCTIONS: 1) Call chess_get_state() to see the board and legal moves. 2) Pick a move. 3) Call chess_move() to play it. ` +
                `Do not just describe the move in text; you MUST use the tools to update the board.`;

            lastPromptFenRef.current = currentFen;

            // The chat panel registers its submit handler on mount; retry
            // while it catches up so the bot prompt never gets dropped.
            for (let attempt = 0; attempt < 12; attempt++) {
                const result = await genUi.dispatchAction('submit_to_chat', { text });
                if (result?.ok !== false) return 'submitted';
                const error = String(result?.error ?? '');
                if (!error.includes('not registered')) return 'failed';
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
            return 'failed';
        } catch (error) {
            console.error('[chess-bot] trigger failed', error);
            return 'failed';
        }
    };

    /**
     * After triggerBot settles: a submitted prompt keeps the agent thinking
     * until its chess_move lands; a failure clears the spinner and explains
     * why the board is waiting.
     */
    const applyBotOutcome = (
        outcome: 'submitted' | 'missing-capability' | 'failed' | 'already-prompted',
        side: () => Side,
    ) => {
        if (outcome === 'submitted' || outcome === 'already-prompted') return;
        setBotThinking(false);
        const gNow = gameRef.current;
        if (!gNow || gNow.isGameOver() || gNow.turn() !== side()) return;
        setBotError(
            outcome === 'missing-capability'
                ? 'chat agent unavailable: the generative-ui capability is not registered in this workspace.'
                : 'no reply yet - the chat panel is open. If it stays quiet or echos, check your Agent SDK settings.',
        );
    };

    /** After a move, let the opponent answer in cpu or bot mode. */
    const maybeOpponentReply = () => {
        const g = gameRef.current!;
        if (mode === 'hotseat' || g.isGameOver() || g.turn() !== opponentSide()) {
            setBotThinking(false);
            return;
        }
        if (mode === 'cpu') {
            const best = findBestMove(g.fen(), 2);
            if (best) g.move(best);
            setFen(g.fen());
            setSelected(null);
            setTargets([]);
            setPromotion(null);
            setBotThinking(false);
            persist();
        } else {
            setFen(g.fen());
            persist();
            setBotError(null);
            setBotThinking(true);
            void triggerBot().then((outcome) => applyBotOutcome(outcome, opponentSide));
        }
    };

    const doMove = (from: Square, to: Square, promo?: string) => {
        const g = gameRef.current!;
        try {
            g.move({ from, to, promotion: promo });
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : 'invalid move' };
        }

        setFen(g.fen());
        setSelected(null);
        setTargets([]);
        setPromotion(null);
        setBotThinking(false);
        setBotError(null);

        maybeOpponentReply();
        return { ok: true, ...getState() };
    };

    const newGame = () => {
        const resolved = sidePref === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : sidePref;
        gameRef.current!.reset();
        lastPromptFenRef.current = null;
        setSide(resolved);
        setFen(gameRef.current!.fen());
        setSelected(null);
        setTargets([]);
        setPromotion(null);
        setBotThinking(false);
        setBotError(null);
        persist();
        // Opponent opens when the human picked black.
        if (mode !== 'hotseat' && resolved === 'b') {
            maybeOpponentReply();
        }
        return getState();
    };

    // Expose actions for commands and agent tools on the active board.
    useEffect(() => {
        if (!pluginContext || !currentNote?.id) return;
        const instanceId = `chess-${currentNote.id}`;
        const cleanup = pluginContext.registerEditorCapability?.(instanceId, {
            actions: {
                getState,
                move: (args: { from: string; to: string; promotion?: string }) =>
                    doMove(args.from as Square, args.to as Square, args.promotion),
                newGame,
                bestMove: (depth?: number) => findBestMove(gameRef.current!.fen(), depth ?? 2),
            },
            getState,
        } as any);
        pluginContext.setActiveEditor?.(instanceId);
        return cleanup;
    }, [pluginContext, currentNote?.id, mode, side, sidePref]);

    const onSquareClick = (square: Square) => {
        if (readOnly || promotion) return;

        if (selected) {
            if (square === selected) {
                setSelected(null);
                setTargets([]);
                return;
            }
            const hit = gameRef
                .current!.moves({ square: selected, verbose: true })
                .find((m) => m.to === square);
            if (hit) {
                if (hit.promotion) {
                    setPromotion({ from: selected, to: square });
                } else {
                    doMove(selected, square);
                }
                return;
            }
        }

        const piece = gameRef.current!.get(square);
        if (piece && piece.color === gameRef.current!.turn()) {
            setSelected(square);
            setTargets(gameRef.current!.moves({ square, verbose: true }).map((m) => m.to));
        } else {
            setSelected(null);
            setTargets([]);
        }
    };

    const switchMode = (next: GameMode) => {
        setMode(next);
        onDataChange?.({ fen: game.fen(), pgn: game.pgn(), mode: next, side, sidePref });
        onSave?.(game.pgn());
        // If the opponent is to move right now, let it answer immediately.
        if (next !== 'hotseat' && !game.isGameOver() && game.turn() === opponentSide()) {
            if (next === 'cpu') {
                const best = findBestMove(game.fen(), 2);
                if (best) {
                    game.move(best);
                    setFen(game.fen());
                    persist();
                }
            } else {
                setBotError(null);
                setBotThinking(true);
                void triggerBot().then((outcome) => applyBotOutcome(outcome, () => opponentSide()));
            }
        }
    };

    const pickSide = (pref: SidePref) => {
        setSidePref(pref);
        onDataChange?.({ fen: game.fen(), pgn: game.pgn(), mode, side, sidePref: pref });
        onSave?.(game.pgn());
        // Restart so the pick applies cleanly before the next game.
        newGame();
    };

    const history = game.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : null;

    const recent = game.history().slice(-8);

    const buttonStyle: React.CSSProperties = {
        border: '1px solid rgba(128,128,128,0.4)',
        borderRadius: 4,
        padding: '0.2rem 0.7rem',
        background: 'transparent',
        cursor: readOnly ? 'default' : 'pointer',
        fontSize: '0.8rem',
    };

    const activeButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        borderColor: 'rgba(128,128,128,0.9)',
        background: 'rgba(128,128,128,0.18)',
    };

    return (
        <div
            style={{
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxWidth: 480,
                width: '100%',
                margin: '0 auto',
                alignItems: 'center',
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    width: '100%',
                    aspectRatio: '1',
                    border: '2px solid rgba(128,128,128,0.3)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
            >
                {Array.from({ length: 64 }, (_, i) => {
                    const square = squareAt(Math.floor(i / 8), i % 8);
                    const piece = game.get(square);
                    const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
                    const isSelected = selected === square;
                    const isTarget = targets.includes(square);
                    const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

                    return (
                        <button
                            key={square}
                            type="button"
                            onClick={() => onSquareClick(square)}
                            style={{
                                aspectRatio: '1',
                                border: 'none',
                                cursor: readOnly ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'clamp(1.5rem, 4.5vw, 2.2rem)',
                                lineHeight: 1,
                                background: isLight ? LIGHT : DARK,
                                boxShadow: isSelected
                                    ? `inset 0 0 0 4px ${HIGHLIGHT}`
                                    : isLastMove
                                      ? `inset 0 0 0 3px ${LAST_MOVE}`
                                      : 'none',
                                position: 'relative',
                            }}
                        >
                            {piece && (
                                <span
                                    style={{
                                        color: piece.color === 'w' ? '#ffffff' : '#1e293b',
                                        textShadow: piece.color === 'w' ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                                        zIndex: 1,
                                    }}
                                >
                                    {PIECES[`${piece.color}${piece.type.toUpperCase()}`]}
                                </span>
                            )}
                            {isTarget && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        width: piece ? '85%' : '25%',
                                        height: piece ? '85%' : '25%',
                                        borderRadius: '50%',
                                        background: piece ? 'transparent' : 'rgba(34, 211, 238, 0.4)',
                                        border: piece ? '4px solid rgba(34, 211, 238, 0.4)' : 'none',
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {promotion && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>promote to:</span>
                    {(['q', 'r', 'b', 'n'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => doMove(promotion.from, promotion.to, p)}
                            style={{ ...buttonStyle, fontSize: '1.25rem' }}
                        >
                            {PIECES[`${gameRef.current!.turn()}${p.toUpperCase()}`]}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ textAlign: 'center', minHeight: '2.5rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
                    {botThinking ? (
                        <span style={{ color: 'rgba(34, 211, 238, 0.9)' }}>
                            chat is thinking
                            <span style={{ animation: 'chess-think 1.2s ease-in-out infinite' }}>
                                ...
                            </span>
                        </span>
                    ) : (
                        <>
                            {statusFor(game)}
                            {mode !== 'hotseat' && !game.isGameOver()
                                ? ` · ${mode === 'cpu' ? 'engine' : 'chat'} plays ${colorName(opponentSide())}`
                                : ''}
                        </>
                    )}
                </p>

                {botError && (
                    <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem', color: '#f87171' }}>{botError}</p>
                )}
            </div>

            <style>{'@keyframes chess-think { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }'}</style>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                        gameRef.current!.undo();
                        setFen(gameRef.current!.fen());
                        setSelected(null);
                        setTargets([]);
                        persist();
                    }}
                    style={buttonStyle}
                >
                    undo
                </button>
                <button type="button" disabled={readOnly} onClick={newGame} style={buttonStyle}>
                    new game
                </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>opponent:</span>
                {(['cpu', 'bot', 'hotseat'] as const).map((m) => (
                    <button
                        key={m}
                        type="button"
                        disabled={readOnly}
                        onClick={() => switchMode(m)}
                        style={mode === m ? activeButtonStyle : buttonStyle}
                    >
                        {m === 'hotseat' ? '2 players' : m}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>you play:</span>
                {(['w', 'b', 'random'] as const).map((p) => (
                    <button
                        key={p}
                        type="button"
                        disabled={readOnly}
                        onClick={() => pickSide(p)}
                        style={sidePref === p ? activeButtonStyle : buttonStyle}
                    >
                        {p === 'w' ? 'white' : p === 'b' ? 'black' : 'random'}
                    </button>
                ))}
            </div>

            {recent.length > 0 && (
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', opacity: 0.6, margin: 0, letterSpacing: '0.05em' }}>
                    {recent.join(' ')}
                </p>
            )}
        </div>
    );
}
