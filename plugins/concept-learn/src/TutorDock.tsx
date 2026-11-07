import { useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import type { TutorMessage } from './types';

export const TUTOR_DOCK_WIDTH_CLASS = 'w-[22rem] max-w-[22rem]';

export function TutorDock({
  messages,
  streaming,
  busy,
  onSend,
  error,
  fillWidth,
}: {
  messages: TutorMessage[];
  streaming?: string;
  busy?: boolean;
  error?: string | null;
  onSend: (text: string) => void;
  /** Mobile tutor tab: use full width. Desktop dock stays fixed. */
  fillWidth?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    onSend(text);
  };

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col border-l border-border bg-background ${
        fillWidth ? 'w-full max-w-none' : TUTOR_DOCK_WIDTH_CLASS
      }`}
    >
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="text-sm font-medium">Tutor</div>
        <p className="text-[11px] text-muted-foreground">
          Socratic help on this concept. Model settings live in Chat.
        </p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 && !streaming ? (
          <p className="text-xs text-muted-foreground">
            Ask what confuses you, or say &quot;quiz me on this node.&quot;
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}-${m.text.slice(0, 12)}`}
            className={`max-w-full break-words rounded-md px-2.5 py-2 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'ml-4 bg-primary/10'
                : 'mr-2 border border-border bg-muted/30'
            }`}
          >
            {m.text}
          </div>
        ))}
        {streaming ? (
          <div className="mr-2 max-w-full break-words rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm leading-relaxed">
            {streaming}
            <Loader2 className="ml-1 inline h-3 w-3 animate-spin opacity-60" />
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive break-words">{error}</p> : null}
      </div>

      <div className="shrink-0 border-t border-border bg-background p-2">
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Ask the tutor..."
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-3 text-primary-foreground disabled:opacity-50"
            disabled={busy || !draft.trim()}
            onClick={submit}
            aria-label="Send"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
