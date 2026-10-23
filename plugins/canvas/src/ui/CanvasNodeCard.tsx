'use client';

import React, { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { ExternalLink, Trash2 } from 'lucide-react';
import type { CanvasNode } from '../types';
import { getCanvasDocIcon } from './displayUtils';

export type ResolvedDocLabel = { title: string; type: string };

export function shortRefLabel(refId: string): string {
  if (!refId) return '-';
  return refId.length > 14 ? `${refId.slice(0, 8)}…${refId.slice(-4)}` : refId;
}

export function CanvasNodeCard({
  node,
  selected,
  resolved,
  preview,
  previewLoading,
  autoSize,
  onMeasuredSize,
  onOpen,
  onDelete,
  onConnectStart,
  onResizeStart,
}: {
  node: CanvasNode;
  selected: boolean;
  resolved?: ResolvedDocLabel | null;
  preview?: string;
  previewLoading?: boolean;
  /** When true, height follows content; measured size is reported for edges/drag. */
  autoSize: boolean;
  onMeasuredSize: (size: { width: number; height: number }) => void;
  onOpen: () => void;
  onDelete: () => void;
  onConnectStart: (clientX: number, clientY: number) => void;
  onResizeStart: (e: React.PointerEvent) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onMeasuredSizeRef = useRef(onMeasuredSize);
  onMeasuredSizeRef.current = onMeasuredSize;
  const typeKey = resolved?.type ?? 'note';
  const Icon = getCanvasDocIcon(typeKey);
  const title = resolved?.title?.trim() ? resolved.title : `Document · ${shortRefLabel(node.refId)}`;
  const typeLabel = typeKey.trim() || 'note';

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || !autoSize) return;

    const report = () => {
      // offset* is in the unscaled world layer (ancestor scale does not affect it).
      const width = Math.max(160, Math.round(el.offsetWidth));
      const height = Math.max(96, Math.round(el.offsetHeight));
      onMeasuredSizeRef.current({ width, height });
    };

    report();
    const ro = new ResizeObserver(() => report());
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoSize, preview, previewLoading, title, typeLabel, node.width]);

  return (
    <div
      ref={rootRef}
      className={clsx(
        'group relative flex w-full flex-col rounded-lg border bg-zinc-900/95 shadow-lg shadow-black/40 backdrop-blur-sm',
        autoSize ? 'h-auto' : 'h-full',
        'select-none',
        selected
          ? 'border-amber-400/80 ring-2 ring-amber-300/35 shadow-[0_0_0_1px_rgba(251,191,36,0.25),0_24px_70px_-30px_rgba(0,0,0,0.8)]'
          : 'border-zinc-700/90 hover:border-zinc-600',
        'transition-[box-shadow,border-color] duration-150',
      )}
    >
      <div
        className={clsx(
          'absolute -top-2 -right-2 z-20 flex items-center gap-1 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          type="button"
          data-node-delete
          className="rounded-full bg-rose-500/90 p-2 text-white shadow-md touch-manipulation hover:bg-rose-600 sm:p-1.5"
          title="Remove from canvas"
          aria-label="Remove from canvas"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        </button>
      </div>

      <div className="flex shrink-0 items-start gap-2.5 px-3 pt-2.5 pb-1.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/80 text-zinc-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-zinc-100" title={title}>
            {title}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">{typeLabel}</div>
        </div>
        <button
          type="button"
          data-node-open
          className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 touch-manipulation"
          title="Open document"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          aria-label="Open document"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-t border-zinc-800/80 px-3 py-2 pb-3">
        {previewLoading && !preview ? (
          <p className="text-xs leading-relaxed text-zinc-600">Loading preview…</p>
        ) : preview ? (
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-400">{preview}</p>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-600">No preview yet.</p>
        )}
      </div>

      <button
        type="button"
        data-node-connect
        className={clsx(
          'absolute -right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full',
          'cursor-crosshair touch-manipulation transition-opacity duration-150',
          selected ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        title="Drag to connect"
        aria-label="Connect to another document"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onConnectStart(e.clientX, e.clientY);
        }}
      >
        <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-300 bg-zinc-950 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]" />
      </button>

      <div
        data-node-resize
        onPointerDown={onResizeStart}
        className="absolute bottom-0 right-0 flex h-10 w-10 cursor-se-resize items-end justify-end p-1.5 touch-manipulation sm:h-6 sm:w-6 sm:p-0.5"
        title="Resize"
      >
        <span className="block h-3.5 w-3.5 rounded-sm border border-zinc-500 bg-zinc-800/90 sm:h-3 sm:w-3 hover:border-amber-400/80" />
      </div>
    </div>
  );
}
