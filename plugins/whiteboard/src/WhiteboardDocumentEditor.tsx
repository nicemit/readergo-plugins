'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import type { EditorProps } from '@readergo/plugin-sdk';
import { PluginRuntimeProvider, usePlugin } from '@readergo/plugin-sdk';
import { WhiteboardPlugin, type WhiteboardState } from './WhiteboardPlugin';

type CurrentNote = NonNullable<EditorProps['currentNote']> & { data?: unknown };

const emptyState = (): WhiteboardState => ({
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
});

export function normalizeWhiteboardData(raw: unknown): WhiteboardState {
  if (!raw || typeof raw !== 'object') return emptyState();
  const o = raw as Record<string, unknown>;
  const nodesRaw = o.nodes;
  const nodes: WhiteboardState['nodes'] =
    nodesRaw && typeof nodesRaw === 'object' && !Array.isArray(nodesRaw)
      ? (nodesRaw as WhiteboardState['nodes'])
      : {};
  const edgesRaw = o.edges;
  const edges: WhiteboardState['edges'] =
    edgesRaw && typeof edgesRaw === 'object' && !Array.isArray(edgesRaw)
      ? (edgesRaw as WhiteboardState['edges'])
      : {};
  const vpRaw = o.viewport;
  const vp =
    vpRaw && typeof vpRaw === 'object' && !Array.isArray(vpRaw)
      ? (vpRaw as Record<string, unknown>)
      : {};
  const zoom = typeof vp.zoom === 'number' && vp.zoom > 0 ? vp.zoom : 1;
  return {
    nodes,
    edges,
    viewport: {
      x: Number(vp.x) || 0,
      y: Number(vp.y) || 0,
      zoom,
    },
  };
}

function WhiteboardDocumentSync({
  currentNote,
  onDataChange,
}: {
  currentNote: CurrentNote | null | undefined;
  onDataChange?: (data: WhiteboardState) => void;
}) {
  const { actions, state } = usePlugin() as {
    state: WhiteboardState;
    actions: { HYDRATE_REPLACE: (s: WhiteboardState) => void };
  };

  const docSnapshot = useMemo(
    () => JSON.stringify(normalizeWhiteboardData(currentNote?.data)),
    [currentNote?.data],
  );

  const lastDocSnapshotRef = useRef<string | null>(null);
  const lastPushedRef = useRef<string>('');
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  useEffect(() => {
    const normalized = normalizeWhiteboardData(currentNote?.data);
    if (lastDocSnapshotRef.current === docSnapshot) return;
    lastDocSnapshotRef.current = docSnapshot;
    actions.HYDRATE_REPLACE(normalized);
    lastPushedRef.current = JSON.stringify(normalized);
  }, [currentNote?.id, docSnapshot, actions]);

  useEffect(() => {
    const cb = onDataChangeRef.current;
    if (!cb) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastPushedRef.current) return;
    lastPushedRef.current = serialized;
    cb(state);
  }, [state]);

  return null;
}

export function WhiteboardDocumentEditor(props: EditorProps) {
  const { currentNote, onDataChange } = props;
  const Render = WhiteboardPlugin.render;

  if (!currentNote?.id) {
    return null;
  }

  const note = currentNote as CurrentNote;

  return (
    <div key={note.id} className="h-full w-full min-h-0 flex flex-col">
      <PluginRuntimeProvider plugin={WhiteboardPlugin}>
        <WhiteboardDocumentSync
          currentNote={note}
          onDataChange={onDataChange as ((data: WhiteboardState) => void) | undefined}
        />
        <Render />
      </PluginRuntimeProvider>
    </div>
  );
}
