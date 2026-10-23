/**
 * EditorExtension Capability Interface
 * 
 * Allows plugins to extend the TipTap editor with custom extensions,
 * commands, toolbar items, and keyboard shortcuts.
 */

import { Extension } from '@tiptap/core';
import { Editor } from '@tiptap/react';

export interface ToolbarItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
}

export interface EditorExtension {
  /** Unique extension identifier */
  id: string;

  /** Extension name */
  name: string;

  /** Get TipTap extension(s) to register */
  /** Note: Extensions are collected before editor creation, so editor parameter is optional */
  getExtensions(editor?: Editor): Extension | Extension[];

  /** Custom commands */
  commands?: Record<string, (editor: Editor) => void>;

  /** Toolbar items */
  toolbarItems?: ToolbarItem[];

  /** Keyboard shortcuts */
  shortcuts?: Record<string, (editor: Editor) => void>;
}

