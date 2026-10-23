/**
 * Pin Note Service
 * 
 * Manages pinned notes state with localStorage persistence
 */

export interface PinNoteService {
    isPinned(noteId: string): boolean;
    pinNote(noteId: string): void;
    unpinNote(noteId: string): void;
    getPinnedNoteIds(): string[];
    onPinnedNotesChange(callback: (noteIds: string[]) => void): () => void;
}

const STORAGE_KEY = 'pinnedNoteIds';

class PinNoteServiceImpl implements PinNoteService {
    private listeners: Set<(noteIds: string[]) => void> = new Set();

    private getPinnedIds(): string[] {
        if (typeof window === 'undefined') return [];
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    private savePinnedIds(ids: string[]): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
            this.notifyListeners(ids);
        } catch (error) {
            console.error('[PinNoteService] Failed to save pinned notes:', error);
        }
    }

    private notifyListeners(noteIds: string[]): void {
        this.listeners.forEach(callback => callback(noteIds));
    }

    isPinned(noteId: string): boolean {
        return this.getPinnedIds().includes(noteId);
    }

    pinNote(noteId: string): void {
        const ids = this.getPinnedIds();
        if (!ids.includes(noteId)) {
            ids.unshift(noteId); // Add to beginning
            this.savePinnedIds(ids);
        }
    }

    unpinNote(noteId: string): void {
        const ids = this.getPinnedIds().filter(id => id !== noteId);
        this.savePinnedIds(ids);
    }

    getPinnedNoteIds(): string[] {
        return this.getPinnedIds();
    }

    onPinnedNotesChange(callback: (noteIds: string[]) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
}

// Singleton instance
let serviceInstance: PinNoteService | null = null;

export function getPinNoteService(): PinNoteService {
    if (!serviceInstance) {
        serviceInstance = new PinNoteServiceImpl();
    }
    return serviceInstance;
}
