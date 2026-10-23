/**
 * Note Service Capability Interface
 * 
 * Exposes standard note operations (create, save, delete) to other plugins.
 * This decouples plugins from the specific UI implementation/state.
 */

export interface Note {
    id: string;
    title: string;
    content: string;
    updatedAt: Date;
    tags?: string[];
    [key: string]: any;
}

export interface NoteService {
    /**
     * Get the currently active/open note
     */
    getCurrentNote(): Note | null;

    /**
     * Create a new note
     */
    createNote(title: string, content?: string): Promise<Note>;

    /**
     * Save changes to a note
     */
    saveNote(noteId: string, content: string, title?: string): Promise<void>;

    /**
     * Delete a note
     */
    deleteNote(noteId: string): Promise<void>;

    /**
     * Open a note in the editor
     */
    openNote(noteId: string): void;

    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges(): boolean;
}
