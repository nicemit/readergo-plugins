export interface RelatedNote {
  id: string;
  title: string;
  snippet: string;
  reason: 'unlinked-mention' | 'keyword-overlap' | 'shared-topic';
  matchTerm: string;
  isAlreadyLinked: boolean;
  score: number;
}

export type ActionCategory = 'linking' | 'tasks' | 'critique' | 'summary' | 'structure' | 'cleanup';

export interface ActionResult {
  title: string;
  content: string;
  type: 'insert' | 'replace' | 'toast';
  summary?: string;
  details?: string[];
  undoAvailable?: boolean;
}

export interface DynamicAction {
  id: string;
  label: string;
  executingLabel?: string;
  icon: 'link' | 'tasks' | 'brain' | 'sparkles' | 'file-text' | 'shield' | 'trash';
  description: string;
  category: ActionCategory;
  execute: () => Promise<ActionResult>;
}

export interface DocumentProfile {
  title: string;
  rawText: string;
  wordCount: number;
  hasTasks: boolean;
  isTechnical: boolean;
  isMeeting: boolean;
  isProposal: boolean;
  isListOrCatalog: boolean;
  hasDuplicatesMentioned: boolean;
  topics: string[];
  entities: string[];
  headings: string[];
  existingLinks: string[];
}

export interface AgentConfig {
  systemPrompt: string;
  connectionCriteria: string;
  enableLlm: boolean;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  systemPrompt: `You are ReaderGo's in-editor Thinking Partner.
Analyze the active document deeply. Identify its true nature (curated list, technical RFC, meeting notes, project brief). Surface genuine knowledge connections across the workspace and generate high-value, dynamic actions tailored to what the user is working on.`,
  connectionCriteria: `Only connect notes with strong conceptual or explicit entity matches.
NEVER match on numbers, years (e.g. 2023, 2014, 1999), timestamps, or generic common words.
Prioritize exact titles, distinct domain concepts, and multi-word entities.`,
  enableLlm: true,
};
