/**
 * ExportTarget Capability Interface
 * 
 * Allows plugins to provide export formats and destinations
 */

import { Note } from './NoteStorage';

export interface ExportOptions {
  format?: string;
  includeMetadata?: boolean;
  styling?: Record<string, any>;
}

export interface ExportTarget {
  /** Unique export target identifier */
  id: string;

  /** Export target name */
  name: string;

  /** Export format identifier (e.g., "pdf", "markdown", "html") */
  format: string;

  /** Export notes */
  exportNotes(notes: Note[], options?: ExportOptions): Promise<Blob | string>;

  /** Get export options schema */
  getOptionsSchema?(): Record<string, any>;
}

