/**
 * CenterPaneOverlay Capability Interface
 * 
 * Allows plugins to render overlay content in the center pane (dashboard/editor area).
 * This is useful for floating buttons, status indicators, or other UI elements that 
 * need to be visible regardless of the active content.
 */

import { PluginContext } from './PluginContext';

export interface CenterPaneOverlay {
    /** Unique overlay identifier */
    id: string;

    /** Overlay name */
    name: string;

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
