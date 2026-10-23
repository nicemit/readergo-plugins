'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import { PluginRuntimeProvider, usePlugin } from '@readergo/plugin-sdk';
import { CanvasPlugin } from './CanvasPlugin';
import { serializeCanvasForPersist } from './persist';
import type { CanvasNode, CanvasState } from './types';
import { CanvasHostAPIProvider } from './ui/CanvasHostAPIContext';
import { createCanvasHostAPI } from './ui/createCanvasHostAPI';

type CurrentNote = NonNullable<EditorProps['currentNote']> & { data?: unknown };

const emptyState = (): CanvasState => ({
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { kind: 'none' },
  gridSize: 32,
});

export function normalizeCanvasData(raw: unknown): CanvasState {
  if (!raw || typeof raw !== 'object') return emptyState();
  const o = raw as Record<string, unknown>;
  const nodesRaw = o.nodes;
  const edgesRaw = o.edges;
  const vpRaw = o.viewport;
  const gridRaw = o.gridSize;

  const nodesBare =
    nodesRaw && typeof nodesRaw === 'object' && !Array.isArray(nodesRaw)
      ? (nodesRaw as Record<string, Record<string, unknown>>)
      : {};
  const nodes: Record<string, CanvasNode> = {};
  for (const [nid, r] of Object.entries(nodesBare)) {
    const refId = typeof r.refId === 'string' ? r.refId : nid;
    nodes[nid] = {
      id: typeof r.id === 'string' ? r.id : nid,
      refId,
      x: Number(r.x) || 0,
      y: Number(r.y) || 0,
      width: typeof r.width === 'number' ? r.width : 240,
      height: typeof r.height === 'number' ? r.height : 160,
    };
  }

  const edges: CanvasState['edges'] = {};
  if (edgesRaw && typeof edgesRaw === 'object' && !Array.isArray(edgesRaw)) {
    for (const [eid, r] of Object.entries(edgesRaw as Record<string, Record<string, unknown>>)) {
      const from = typeof r.from === 'string' ? r.from : '';
      const to = typeof r.to === 'string' ? r.to : '';
      if (!from || !to || from === to) continue;
      if (!nodes[from] || !nodes[to]) continue;
      const id = typeof r.id === 'string' ? r.id : eid;
      edges[id] = { id, from, to };
    }
  } else if (Array.isArray(edgesRaw)) {
    for (const row of edgesRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const from = typeof r.from === 'string' ? r.from : '';
      const to = typeof r.to === 'string' ? r.to : '';
      if (!from || !to || from === to) continue;
      if (!nodes[from] || !nodes[to]) continue;
      const id = typeof r.id === 'string' ? r.id : `edge-${from}-${to}`;
      edges[id] = { id, from, to };
    }
  }

  const vp =
    vpRaw && typeof vpRaw === 'object' && !Array.isArray(vpRaw) ? (vpRaw as Record<string, unknown>) : {};
  const zoom = typeof vp.zoom === 'number' && vp.zoom > 0 ? vp.zoom : 1;
  const gridSize = typeof gridRaw === 'number' ? gridRaw : 32;

  return {
    nodes,
    edges,
    viewport: { x: Number(vp.x) || 0, y: Number(vp.y) || 0, zoom },
    selection: { kind: 'none' },
    gridSize,
  };
}

function CanvasDocumentSync({
  currentNote,
  onDataChange,
}: {
  currentNote: CurrentNote | null | undefined;
  onDataChange?: (data: ReturnType<typeof serializeCanvasForPersist>) => void;
}) {
  const { actions, state } = usePlugin() as {
    state: CanvasState;
    actions: { HYDRATE_REPLACE: (s: CanvasState) => void };
  };

  const docSnapshot = useMemo(() => JSON.stringify(normalizeCanvasData(currentNote?.data)), [currentNote?.data]);
  const lastDocSnapshotRef = useRef<string | null>(null);
  const lastPushedRef = useRef<string>('');
  const skipNextPushRef = useRef(false);
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  useEffect(() => {
    const normalized = normalizeCanvasData(currentNote?.data);
    if (lastDocSnapshotRef.current === docSnapshot) return;
    lastDocSnapshotRef.current = docSnapshot;
    skipNextPushRef.current = true;
    actions.HYDRATE_REPLACE(normalized);
    lastPushedRef.current = JSON.stringify(serializeCanvasForPersist(normalized));
  }, [currentNote?.id, docSnapshot, actions]);

  useEffect(() => {
    const cb = onDataChangeRef.current;
    if (!cb) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    const payload = serializeCanvasForPersist(state);
    const serialized = JSON.stringify(payload);
    if (serialized === lastPushedRef.current) return;
    lastPushedRef.current = serialized;
    cb(payload);
  }, [state]);

  return null;
}

export function CanvasDocumentEditor(props: EditorProps) {
  const { currentNote, onDataChange } = props;
  const Render = CanvasPlugin.render;

  const hostApi = useMemo(
    () =>
      createCanvasHostAPI({
        notes: props.notes as Array<{ id?: string; title?: string; type?: string; content?: string; data?: unknown }> | undefined,
        currentNote: currentNote as CurrentNote | null | undefined,
        content: props.content,
        onNavigateToNote: props.onNavigateToNote,
      }),
    [currentNote, props.content, props.notes, props.onNavigateToNote],
  );

  if (!currentNote?.id) return null;
  const note = currentNote as CurrentNote;

  return (
    <div key={note.id} className="h-full w-full min-h-0 flex flex-col overflow-hidden">
      <PluginRuntimeProvider plugin={CanvasPlugin}>
        <CanvasHostAPIProvider value={hostApi}>
          <CanvasDocumentSync
            currentNote={note}
            onDataChange={onDataChange as ((d: ReturnType<typeof serializeCanvasForPersist>) => void) | undefined}
          />
          <Render />
        </CanvasHostAPIProvider>
      </PluginRuntimeProvider>
    </div>
  );
}
