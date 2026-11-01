/**
 * KnowledgeBase & Graph Capability Interface
 * 
 * Exposes the note and document knowledge graph (links and backlinks)
 * and pluggable link extractors to the plugin system.
 */

export interface Backlink {
    noteId: string;
    noteTitle: string;
    context: string;
    linkCount: number;
}

export interface ExtractedLink {
    targetTitle: string;
    targetId?: string;
    linkType?: 'wiki' | 'canvas-edge' | 'citation' | 'semantic' | 'code-import' | string;
    contextSnippet?: string;
    metadata?: Record<string, any>;
}

export interface BacklinkDetail {
    sourceId: string;
    sourceTitle: string;
    targetTitle: string;
    targetId?: string;
    linkType: string;
    spaceId: string;
    contextSnippet?: string;
    metadata?: Record<string, any>;
    updatedAt?: number;
}

export interface LinkExtractorCapability {
    id: string;
    supportedDocTypes?: string[]; // e.g. ['note', 'canvas', 'mindmap', '*']
    extractLinks(doc: { id: string; title?: string; content?: string; data?: any; type?: string; spaceId?: string }): ExtractedLink[] | Promise<ExtractedLink[]>;
}

export interface BatchIngestOptions {
    spaceId?: string;
    dirty?: boolean;
    extractLinks?: boolean;
}

export interface BatchIngestResult {
    count: number;
    durationMs: number;
    spaceId: string;
}

export interface KnowledgeGraph {
    forward: Record<string, string[]>; // noteId -> targetTitles
    backlinks: Record<string, string[]>; // targetTitle -> noteIds
}

export interface KnowledgeBase {
    /** Get all notes that link to the specified title */
    getBacklinks(noteTitle: string): Backlink[];

    /** Get rich backlink details including snippets, link types, and metadata */
    getBacklinkDetails?(noteTitle: string, options?: { spaceId?: string; linkType?: string }): Promise<BacklinkDetail[]>;

    /** Get all titles linked from the specified noteId */
    getForwardLinks(noteId: string): string[];

    /** Get outgoing links from the specified document */
    getOutgoingLinks?(noteId: string, options?: { spaceId?: string; linkType?: string }): Promise<ExtractedLink[]>;

    /** Get the raw graph state */
    getGraph(): KnowledgeGraph;

    /** Manually trigger a full graph re-index */
    rebuildGraph(): void;
}

