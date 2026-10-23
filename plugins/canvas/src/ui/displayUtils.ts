import type { PluginIcon } from '@readergo/plugin-sdk';
// audit-ignore: sdk-boundary
import { getDocumentTypeIcon } from '@/lib/notes/noteListDisplay';

export type CanvasDisplayFields = {
  title?: string | null;
  content?: string | null;
  type?: string | null;
  data?: unknown;
};

function firstContentLine(content: string | null | undefined): string {
  const first = (content ?? '').trim().split('\n')[0]?.trim() ?? '';
  return first
    .replace(/^#+\s*/, '')
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^_(.+)_$/, '$1')
    .trim();
}

function toTitleCase(value: string): string {
  if (!value) return '';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function resolveCanvasTitle(note: CanvasDisplayFields): string {
  const title = typeof note.title === 'string' ? note.title.trim() : '';
  if (title) return title;

  const fallback = firstContentLine(note.content);
  if (fallback) return fallback;

  const type = (note.type ?? 'note').trim().toLowerCase();
  if (type === 'whiteboard') return 'Untitled Whiteboard';
  if (!type) return 'Document';
  return `Untitled ${toTitleCase(type)}`;
}

export function getCanvasDocIcon(type: string | null | undefined): PluginIcon {
  return getDocumentTypeIcon(type);
}

/** Plain-text card preview: strip HTML/markdown noise; keep paragraph breaks for height. */
export function previewSnippet(content: string | null | undefined, maxLen = 900): string {
  if (!content) return '';
  let text = content
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) return '';
  const lines = text.split('\n').slice(0, 28);
  text = lines.join('\n').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

/** @deprecated Prefer measuring the rendered card; kept for callers that need a guess. */
export function estimateCanvasCardHeight(preview: string, width: number): number {
  const header = 56;
  const verticalPad = 20;
  const lineHeight = 18;
  const minH = 112;
  const maxH = 640;
  const innerW = Math.max(80, width - 28);
  const avgChar = 6.6;
  const charsPerLine = Math.max(18, Math.round(innerW / avgChar));
  const text = (preview || '').trim();
  if (!text) return minH;
  let lines = 0;
  for (const para of text.split('\n')) {
    const len = para.trim().length || 1;
    lines += Math.max(1, Math.ceil(len / charsPerLine));
  }
  return Math.max(minH, Math.min(maxH, header + verticalPad + lines * lineHeight));
}

function countRecordKeys(value: unknown): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.keys(value as Record<string, unknown>).length;
}

/** Best-effort preview for any document type placed on a canvas card. */
export function resolveCanvasPreview(note: CanvasDisplayFields): string {
  const fromContent = previewSnippet(note.content);
  if (fromContent) return fromContent;

  const type = (note.type ?? 'note').trim().toLowerCase();
  const data = note.data && typeof note.data === 'object' ? (note.data as Record<string, unknown>) : null;
  if (!data) return '';

  if (type === 'whiteboard') {
    const n = countRecordKeys(data.nodes);
    return n > 0 ? `Whiteboard · ${n} card${n === 1 ? '' : 's'}` : 'Empty whiteboard';
  }
  if (type === 'graph') {
    const n = countRecordKeys(data.nodes);
    return n > 0 ? `Graph · ${n} node${n === 1 ? '' : 's'}` : 'Empty graph';
  }
  if (type === 'canvas') {
    const n = countRecordKeys(data.nodes);
    return n > 0 ? `Canvas · ${n} document${n === 1 ? '' : 's'}` : 'Empty canvas';
  }
  if (type === 'spreadsheet') {
    return 'Spreadsheet';
  }
  return '';
}
