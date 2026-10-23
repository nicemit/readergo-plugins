// audit-ignore: sdk-boundary
import { CapabilityClient } from '@/lib/platform/CapabilityClient';
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions';
import type { CanvasHostAPI, CanvasHostNote } from './hostApi';

function asHostNote(row: any, fallbackId?: string): CanvasHostNote | null {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id ?? fallbackId ?? '');
  if (!id) return null;
  return {
    id,
    title: typeof row.title === 'string' ? row.title : undefined,
    content: typeof row.content === 'string' ? row.content : undefined,
    type: typeof row.type === 'string' ? row.type : 'note',
    data: row.data,
  };
}

/** Host bridge for canvas cards - always loads full notes via CapabilityClient. */
export function createCanvasHostAPI(opts: {
  notes?: Array<{ id?: string; title?: string; type?: string; content?: string; data?: unknown }>;
  currentNote?: { id?: string; title?: string; type?: string; data?: unknown } | null;
  content?: string;
  onNavigateToNote?: (id: string) => void;
}): CanvasHostAPI {
  const fallbackNotes: CanvasHostNote[] = Array.isArray(opts.notes)
    ? opts.notes
        .map((n) =>
          asHostNote({
            id: n?.id,
            title: n?.title,
            type: (n as { type?: string })?.type ?? 'note',
            // Prefer real content when the host already loaded it.
            content: typeof n?.content === 'string' && n.content.length > 0 ? n.content : undefined,
            data: (n as { data?: unknown })?.data,
          }),
        )
        .filter((n): n is CanvasHostNote => Boolean(n))
    : [];

  const listNotes: CanvasHostAPI['listNotes'] = async () => {
    try {
      const list = await CapabilityClient.getNotes();
      if (!Array.isArray(list) || list.length === 0) return fallbackNotes;
      return list.map((row) => asHostNote(row)).filter((n): n is CanvasHostNote => Boolean(n));
    } catch {
      return fallbackNotes;
    }
  };

  const getNote: CanvasHostAPI['getNote'] = async (id: string) => {
    if (!id) return null;
    const currentFallback =
      opts.currentNote?.id === id
        ? asHostNote({
            id,
            title: opts.currentNote.title,
            type: opts.currentNote.type ?? 'note',
            content: opts.content,
            data: opts.currentNote.data,
          })
        : null;
    const listFallback = fallbackNotes.find((n) => n.id === id) ?? null;

    try {
      const row = await CapabilityClient.getNote(id);
      const note = asHostNote(row, id);
      if (note) return note;
      return currentFallback ?? listFallback;
    } catch {
      return currentFallback ?? listFallback;
    }
  };

  const openNote: CanvasHostAPI['openNote'] = (id: string) => {
    if (!id) return;
    if (opts.onNavigateToNote) {
      opts.onNavigateToNote(id);
      return;
    }
    void executeCommand('readergo.core.openNote', { noteId: id });
  };

  const updateNote: CanvasHostAPI['updateNote'] = async (id: string, content: string) => {
    if (!id) return;
    await CapabilityClient.saveNote({ id, content });
  };

  return { listNotes, getNote, openNote, updateNote };
}
