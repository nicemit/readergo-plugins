export const CONCEPT_TYPE = 'concept';

export type PlaygroundKind =
  | 'scenario'
  | 'matrix'
  | 'timeline'
  | 'sampler'
  | 'check';

export type ConceptNodeStatus = 'locked' | 'ready' | 'done';

export interface ScenarioPlayground {
  kind: 'scenario';
  prompt: string;
  choices: Array<{ id: string; label: string; outcome: string; reveals?: string }>;
  state?: { chosenId?: string };
}

export interface MatrixPlayground {
  kind: 'matrix';
  rowLabels: [string, string];
  colLabels: [string, string];
  payoffs: [[string, string], [string, string]];
  hint?: string;
  state?: { selectedRow?: number; selectedCol?: number };
}

export interface TimelinePlayground {
  kind: 'timeline';
  events: Array<{ id: string; year: string; title: string; blurb: string }>;
  state?: { selectedId?: string };
}

export interface SamplerPlayground {
  kind: 'sampler';
  label: string;
  probability: number;
  trialsSuggested: number;
  state?: { trials: number; successes: number };
}

export interface CheckPlayground {
  kind: 'check';
  questions: Array<{
    id: string;
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  state?: { answers: Record<string, number> };
}

export type PlaygroundSpec =
  | ScenarioPlayground
  | MatrixPlayground
  | TimelinePlayground
  | SamplerPlayground
  | CheckPlayground;

export interface ConceptNode {
  id: string;
  title: string;
  status: ConceptNodeStatus;
  explainMd: string;
  playground: PlaygroundSpec;
}

export interface ConceptSeed {
  mode: 'topic' | 'spark';
  topic: string;
  raw?: string;
  sourceUrl?: string;
}

export interface ConceptData {
  version: 1;
  seed: ConceptSeed | null;
  map: { nodes: ConceptNode[] };
  activeNodeId: string | null;
  tutorThreadId?: string;
  progress: { completedNodeIds: string[] };
  buildError?: string;
  building?: boolean;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  text: string;
}
