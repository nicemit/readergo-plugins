'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Loader2, Search } from 'lucide-react';
import { getCanvasDocIcon, resolveCanvasTitle, type CanvasDisplayFields } from './displayUtils';
import type { CanvasHostAPI } from './hostApi';

type ListRow = CanvasDisplayFields & { id: string };

export function CanvasDocPickerModal({
  open,
  onClose,
  onPick,
  excludeRefIds,
  api,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (row: { id: string; title: string; type: string; content?: string }) => void;
  excludeRefIds: Set<string>;
  api: CanvasHostAPI;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listNotes();
      setRows(
        list.map((n) => ({
          id: String((n as ListRow).id),
          title: (n as ListRow).title,
          content: (n as ListRow).content,
          type: (n as ListRow).type,
          data: (n as ListRow).data,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => !excludeRefIds.has(r.id));
    if (!q) return list;
    return list.filter((r) => {
      const title = resolveCanvasTitle(r).toLowerCase();
      const typ = (r.type || '').toLowerCase();
      return title.includes(q) || typ.includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [rows, query, excludeRefIds]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add document to canvas"
        className="relative z-10 flex max-h-[min(70vh,520px)] w-[min(96vw,420px)] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="min-w-0 flex-1 bg-transparent py-1 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="px-4 py-8 text-center text-sm text-red-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              {rows.length === 0 ? 'No notes found.' : 'No matching notes (or all already on the board).'}
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((r) => {
                const title = resolveCanvasTitle(r);
                const typ = r.type || 'note';
                const Icon = getCanvasDocIcon(typ);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onPick({
                          id: r.id,
                          title,
                          type: typ,
                          content: typeof r.content === 'string' ? r.content : undefined,
                        })
                      }
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
                        'text-zinc-200 hover:bg-zinc-800/80',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                      <span className="shrink-0 rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                        {typ}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!loading && !error && rows.length > 0 ? (
          <div className="border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-600">
            Notes on this canvas are hidden from the list.
          </div>
        ) : null}
      </div>
    </div>
  );
}
