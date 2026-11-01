/**
 * EditorExtension Capability Interface
 * 
 * Allows plugins to extend document editors with custom extensions,
 * commands, toolbar items, and keyboard shortcuts.
 * Completely editor-agnostic: does not import or depend on any editor library.
 */

export interface ToolbarItem<TEditor = unknown> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (editor: TEditor) => void;
  isActive?: (editor: TEditor) => boolean;
  isDisabled?: (editor: TEditor) => boolean;
}

export interface EditorExtension<TEditor = unknown, TExtension = unknown> {
  /** Unique extension identifier */
  id: string;

  /** Extension name */
  name: string;

  /** Get editor extension(s) to register */
  getExtensions(editor?: TEditor): TExtension | TExtension[];

  /** Custom commands */
  commands?: Record<string, (editor: TEditor) => void>;

  /** Toolbar items */
  toolbarItems?: ToolbarItem<TEditor>[];

  /** Keyboard shortcuts */
  shortcuts?: Record<string, (editor: TEditor) => void>;
}
