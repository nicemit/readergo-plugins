/**
 * EditorProvider Capability Interface
 * 
 * Allows plugins to provide a full editor component replacement.
 */

import { ComponentType } from 'react';

export interface EditorProps {
    content?: string;
    onChange?: (content: string) => void;
    onSave?: (content: string) => void;
    onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
    showRawMarkdown?: boolean;
    placeholder?: string;
    className?: string;
    currentNote?: { id: string; title: string; type?: string } | null;
    onDeleteNote?: (noteId: string, noteTitle: string) => void;
    onTitleChange?: (title: string) => void;
    onTitleSave?: () => void;
    onNavigateToNote?: (noteId: string) => void;
    handleCreateNote?: (title: string) => void;
    notes?: Array<{ id: string; title: string }>;
    isLoading?: boolean;
    hideToolbars?: boolean;
    [key: string]: any;
}

export interface EditorProvider {
    /** Unique provider identifier */
    id: string;

    /** Display name */
    name: string;

    /** Description */
    description?: string;

    /** The Editor Component ID mapped by Host */
    componentId: string;

    /** Supported note types (e.g. ['note', 'article', 'spreadsheet']) */
    supportedTypes?: string[];
}
