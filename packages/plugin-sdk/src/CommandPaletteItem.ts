/**
 * CommandPaletteItem Capability Interface
 * 
 * Allows plugins to add commands to the command palette (Cmd+K)
 */

export interface CommandContext {
  noteId?: string | null;
  selectedText?: string;
  editor?: any; // TipTap Editor instance
}

export interface CommandPaletteItem {
  /** Unique command identifier */
  id: string;

  /** Command name (displayed in palette) */
  name: string;

  /** Command description */
  description?: string;

  /** Command category */
  category?: string;

  /** Keyboard shortcut (e.g., "Mod+k") */
  shortcut?: string;

  /** Icon (optional) */
  icon?: React.ComponentType<{ className?: string }>;

  /** Execute command */
  execute(context: CommandContext): Promise<void> | void;

  /** Check if command is available */
  isAvailable?(context: CommandContext): boolean;
}

