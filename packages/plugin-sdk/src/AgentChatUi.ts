import type { ComponentType } from 'react';

/**
 * Browser agent chat UI surface. A plugin owns the panel and open state.
 * The host mounts the panel in a shell slot. It does not own chat chrome.
 */

export const AGENT_CHAT_UI_CAPABILITY_ID = 'agent-chat-ui';

export const AGENT_CHAT_UI_COMMAND_OPEN = 'readergo.agent-chat-ui.open';
export const AGENT_CHAT_UI_COMMAND_CLOSE = 'readergo.agent-chat-ui.close';
export const AGENT_CHAT_UI_COMMAND_TOGGLE = 'readergo.agent-chat-ui.toggle';
export const AGENT_CHAT_UI_COMMAND_IS_OPEN = 'readergo.agent-chat-ui.isOpen';

export const AGENT_CHAT_UI_EVENT_CHANGED = 'readergo.agent-chat-ui.changed';

export interface AgentChatUiPanelProps {
  onClose?: () => void;
  variant?: 'page' | 'dock';
}

export interface AgentChatUiCapability {
  /** Activity bar / contribution id for this surface */
  id: string;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  /** React panel the host mounts in its chat shell slot */
  Panel: ComponentType<AgentChatUiPanelProps>;
  /** Subscribe to open/close. Returns unsubscribe. */
  subscribe(listener: (open: boolean) => void): () => void;
}
