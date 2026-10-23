/**
 * Chat reading context for the agent chat UI.
 * Publishers (notes host / editors) set document and selection.
 * The chat UI reads source through this capability or its commands.
 */

export const CHAT_SOURCE_CAPABILITY_ID = 'chat-source';

export const CHAT_SOURCE_COMMAND_GET = 'readergo.chat-source.get';
export const CHAT_SOURCE_COMMAND_GET_SOURCE = 'readergo.chat-source.getSource';
export const CHAT_SOURCE_COMMAND_SET_DOCUMENT = 'readergo.chat-source.setDocument';
export const CHAT_SOURCE_COMMAND_SET_SELECTION = 'readergo.chat-source.setSelection';
export const CHAT_SOURCE_COMMAND_CLEAR_SELECTION = 'readergo.chat-source.clearSelection';
export const CHAT_SOURCE_COMMAND_CLEAR = 'readergo.chat-source.clear';

export const CHAT_SOURCE_EVENT_CHANGED = 'readergo.chat-source.changed';

export interface ChatSourceDocument {
  documentId: string;
  title?: string;
  content?: string;
}

export interface ChatSourceSelection {
  text: string;
  start?: number;
  end?: number;
  documentId?: string;
}

/** Normalized payload the agent chat request accepts as source. */
export interface ChatSourcePayload {
  documentId?: string;
  title?: string;
  content?: string;
  selection?: {
    text?: string;
    start?: number;
    end?: number;
  };
}

export interface ChatSourceSnapshot {
  document: ChatSourceDocument | null;
  selection: ChatSourceSelection | null;
}

export interface ChatSourceCapability {
  get(): ChatSourceSnapshot;
  getSource(): ChatSourcePayload | undefined;
  setDocument(doc: ChatSourceDocument | null): void;
  setSelection(sel: ChatSourceSelection | null): void;
  clearSelection(): void;
  clear(): void;
  /** Subscribe to document/selection changes. Returns unsubscribe. */
  subscribe(listener: () => void): () => void;
}
