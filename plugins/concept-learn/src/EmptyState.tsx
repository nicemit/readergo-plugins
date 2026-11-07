import { useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import type { ConceptSeed } from './types';

export function EmptyState({
  onStart,
  busy,
}: {
  onStart: (seed: ConceptSeed) => void;
  busy?: boolean;
}) {
  const [topic, setTopic] = useState('');
  const [spark, setSpark] = useState('');

  const startTopic = () => {
    const t = topic.trim();
    if (!t || busy) return;
    onStart({ mode: 'topic', topic: t });
  };

  const startSpark = () => {
    const raw = spark.trim();
    if (!raw || busy) return;
    const firstLine = raw.split(/\n/)[0]?.trim() || raw.slice(0, 80);
    const topicGuess =
      firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
    onStart({ mode: 'spark', topic: topicGuess, raw });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Concept Learn</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Start from a topic or a spark (Instagram caption, note, anything). Same
          AI backend as Chat - new face for learning with a map, playgrounds, and
          a Socratic tutor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4" />
            Topic
          </div>
          <input
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="e.g. game theory"
            value={topic}
            disabled={busy}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') startTopic();
            }}
          />
          <button
            type="button"
            disabled={busy || !topic.trim()}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={startTopic}
          >
            Learn topic
          </button>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Spark
          </div>
          <textarea
            className="min-h-[6.5rem] resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Paste a caption, quote, or rough note..."
            value={spark}
            disabled={busy}
            onChange={(e) => setSpark(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !spark.trim()}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            onClick={startSpark}
          >
            Learn from spark
          </button>
        </section>
      </div>
    </div>
  );
}
