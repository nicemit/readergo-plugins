/**
 * FolderStorage Capability Interface
 * 
 * Allows plugins to provide folder storage backends
 */

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  path?: string;
  spaceId?: string;
  noteCount?: number;
  childCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FolderStorage {
  /** Unique storage identifier */
  id: string;

  /** Storage name */
  name: string;

  /** List all folders */
  listFolders(): Promise<Folder[]>;

  /** Create a new folder */
  createFolder(name: string, parentId?: string | null): Promise<Folder>;

  /** Rename a folder */
  renameFolder(folderId: string, newName: string): Promise<Folder>;

  /** Delete a folder */
  deleteFolder(folderId: string): Promise<void>;

  /** Move a note to a folder */
  moveNoteToFolder(noteId: string, folderId: string | null): Promise<void>;
}
