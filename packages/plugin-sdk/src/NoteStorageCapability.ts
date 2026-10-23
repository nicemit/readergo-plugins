import { Document } from './Document';

export interface NoteStorageCapability {
  get(id: string): Promise<Document | null>;
  create(document: Document): Promise<Document>;
  update(document: Document): Promise<Document>;
  delete(id: string): Promise<void>;
  list(): Promise<Document[]>;
  /** Bytes of a native folder file. Missing on cloud notes. */
  readBytes?(id: string): Promise<ArrayBuffer | null>;
  /** Replace bytes of an existing native folder file. */
  writeBytes?(id: string, bytes: ArrayBuffer): Promise<void>;
  /** Write a native file into the Space (not a markdown wrapper). */
  createNativeFile?(input: {
    type: string;
    fileName: string;
    bytes: ArrayBuffer;
    folderId?: string | null;
  }): Promise<Document>;
}
