'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import { Chess, type Square } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECES: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const LIGHT = '#eeeed2';
const DARK = '#769656';
const HIGHLIGHT = '#f6f669';

function squareAt(row: number, col: number): Square {
    return `${FILES[col]}${8 - row}` as Square;
}

/**
 * Chess document editor. Two-player hotseat on one board; game state is
 * persisted into the note's data (fen) and content (pgn) on every move.
 * Rules come from chess.js, which esbuild bundles into the plugin.
 */
export function ChessEditor(props: EditorProps) {
    const { currentNote, onSave, readOnly } = props;
    const onDataChange = (props as { onDataChange?: (data: unknown) => void }).onDataChange;

    const gameRef = useRef<Chess | null>(null);
    if (!gameRef.current) gameRef.current = new Chess();
    const game = gameRef.current;

    const [, setFen] = useState(game.fen());
    const [selected, setSelected] = useState<Square | null>(null);
    const [targets, setTargets] = useState<Square[]>([]);
    const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);

    // Hydrate from the document when a different note opens.
    useEffect(() => {
        const data = (currentNote?.data ?? null) as { fen?: string } | null;
        const fen = data?.fen && data.fen !== 'start' ? data.fen : undefined;
        try {
            gameRef.current = fen ? new Chess(fen) : new Chess();
        } catch {
            gameRef.current = new Chess();
        }
        setFen(gameRef.current.fen());
        setSelected(null);
        setTargets([]);
        setPromotion(null);
    }, [currentNote?.id]);

    const persist = () => {
        onDataChange?.({ fen: gameRef.current!.fen(), pgn: gameRef.current!.pgn() });
        onSave?.(gameRef.current!.pgn());
    };

    const doMove = (from: Square, to: Square, promo?: string) => {
        const move = gameRef.current!.move({ from, to, promotion: promo });
        if (!move) return;
        setFen(gameRef.current!.fen());
        setSelected(null);
        setTargets([]);
        setPromotion(null);
        persist();
    };

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

    const status = game.isCheckmate()
        ? `checkmate. ${game.turn() === 'w' ? 'black' : 'white'} wins.`
        : game.isStalemate()
          ? 'stalemate. draw.'
          : game.isDraw()
            ? 'draw.'
            : game.inCheck()
              ? `${game.turn() === 'w' ? 'white' : 'black'} to move - in check.`
              : `${game.turn() === 'w' ? 'white' : 'black'} to move.`;

    const recent = game.history().slice(-8);

    return (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    width: '100%',
                    aspectRatio: '1',
                    border: '1px solid rgba(128,128,128,0.35)',
                    borderRadius: 4,
                    overflow: 'hidden',
                }}
            >
                {Array.from({ length: 64 }, (_, i) => {
                    const square = squareAt(Math.floor(i / 8), i % 8);
                    const piece = game.get(square);
                    const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
                    const isSelected = selected === square;
                    const isTarget = targets.includes(square);
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
                                fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                                lineHeight: 1,
                                background: isLight ? LIGHT : DARK,
                                boxShadow: isSelected
                                    ? `inset 0 0 0 3px ${HIGHLIGHT}`
                                    : isTarget
                                      ? `inset 0 0 0 2px rgba(246,246,105,0.8)`
                                      : 'none',
                                position: 'relative',
                            }}
                        >
                            {piece && (
                                <span
                                    style={{
                                        color: piece.color === 'w' ? '#f9f9f9' : '#1a1a1a',
                                        textShadow: piece.color === 'w' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                                    }}
                                >
                                    {PIECES[`${piece.color}${piece.type.toUpperCase()}`]}
                                </span>
                            )}
                            {isTarget && !piece && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        width: '25%',
                                        height: '25%',
                                        borderRadius: '50%',
                                        background: 'rgba(0,0,0,0.25)',
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {promotion && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>promote to:</span>
                    {(['q', 'r', 'b', 'n'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => doMove(promotion.from, promotion.to, p)}
                            style={{
                                border: '1px solid rgba(128,128,128,0.4)',
                                borderRadius: 4,
                                padding: '0.15rem 0.6rem',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '1.25rem',
                            }}
                        >
                            {PIECES[`${gameRef.current!.turn()}${p.toUpperCase()}`]}
                        </button>
                    ))}
                </div>
            )}

            <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>{status}</p>

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
                    style={{
                        border: '1px solid rgba(128,128,128,0.4)',
                        borderRadius: 4,
                        padding: '0.2rem 0.7rem',
                        background: 'transparent',
                        cursor: readOnly ? 'default' : 'pointer',
                        fontSize: '0.8rem',
                    }}
                >
                    undo
                </button>
                <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => {
                        gameRef.current!.reset();
                        setFen(gameRef.current!.fen());
                        setSelected(null);
                        setTargets([]);
                        persist();
                    }}
                    style={{
                        border: '1px solid rgba(128,128,128,0.4)',
                        borderRadius: 4,
                        padding: '0.2rem 0.7rem',
                        background: 'transparent',
                        cursor: readOnly ? 'default' : 'pointer',
                        fontSize: '0.8rem',
                    }}
                >
                    new game
                </button>
            </div>

            {recent.length > 0 && (
                <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>
                    {recent.join(' ')}
                </p>
            )}
        </div>
    );
}
