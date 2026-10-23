import { FilesystemCapability } from './Filesystem';
import { NoteStorageCapability } from './NoteStorageCapability';

/**
 * Standard Capabilities Mapping
 * 
 * Defines standard interfaces for plugins to depend on. 
 * Allows strong typing for `context.getCapability<any>('service')`.
 */

// Legacy
export interface INoteStorage {
    getNote(id: string): Promise<any | null>;
    listNotes(): Promise<any[]>;
    getAllNotes?(): Promise<any[]>; // Optional generic sweep
    saveNote?(note: any): Promise<void>;
    deleteNote?(id: string): Promise<void>;
}



/**
 * Known Standard Capabilities mapped by string ID
 */
export interface StandardCapabilities {
    'note-storage': NoteStorageCapability;
    'filesystem': FilesystemCapability;
    'legacy-note-storage': INoteStorage;
}
