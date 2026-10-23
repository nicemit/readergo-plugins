'use client';

import React from 'react';
import clsx from 'clsx';
import { shortRefLabel, type ResolvedDocLabel } from './CanvasNodeCard';
import type { CanvasNode } from '../types';
import type { CanvasHostAPI } from './hostApi';

export function CanvasDetailModal({
  open,
  node,
  resolved,
  onClose,
  onRemove,
  api,
}: {
  open: boolean;
  node: CanvasNode | null;
  resolved?: ResolvedDocLabel | null;
  onClose: () => void;
  onRemove: () => void;
  api: CanvasHostAPI;
}) {
  if (!open || !node) return null;

  const title = resolved?.title?.trim() ? resolved.title : `Document · ${shortRefLabel(node.refId)}`;
  const typeLabel = resolved?.type ?? 'note';

  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-3 bottom-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-100">{title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span
                className={clsx('inline-flex items-center rounded-full border px-2 py-0.5', 'border-zinc-700 bg-zinc-800')}
              >
                {typeLabel}
              </span>
              <span className="font-mono text-[11px] tabular-nums opacity-80">ref {node.refId}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => api.openNote(node.refId)}
              className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/15"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => {
                onRemove();
                onClose();
              }}
              className="rounded-md border border-rose-700/70 bg-rose-950/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900/50"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Remove only clears this card from the board - the library document stays.
        </div>
      </div>
    </div>
  );
}
