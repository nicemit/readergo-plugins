/**
 * KnowledgeBase Capability Interface
 * 
 * Exposes the note knowledge graph (links and backlinks) to the plugin system.
 */

export interface Backlink {
    noteId: string;
    noteTitle: string;
    context: string;
    linkCount: number;
}

export interface KnowledgeGraph {
    forward: Record<string, string[]>; // noteId -> targetTitles
    backlinks: Record<string, string[]>; // targetTitle -> noteIds
}

export interface KnowledgeBase {
    /** Get all notes that link to the specified title */
    getBacklinks(noteTitle: string): Backlink[];

    /** Get all titles linked from the specified noteId */
    getForwardLinks(noteId: string): string[];

    /** Get the raw graph state */
    getGraph(): KnowledgeGraph;

    /** Manually trigger a full graph re-index */
    rebuildGraph(): void;
}
