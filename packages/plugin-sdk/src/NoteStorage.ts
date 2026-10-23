/**
 * NoteStorage Capability Interface
 * 
 * Allows plugins to provide note storage backends
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'article' | 'journal';
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  folders?: Array<{ folderId: string }>;
}

export interface NoteFilters {
  folderId?: string;
  status?: 'draft' | 'published' | 'archived';
  type?: 'note' | 'article' | 'journal';
  search?: string;
}

export interface NoteStorage {
  /** Unique storage identifier */
  id: string;

  /** Storage name */
  name: string;

  // --- Legacy API (kept for backward compat) ---

  /** List notes with optional filters */
  listNotes(filters?: NoteFilters): Promise<Note[]>;

  /** Get a single note by ID */
  getNote(id: string): Promise<Note | null>;

  /** Save a note (create or update) */
  saveNote(note: Partial<Note> & { id?: string }): Promise<Note>;

  /** Delete a note */
  deleteNote(id: string): Promise<void>;

  /** Watch for note changes */
  watchNotes(callback: (notes: Note[]) => void): () => void;

  // --- New NoteStorageCapability API ---

  /** Get a note by ID */
  get(id: string): Promise<Note | null>;

  /** List all notes */
  list(): Promise<Note[]>;

  /** Create a new note */
  create(note: Partial<Note> & { id?: string }): Promise<void>;

  /** Update an existing note */
  update(note: Partial<Note> & { id?: string }): Promise<void>;

  /** Delete a note by ID */
  delete(id: string): Promise<void>;
}

