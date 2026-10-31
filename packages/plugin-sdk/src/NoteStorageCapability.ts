import { Document } from './Document';

export interface NoteStorageCapability {
  get(id: string): Promise<Document | null>;
  create(document: Document): Promise<Document>;
  update(document: Document): Promise<Document>;
  delete(id: string): Promise<void>;
  list(): Promise<Document[]>;
  /** Limits for PDF/EPUB/CBZ in this space. Null or missing means unsupported. */
  nativeFileSupport?(): { maxBytes: number; chunkBytes: number } | null;
  /** Bytes of a native file (folder, runtime, or cloud blob). */
  readBytes?(id: string): Promise<ArrayBuffer | null>;
  /** Replace bytes of an existing document. Markdown stubs of a native type convert in place (same id). */
  writeBytes?(id: string, bytes: ArrayBuffer): Promise<void>;
  /** Write a native file into the Space (not a markdown wrapper). Pass `id` to convert an existing document in place. */
  createNativeFile?(input: {
    type: string;
    fileName: string;
    bytes?: ArrayBuffer;
    file?: File;
    folderId?: string | null;
    id?: string;
    onProgress?: (progress: { loaded: number; total: number; phase: 'upload' | 'save' }) => void;
  }): Promise<Document>;
}
