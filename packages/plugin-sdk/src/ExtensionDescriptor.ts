export type ExtensionRenderStrategy = 'host' | 'iframe';

export interface BaseExtensionDescriptor {
    id: string;
    type: string;
    title?: string;
    icon?: string;
    renderStrategy: ExtensionRenderStrategy;
    schema?: Record<string, any>; // Data-driven configuration schema
    actionId?: string; // Action reference for UI interactions
}

export interface SidebarExtensionDescriptor extends BaseExtensionDescriptor {
    type: 'sidebar.panel';
    url?: string;
    position?: 'left' | 'right';
    order?: number;
}

export interface CommandExtensionDescriptor extends BaseExtensionDescriptor {
    type: 'command.palette';
    hotkey?: string;
    actionId: string;
}

export interface CenterPaneExtensionDescriptor extends BaseExtensionDescriptor {
    type: 'center.pane';
    viewModes?: string[];
    order?: number;
}

export interface NoteEditorExtensionDescriptor extends BaseExtensionDescriptor {
    type: 'note.editor';
    noteType: string;
}

export interface NoteRendererExtensionDescriptor extends BaseExtensionDescriptor {
    type: 'note.renderer';
    noteType: string;
}

export type ExtensionDescriptor =
    | SidebarExtensionDescriptor
    | CommandExtensionDescriptor
    | CenterPaneExtensionDescriptor
    | NoteEditorExtensionDescriptor
    | NoteRendererExtensionDescriptor
    | BaseExtensionDescriptor;
