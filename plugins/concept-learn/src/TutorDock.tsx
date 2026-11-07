import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Loader2, Send } from 'lucide-react';
import { ChatMarkdown } from '@/plugins/agent-chat-ui/ChatMarkdown';
import type { TutorMessage } from './types';

/** Fixed desktop tutor column - never grows with message content. */
export const TUTOR_WIDTH_PX = 352; // 22rem

const DOCK_FIXED: CSSProperties = {
  height: '100%',
  maxHeight: '100%',
  minHeight: 0,
  minWidth: 0,
  width: TUTOR_WIDTH_PX,
  maxWidth: TUTOR_WIDTH_PX,
  flex: `0 0 ${TUTOR_WIDTH_PX}px`,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const DOCK_FILL: CSSProperties = {
  height: '100%',
  maxHeight: '100%',
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

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
  /** Only for the mobile tutor tab - never on desktop split layout. */
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
      className="flex h-full min-h-0 flex-col border-l border-border bg-background"
      style={fillWidth ? DOCK_FILL : DOCK_FIXED}
    >
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="text-sm font-medium">Tutor</div>
        <p className="text-[11px] text-muted-foreground">
          Socratic help on this concept. Model settings live in Chat.
        </p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3"
        style={{ flex: '1 1 0%', minHeight: 0, minWidth: 0, overflowX: 'hidden', overflowY: 'auto' }}
      >
        {/* Pin thread to the composer so replies do not leave a tall empty gap. */}
        <div className="flex min-h-full flex-col justify-end gap-3">
          {messages.length === 0 && !streaming ? (
            <p className="text-xs text-muted-foreground">
              Ask what confuses you, or say &quot;quiz me on this node.&quot;
            </p>
          ) : null}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}-${m.text.slice(0, 12)}`}
              className="max-w-full break-words rounded-md px-2.5 py-2 text-sm leading-relaxed"
              style={{
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                ...(m.role === 'user'
                  ? { marginLeft: '1rem', background: 'hsl(var(--primary) / 0.1)' }
                  : {
                      marginRight: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--muted) / 0.3)',
                    }),
              }}
            >
              {m.role === 'assistant' ? (
                <ChatMarkdown text={m.text} />
              ) : (
                m.text
              )}
            </div>
          ))}
          {streaming ? (
            <div
              className="max-w-full break-words rounded-md border border-border bg-muted/30 px-2.5 py-2 text-sm leading-relaxed"
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
              <ChatMarkdown text={streaming} />
              <Loader2 className="ml-1 inline h-3 w-3 animate-spin opacity-60" />
            </div>
          ) : null}
          {error ? (
            <p className="break-words text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background p-2" style={{ flexShrink: 0 }}>
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
