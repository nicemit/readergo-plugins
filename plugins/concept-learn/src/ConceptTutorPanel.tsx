'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentChatUiPanelProps } from '@readergo/plugin-sdk';
import { formatError, loadTutorHistory, sendTutorMessage } from './ai';
import {
  getConceptSession,
  persistConceptData,
  subscribeConceptSession,
} from './conceptSession';
import { TutorDock } from './TutorDock';
import type { TutorMessage } from './types';

/**
 * Concept tutor hosted in the agent-chat dock.
 * Transcript and tools stay in this plugin.
 */
export function ConceptTutorPanel({ onClose }: AgentChatUiPanelProps) {
  const [session, setSession] = useState(getConceptSession);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedThreadRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => subscribeConceptSession(() => setSession(getConceptSession())), []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const threadId = session?.data.tutorThreadId;

  useEffect(() => {
    setMessages([]);
    loadedThreadRef.current = null;
  }, [session?.documentId]);

  useEffect(() => {
    if (!threadId || session?.data.building) return;
    if (loadedThreadRef.current === threadId) return;
    loadedThreadRef.current = threadId;
    let cancelled = false;
    void loadTutorHistory(threadId).then((history) => {
      if (!cancelled) setMessages(history);
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, session?.data.building, session?.documentId]);

  const onSend = async (text: string) => {
    const current = getConceptSession();
    if (!current || current.data.building) return;
    setError(null);
    setBusy(true);
    setStreaming('');
    const history = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }));
    setMessages((prev) => [...prev, { role: 'user', text }]);

    let concept = current.data;
    if (!concept.tutorThreadId) {
      const tutorThreadId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `concept_tutor_${crypto.randomUUID()}`
          : `concept_tutor_${Date.now()}`;
      concept = { ...concept, tutorThreadId };
      persistConceptData(concept);
      loadedThreadRef.current = tutorThreadId;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendTutorMessage({
        concept,
        userText: text,
        history,
        signal: controller.signal,
        onChunk: setStreaming,
      });
      if (controller.signal.aborted) return;
      setStreaming('');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: result.text || '(empty reply)' },
      ]);
      const latest = getConceptSession();
      if (latest && result.tutorThreadId !== latest.data.tutorThreadId) {
        persistConceptData({ ...latest.data, tutorThreadId: result.tutorThreadId });
        loadedThreadRef.current = result.tutorThreadId;
      }
      if (result.persistError) {
        setError(
          `Reply ok, but chat save failed (${result.persistError}). Check Local Runtime + SQLite chat store.`,
        );
      }
    } catch (err) {
      setError(formatError(err));
      setStreaming('');
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Open a concept to talk to the tutor.
      </div>
    );
  }

  return (
    <TutorDock
      embedded
      messages={messages}
      streaming={streaming}
      busy={busy}
      error={error}
      onClose={onClose}
      onSend={(text) => void onSend(text)}
    />
  );
}
