/**
 * Command System Types
 * 
 * Defines the interfaces for plugin-registered commands/actions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Serializable command metadata (safe for RPC/Worker boundary) */
export interface CommandDescriptor {
  /** Globally unique command identifier (e.g. "pollinations.beautify") */
  id: string;

  /** Human-readable command name */
  title: string;

  /** Optional description */
  description?: string;

  /** Command category (e.g. "AI", "Export", "View") */
  category?: string;

  /** Keyboard shortcut (e.g. "Mod+Shift+B") */
  shortcut?: string;

  /** Icon identifier */
  icon?: string;
}

/** What plugins pass to context.registerCommand() - descriptor + handler */
export interface CommandRegistration extends CommandDescriptor {
  handler: (payload?: any) => Promise<any> | any;
}
