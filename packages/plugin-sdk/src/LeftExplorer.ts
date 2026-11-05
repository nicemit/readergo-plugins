/**
 * Left explorer capability.
 *
 * One plugin fills the documents left column (folder tree, tag tree, etc.).
 * The host owns the notes and folders lists and passes them in as render props.
 */

import type { ComponentType, ReactNode } from 'react';
import type { PluginContext, PluginIcon } from './PluginContext';

export const LEFT_EXPLORER_CAPABILITY = 'left-explorer';

export interface LeftExplorerFolder {
  id: string;
  name: string;
  parentId?: string | null;
  path?: string;
  userId?: string;
  noteCount?: number;
  childCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  children?: LeftExplorerFolder[];
  _count?: {
    notes: number;
    children: number;
  };
}

export interface LeftExplorerNote {
  id: string;
  title: string;
  content?: string;
  data?: unknown;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string | null;
}

export interface LeftExplorerRenderProps {
  noteId: string | null;
  context: PluginContext;
  notes: LeftExplorerNote[];
  folders: LeftExplorerFolder[];
  selectedNoteId?: string | null;
  onNavigateToNote?: (noteId: string) => void;
  onCreateNote?: (folderId?: string) => void;
  onDuplicateNote?: (noteId: string, noteTitle: string) => void;
  onMoveNote?: (noteId: string, noteTitle: string) => void;
  onDeleteNote?: (noteId: string, noteTitle: string) => void;
  onOpenReadible?: (noteId: string) => void;
  onFoldersUpdated?: () => void;
  onCreateFolder?: (name: string, parentId?: string) => Promise<void>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder?: (folderId: string) => Promise<void>;
}

export interface LeftExplorer {
  id: string;
  name: string;
  icon?: PluginIcon | ComponentType<{ className?: string }>;
  order?: number;
  render(props: LeftExplorerRenderProps): ReactNode;
}
