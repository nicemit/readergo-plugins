export interface PinNoteService {
    isPinned(noteId: string): boolean;
    pinNote(noteId: string): void;
    unpinNote(noteId: string): void;
    getPinnedNoteIds(): string[];
    onPinnedNotesChange(callback: (noteIds: string[]) => void): () => void;
}
