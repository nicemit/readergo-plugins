/**
 * CenterPaneOverlay Capability Interface
 * 
 * Allows plugins to render overlay content in the center pane (dashboard/editor area).
 * This is useful for floating buttons, status indicators, or other UI elements that 
 * need to be visible regardless of the active content.
 */

import { PluginContext } from './PluginContext';

/**
 * workspace: small chrome that may stay up across documents.
 * active-document: a view of one note. The host hides it on any other note.
 * Omitted scope is treated as active-document so a plugin cannot cover the
 * next document by forgetting to say so.
 */
export type OverlayScope = 'active-document' | 'workspace';

/** Host emits this when the open document or center view changes. */
export const DOCUMENT_SURFACE_CHANGED = 'center-pane:note-changed';

/** A plugin emits this after it binds or clears boundNoteId. */
export const DOCUMENT_OVERLAY_UPDATED = 'center-pane-overlay:updated';

export interface CenterPaneOverlay {
    /** Unique overlay identifier */
    id: string;

    /** Overlay name */
    name: string;

    /** Who this overlay is allowed to cover. */
    scope?: OverlayScope;

    /**
     * Note this overlay is currently for.
     * Required while an active-document overlay is visible.
     * Read on each host render; a getter may follow plugin session state.
     */
    boundNoteId?: string | null;

    /** Render function for the overlay */
    renderOverlay(props: {
        context: PluginContext;
        noteId?: string | null;
        noteContent?: string;
        noteTitle?: string;
        viewMode: 'dashboard' | 'editor';
    }): React.ReactNode;

    /** Display order (lower = higher priority/z-index) */
    order?: number;
}

export function shouldShowDocumentOverlay(
    overlay: Pick<CenterPaneOverlay, 'scope' | 'boundNoteId'>,
    surface: { noteId?: string | null; viewMode: 'dashboard' | 'editor' },
): boolean {
    if (overlay.scope === 'workspace') return true;
    if (surface.viewMode !== 'editor') return false;
    if (!overlay.boundNoteId || !surface.noteId) return false;
    return overlay.boundNoteId === surface.noteId;
}
