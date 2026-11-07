import { useEffect, useRef, useState } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import { Loader2 } from 'lucide-react';
import { generateConceptPlan, sendTutorMessage } from './ai';
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
import { TutorDock } from './TutorDock';
import type {
  ConceptData,
  ConceptSeed,
  PlaygroundSpec,
  TutorMessage,
} from './types';

function activeNode(data: ConceptData) {
  return data.map.nodes.find((n) => n.id === data.activeNodeId) || null;
}

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
    'map' | 'explain' | 'play' | 'tutor'
  >('explain');
  const [mapCollapsed, setMapCollapsed] = useState(false);

  const dataRef = useRef(data);
  const onDataChangeRef = useRef(props.onDataChange);
  const onChangeRef = useRef(props.onChange);
  const onTitleChangeRef = useRef(props.onTitleChange);
  const abortRef = useRef<AbortController | null>(null);
  const autoBuildKeyRef = useRef<string | null>(null);

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
    };
    commit(building, seed.topic);
    setPlanStream('');
    setTutorMessages([]);

    const plan = await generateConceptPlan({
      seed,
      signal: controller.signal,
      onChunk: setPlanStream,
      persistThread: false,
    });
    if (controller.signal.aborted) return;
    commit(plan, seed.topic);
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
      }
    } catch (err) {
      setTutorError(
        err instanceof Error && err.message
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Tutor request failed',
      );
      setStreaming('');
    } finally {
      setTutorBusy(false);
    }
  };

  if (!data.seed && !data.building) {
    return (
      <div className={`h-full min-h-0 ${props.className || ''}`}>
        <EmptyState onStart={(seed) => void startFromSeed(seed)} />
      </div>
    );
  }

  if (data.building) {
    return (
      <div
        className={`flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 ${props.className || ''}`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">
          Building a map for {data.seed?.topic || 'your concept'}...
        </p>
        <p className="max-w-md text-center text-xs text-muted-foreground">
          Uses the same AI backend as Chat. If runtime is offline, a local
          fallback curriculum loads instead.
        </p>
        {planStream ? (
          <pre className="mt-2 max-h-40 w-full max-w-lg overflow-auto rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {planStream.slice(-800)}
          </pre>
        ) : null}
      </div>
    );
  }

  const node = activeNode(data);

  return (
    <div className={`flex h-full min-h-0 flex-col ${props.className || ''}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
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
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/50"
          onClick={() => {
            if (data.seed) void startFromSeed(data.seed);
          }}
        >
          Rebuild
        </button>
      </div>

      <div className="flex gap-1 border-b border-border px-2 py-1 md:hidden">
        {(['map', 'explain', 'play', 'tutor'] as const).map((tab) => (
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`h-full min-h-0 ${
            mobileTab === 'map' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <MapRail
            data={data}
            collapsed={mapCollapsed}
            onToggleCollapsed={() => setMapCollapsed((v) => !v)}
            onSelect={(id) => {
              commit({ ...data, activeNodeId: id });
              if (mobileTab === 'map') setMobileTab('explain');
            }}
          />
        </div>

        <div
          className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
            mobileTab === 'explain' || mobileTab === 'play'
              ? 'flex'
              : 'hidden md:flex'
          }`}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
            <section
              className={`min-h-0 overflow-y-auto border-b border-border p-4 md:border-b-0 md:border-r ${
                mobileTab === 'explain' ? 'block' : 'hidden md:block'
              }`}
            >
              <h2 className="text-sm font-semibold">
                {node?.title || 'Explain'}
              </h2>
              {data.seed?.mode === 'spark' && data.seed.raw ? (
                <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-xs italic text-muted-foreground">
                  {data.seed.raw.slice(0, 280)}
                  {data.seed.raw.length > 280 ? '…' : ''}
                </blockquote>
              ) : null}
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {node?.explainMd || 'Select a node on the map.'}
              </div>
            </section>
            <section
              className={`min-h-0 overflow-y-auto p-4 ${
                mobileTab === 'play' ? 'block' : 'hidden md:block'
              }`}
            >
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

        <div
          className={`h-full min-h-0 min-w-0 ${
            mobileTab === 'tutor' ? 'flex flex-1' : 'hidden md:flex'
          }`}
        >
          <TutorDock
            messages={tutorMessages}
            streaming={streaming}
            busy={tutorBusy}
            error={tutorError}
            onSend={(t) => void onTutorSend(t)}
          />
        </div>
      </div>
    </div>
  );
}

export { createConceptDocument } from './schema';
