/**
 * InsightProvider Capability Interface
 * 
 * Allows plugins to provide AI-powered insights, summaries, and analysis
 */

import { Note } from './NoteStorage';
export type { Note };

export interface NoteGraph {
  nodes: Array<{
    id: string;
    title: string;
    tags: string[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    strength: number;
    sharedTags?: string[];
  }>;
}

export interface InsightOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface InsightProvider {
  /** Unique provider identifier */
  id: string;

  /** Provider name */
  name: string;

  /** Generate summary for a note */
  summarize(note: Note, options?: InsightOptions): Promise<string>;

  /** Extract key points from a note */
  extractKeyPoints(note: Note, options?: InsightOptions): Promise<string[]>;

  /** Extract tags/keywords from a note */
  extractTags(note: Note, options?: InsightOptions): Promise<string[]>;

  /** Find related notes */
  findRelated(note: Note, limit?: number): Promise<Note[]>;

  /** Build note connection graph */
  buildGraph(notes: Note[]): Promise<NoteGraph>;
}

