import React from 'react';

export interface Document {
  id: string;
  type: string;
  title?: string;
  content?: string;
  data?: any;
  metadata?: Record<string, any>;
  status?: string;
  spaceId?: string;
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  folders?: Array<{ folderId: string }>;
}

export interface EditorCapability {
  onMount?(document: Document): void;
  onUnmount?(): void;
  save?(): Promise<Document>;
}

/**
 * Standard Text Formatting Capability for rich text & markdown editors.
 * Implemented by TipTap, Canvas rich notes, Mindmap nodes, etc.
 */
export interface TextFormattingCapability extends EditorCapability {
  // History
  undo?(): void;
  redo?(): void;
  canUndo?(): boolean;
  canRedo?(): boolean;

  // Inline formatting
  toggleBold?(): void;
  toggleItalic?(): void;
  toggleUnderline?(): void;
  toggleStrike?(): void;
  toggleCode?(): void;

  // Block formatting
  toggleHeading?(level: 1 | 2 | 3 | 4 | 5 | 6): void;
  toggleParagraph?(): void;
  toggleBulletList?(): void;
  toggleOrderedList?(): void;
  toggleTaskList?(): void;
  toggleBlockquote?(): void;
  toggleCodeBlock?(): void;

  // Lists & structure
  indent?(): void;
  outdent?(): void;
  insertHorizontalRule?(): void;

  // Alignment
  setTextAlign?(alignment: 'left' | 'center' | 'right' | 'justify'): void;

  // Query state (for active highlight in toolbar)
  isActive?(name: string, attributes?: Record<string, any>): boolean;
}

export interface EditorRegistration {
  type: string;
  component: React.FC<any>;
  capabilityId?: string;
  loadingComponent?: React.FC<any>;
}

export interface DocumentStorageProvider {
  create(doc: Document): Promise<Document>;
  update(doc: Document): Promise<Document>;
  get(id: string): Promise<Document | null>;
  list(spaceId?: string): Promise<Document[]>;
  delete(id: string): Promise<void>;
}
