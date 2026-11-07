import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import { Loader2 } from 'lucide-react';
import { ExtensionSlot } from '@/components/layout/ExtensionSlot';
import {
  formatError,
  generateConceptPlan,
  loadTutorHistory,
  sendTutorMessage,
} from './ai';
import { EmptyState } from './EmptyState';
import { MapRail } from './MapStrip';
import { PlaygroundHost } from './playgrounds/PlaygroundHost';
import {
  conceptSummary,
  emptyConceptData,
  markNodeDone,
  normalizeConceptData,
  updateNodePlayground,
} from './schema';
import { TutorDock, TUTOR_WIDTH_PX } from './TutorDock';
import type {
  ConceptData,
  ConceptSeed,
  PlaygroundSpec,
  TutorMessage,
} from './types';

const LG_MQ = '(min-width: 1024px)';

function useIsLg(): boolean {
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(LG_MQ).matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia(LG_MQ);
    const onChange = () => setIsLg(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isLg;
}

function activeNode(data: ConceptData) {
  return data.map.nodes.find((n) => n.id === data.activeNodeId) || null;
}

/** Fill the locked DynamicEditor pane; never grow past the viewport. */
const SHELL =
  'flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-background';

const SHELL_STYLE: CSSProperties = {
  height: '100%',
  maxHeight: '100%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

export function ConceptEditor(props: EditorProps) {
  const note = props.currentNote as
    | { id?: string; data?: unknown; content?: string; title?: string }
    | null
    | undefined;

  const [data, setData] = useState<ConceptData>(() =>
    normalizeConceptData(note?.data),
  );
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [tutorBusy, setTutorBusy] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [planStream, setPlanStream] = useState('');
  const [mobileTab, setMobileTab] = useState<
    'map' | 'learn' | 'tutor'
  >('learn');
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const isLg = useIsLg();

  // Desktop split layout must never keep a leftover mobile "tutor" fill state.
  useEffect(() => {
    if (isLg && mobileTab !== 'learn') setMobileTab('learn');
  }, [isLg, mobileTab]);

  const dataRef = useRef(data);
  const onDataChangeRef = useRef(props.onDataChange);
  const onChangeRef = useRef(props.onChange);
  const onTitleChangeRef = useRef(props.onTitleChange);
  const abortRef = useRef<AbortController | null>(null);
  const autoBuildKeyRef = useRef<string | null>(null);
  const loadedThreadRef = useRef<string | null>(null);

  dataRef.current = data;
  onDataChangeRef.current = props.onDataChange;
  onChangeRef.current = props.onChange;
  onTitleChangeRef.current = props.onTitleChange;

  const commit = (next: ConceptData, title?: string) => {
    dataRef.current = next;
    setData(next);
    onDataChangeRef.current?.(next);
    onChangeRef.current?.(conceptSummary(next));
    if (title) onTitleChangeRef.current?.(title);
  };

  const startFromSeed = async (seed: ConceptSeed) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const building: ConceptData = {
      ...emptyConceptData(),
      seed,
      building: true,
      buildError: undefined,
      tutorThreadId: dataRef.current.tutorThreadId,
    };
    commit(building, seed.topic);
    setPlanStream('');

    const plan = await generateConceptPlan({
      seed,
      signal: controller.signal,
      onChunk: setPlanStream,
    });
    if (controller.signal.aborted) return;
    commit(
      {
        ...plan,
        tutorThreadId: dataRef.current.tutorThreadId || plan.tutorThreadId,
      },
      seed.topic,
    );
    setPlanStream('');
  };

  useEffect(() => {
    const next = normalizeConceptData(note?.data);
    setData(next);
  }, [note?.id, note?.data]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // concept_create / Learn this may open a seeded doc with an empty map.
  useEffect(() => {
    if (!data.seed || data.building || data.map.nodes.length > 0) return;
    const key = `${note?.id || ''}:${data.seed.topic}:${data.seed.raw || ''}`;
    if (autoBuildKeyRef.current === key) return;
    autoBuildKeyRef.current = key;
    void startFromSeed(data.seed);
  }, [note?.id, data.seed, data.building, data.map.nodes.length]);

  useEffect(() => {
    setTutorMessages([]);
    loadedThreadRef.current = null;
  }, [note?.id]);

  // Reload tutor transcript from runtime chat-store when opening a concept.
  useEffect(() => {
    const threadId = data.tutorThreadId;
    if (!threadId || data.building) return;
    if (loadedThreadRef.current === threadId) return;
    loadedThreadRef.current = threadId;
    let cancelled = false;
    void loadTutorHistory(threadId).then((messages) => {
      if (cancelled) return;
      setTutorMessages(messages);
    });
    return () => {
      cancelled = true;
    };
  }, [data.tutorThreadId, data.building, note?.id]);

  const onTutorSend = async (text: string) => {
    setTutorError(null);
    setTutorBusy(true);
    setStreaming('');
    const history = tutorMessages.map((m) => ({
      role: m.role,
      content: m.text,
    }));
    setTutorMessages((prev) => [...prev, { role: 'user', text }]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendTutorMessage({
        concept: dataRef.current,
        userText: text,
        history,
        signal: controller.signal,
        onChunk: setStreaming,
      });
      if (controller.signal.aborted) return;
      setStreaming('');
      setTutorMessages((prev) => [
        ...prev,
        { role: 'assistant', text: result.text || '(empty reply)' },
      ]);
      if (result.tutorThreadId !== dataRef.current.tutorThreadId) {
        commit({ ...dataRef.current, tutorThreadId: result.tutorThreadId });
        loadedThreadRef.current = result.tutorThreadId;
      }
    } catch (err) {
      setTutorError(formatError(err));
      setStreaming('');
    } finally {
      setTutorBusy(false);
    }
  };

  if (!data.seed && !data.building) {
    return (
      <div className={SHELL} style={SHELL_STYLE}>
        <EmptyState onStart={(seed) => void startFromSeed(seed)} />
      </div>
    );
  }

  if (data.building) {
    return (
      <div
        className={`${SHELL} items-center justify-center gap-3 px-6`}
        style={SHELL_STYLE}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">
          Building a map for {data.seed?.topic || 'your concept'}...
        </p>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Uses the same AI backend as Chat, without note tools. Pi returns the
          full reply when the model finishes (you may not see tokens until then).
        </p>
        {planStream ? (
          <pre className="mt-2 max-h-40 w-full max-w-lg overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {planStream.slice(-800)}
          </pre>
        ) : null}
        <button
          type="button"
          className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/50"
          onClick={() => {
            abortRef.current?.abort();
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  const node = activeNode(data);

  const showMap = isLg || mobileTab === 'map';
  const showLearn = isLg || mobileTab === 'learn';
  const showTutor = isLg || mobileTab === 'tutor';
  const tutorFill = !isLg && mobileTab === 'tutor';

  return (
    <div className={SHELL} style={SHELL_STYLE}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {data.seed?.topic || note?.title || 'Concept'}
          </div>
          {data.buildError ? (
            <div className="truncate text-[11px] text-amber-600">
              AI plan failed ({data.buildError}). Showing local fallback.
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              {data.progress.completedNodeIds.length}/
              {data.map.nodes.length} nodes done
            </div>
          )}
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/50"
            onClick={() => {
              if (data.seed) void startFromSeed(data.seed);
            }}
          >
            Rebuild
          </button>
          <ExtensionSlot
            id="document-title-actions"
            className="relative flex items-center gap-1"
            currentNote={props.currentNote}
            content={props.content}
            data={(props.currentNote as { data?: unknown } | null | undefined)?.data}
          />
        </div>
      </div>

      {!isLg ? (
        <div className="flex shrink-0 gap-1 border-b border-border px-2 py-1">
          {(['map', 'learn', 'tutor'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded px-2 py-1 text-xs capitalize ${
                mobileTab === tab
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setMobileTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="flex min-h-0 flex-1 overflow-hidden"
        style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden' }}
      >
        {showMap ? (
          <div className="h-full min-h-0 shrink-0">
            <MapRail
              data={data}
              collapsed={mapCollapsed}
              onToggleCollapsed={() => setMapCollapsed((v) => !v)}
              onSelect={(id) => {
                commit({ ...data, activeNodeId: id });
                if (!isLg) setMobileTab('learn');
              }}
            />
          </div>
        ) : null}

        {showLearn ? (
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            style={{ flex: '1 1 0%', minWidth: 0 }}
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
              <section className="min-h-0 overflow-y-auto border-b border-border p-4 lg:border-b-0 lg:border-r">
                <h2 className="text-sm font-semibold">
                  {node?.title || 'Explain'}
                </h2>
                {data.seed?.mode === 'spark' && data.seed.raw ? (
                  <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
                    {data.seed.raw.slice(0, 280)}
                    {data.seed.raw.length > 280 ? '…' : ''}
                  </blockquote>
                ) : null}
                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {node?.explainMd || 'Select a node on the map.'}
                </div>
              </section>
              <section className="min-h-0 overflow-y-auto p-4">
                <h2 className="mb-3 text-sm font-semibold">Playground</h2>
                {node ? (
                  <PlaygroundHost
                    playground={node.playground}
                    onChange={(next: PlaygroundSpec) =>
                      commit(updateNodePlayground(data, node.id, next))
                    }
                    onComplete={() => commit(markNodeDone(data, node.id))}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No active node.</p>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {showTutor ? (
          <div
            className="h-full min-h-0"
            style={
              tutorFill
                ? { flex: '1 1 auto', minWidth: 0, width: '100%' }
                : {
                    flex: `0 0 ${TUTOR_WIDTH_PX}px`,
                    width: TUTOR_WIDTH_PX,
                    maxWidth: TUTOR_WIDTH_PX,
                    minWidth: 0,
                  }
            }
          >
            <TutorDock
              messages={tutorMessages}
              streaming={streaming}
              busy={tutorBusy}
              error={tutorError}
              fillWidth={tutorFill}
              onSend={(t) => void onTutorSend(t)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { createConceptDocument } from './schema';
