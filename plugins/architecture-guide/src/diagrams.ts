export type ChartTone = 'ui' | 'kernel' | 'runtime' | 'data' | 'plugin'

export type ChartNode = {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  sub?: string
  tone?: ChartTone
}

export type ChartEdge = {
  from: string
  to: string
  label?: string
  dashed?: boolean
}

export type ChartLane = {
  label: string
  y: number
  h: number
}

export type Diagram = {
  id: string
  title: string
  hint: string
  width: number
  height: number
  lanes?: ChartLane[]
  nodes: ChartNode[]
  edges: ChartEdge[]
  play?: string[]
}

export const CAPTIONS: Record<string, string> = {
  catalog: 'Optional plugins live in readergo-plugins. The host fetches catalog.json.',
  bar: 'Activity bar: every activity-bar-item icon. Click may create a document or run a command.',
  folders: 'Sidebar lists the active Space through document-storage. Click runs document.open.',
  pane: 'Center pane. EditorRegistry picks the plugin editor for document.type. No switch(type).',
  chat: 'Right dock. agent-chat-ui mounts here. Outline and Thinking Partner are sidebar-panel.',
  kernel: 'PluginManager + CommandRegistry + EditorRegistry. The host kernel, not a plugin.',
  host: 'Next.js app. Shell, routing, Space providers. Does not run Pi or OpenRouter.',
  runtime: 'Node on the machine, ws://127.0.0.1:28787. Folder Spaces, agents, runtime plugins.',
  ws: 'Host is a WebSocket client. UI-only plugins never need the runtime.',
  postgres: 'Cloud Space notes. Host-owned save path, never from plugin UI.',
  opfs: 'Local-first SQLite WASM + OPFS, with an outbox for later sync.',
  files: 'Folder Space: real files. .md, .epub, .pdf, .cbz via DocumentTypeRegistry extensions.',
  ui: 'React. Render, dispatch commands, subscribe to events. Never call storage.',
  command: 'Named action: document.open, document.create, readergo.agent-chat.send.',
  capability: 'Named slot: document-storage, llm-chat, sidebar-panel. Look up, do not import.',
  provider: 'One implementation of a contract. OpenRouter, Pi, folder backend, sqlite.',
  storage: 'Bytes on disk or in Postgres. Plugins go through the capability, never Prisma.',
  click: 'A click in the tree. UI only. No database import.',
  openCmd: 'document.open asks document-navigation to focus the id.',
  getDoc: 'Active Space backend loads the row or native file.',
  registry: 'type "note" -> TipTap. type "epub" -> EPUB plugin. Missing plugin = no editor.',
  editor: 'Plugin editor mounts in the center pane with document props.',
  type: 'You type. Plugin emits onChange through the document-editor bridge.',
  save: 'Host schedules save. Plugins do not persist.',
  update: 'document-storage.update writes content (and data for structured editors).',
  event: 'note:updated. Outline and other panels refresh.',
  send: 'readergo.agent-chat.send. The tab does not run the agent loop.',
  socket: 'Command crosses the WebSocket to Local Runtime.',
  pi: 'Pi (agent-sdk) runs tools: library.search, document reads.',
  llm: 'llm-chat registry dispatches to the selected provider.',
  or: 'OpenRouter (or another provider) returns tokens.',
  stream: 'Chunk events stream back into the chat panel.',
  json: 'catalog.json from GitHub dev or main.',
  install: 'Download UI bundle (and optional runtime bundle).',
  setup: 'setup() registers types, editors, commands, slots, providers.',
  appear: 'Host discovers registrations. Uninstall removes them. No host file edited.',
  space: 'A Space picks the document-storage backend. Agent memory is independent.',
}

export const DIAGRAMS: Diagram[] = [
  {
    id: 'system',
    title: 'System',
    hint: 'Click a box. Arrows are the real seams.',
    width: 1120,
    height: 640,
    lanes: [
      { label: 'Catalog', y: 8, h: 88 },
      { label: 'Shell', y: 108, h: 196 },
      { label: 'Kernel', y: 316, h: 100 },
      { label: 'Processes', y: 428, h: 196 },
    ],
    nodes: [
      { id: 'catalog', x: 380, y: 20, w: 360, h: 64, label: 'readergo-plugins catalog', sub: 'editors, themes, AI, this guide', tone: 'plugin' },
      { id: 'bar', x: 36, y: 132, w: 108, h: 156, label: 'Activity bar', sub: 'icons', tone: 'ui' },
      { id: 'folders', x: 160, y: 132, w: 176, h: 156, label: 'Sidebar', sub: 'folders + files', tone: 'ui' },
      { id: 'pane', x: 352, y: 132, w: 420, h: 156, label: 'Center pane', sub: 'dashboard or editor', tone: 'ui' },
      { id: 'chat', x: 788, y: 132, w: 296, h: 156, label: 'Chat / right dock', sub: 'agent-chat-ui', tone: 'ui' },
      { id: 'kernel', x: 220, y: 332, w: 680, h: 72, label: 'Plugin kernel', sub: 'PluginManager  ·  CommandRegistry  ·  EditorRegistry', tone: 'kernel' },
      { id: 'host', x: 36, y: 456, w: 500, h: 148, label: 'Host (browser)', sub: 'Next.js  ·  shell  ·  Space providers', tone: 'kernel' },
      { id: 'runtime', x: 584, y: 456, w: 500, h: 148, label: 'Local Runtime', sub: 'Node  ·  ws://127.0.0.1:28787', tone: 'runtime' },
    ],
    edges: [
      { from: 'catalog', to: 'kernel', label: 'install / sync' },
      { from: 'bar', to: 'kernel' },
      { from: 'folders', to: 'kernel' },
      { from: 'pane', to: 'kernel' },
      { from: 'chat', to: 'kernel' },
      { from: 'kernel', to: 'host', label: 'same tab' },
      { from: 'kernel', to: 'runtime', label: 'commands' },
      { from: 'host', to: 'runtime', label: 'WebSocket', dashed: true },
    ],
    play: ['bar', 'kernel', 'host', 'runtime'],
  },
  {
    id: 'pipeline',
    title: 'Every click',
    hint: 'The only legal path. UI never talks to storage.',
    width: 1120,
    height: 420,
    nodes: [
      { id: 'ui', x: 24, y: 150, w: 176, h: 120, label: 'UI', sub: 'click / type', tone: 'ui' },
      { id: 'command', x: 248, y: 150, w: 188, h: 120, label: 'Command', sub: 'executeCommand', tone: 'kernel' },
      { id: 'capability', x: 484, y: 150, w: 188, h: 120, label: 'Capability', sub: 'named slot', tone: 'kernel' },
      { id: 'provider', x: 720, y: 150, w: 176, h: 120, label: 'Provider', sub: 'one backend', tone: 'plugin' },
      { id: 'storage', x: 920, y: 150, w: 176, h: 120, label: 'Storage', sub: 'bytes', tone: 'data' },
    ],
    edges: [
      { from: 'ui', to: 'command', label: 'dispatch' },
      { from: 'command', to: 'capability', label: 'look up' },
      { from: 'capability', to: 'provider', label: 'latest-wins or by id' },
      { from: 'provider', to: 'storage', label: 'persist' },
    ],
    play: ['ui', 'command', 'capability', 'provider', 'storage'],
  },
  {
    id: 'open',
    title: 'Open a document',
    hint: 'Sidebar click to a mounted editor.',
    width: 1120,
    height: 480,
    nodes: [
      { id: 'click', x: 40, y: 48, w: 200, h: 88, label: 'Click a note', sub: 'sidebar UI', tone: 'ui' },
      { id: 'openCmd', x: 320, y: 48, w: 220, h: 88, label: 'document.open', sub: 'command', tone: 'kernel' },
      { id: 'getDoc', x: 620, y: 48, w: 220, h: 88, label: 'storage.get', sub: 'document-storage', tone: 'data' },
      { id: 'space', x: 620, y: 200, w: 220, h: 88, label: 'Space backend', sub: 'cloud / sqlite / folder', tone: 'data' },
      { id: 'registry', x: 320, y: 340, w: 220, h: 88, label: 'EditorRegistry', sub: 'type -> plugin', tone: 'kernel' },
      { id: 'editor', x: 40, y: 340, w: 200, h: 88, label: 'Plugin editor', sub: 'center pane', tone: 'plugin' },
    ],
    edges: [
      { from: 'click', to: 'openCmd' },
      { from: 'openCmd', to: 'getDoc' },
      { from: 'getDoc', to: 'space', label: 'load' },
      { from: 'getDoc', to: 'registry' },
      { from: 'registry', to: 'editor', label: 'mount' },
    ],
    play: ['click', 'openCmd', 'getDoc', 'space', 'registry', 'editor'],
  },
  {
    id: 'save',
    title: 'Type and save',
    hint: 'The host owns persistence.',
    width: 1120,
    height: 320,
    nodes: [
      { id: 'type', x: 32, y: 100, w: 180, h: 108, label: 'Type', sub: 'TipTap / canvas', tone: 'ui' },
      { id: 'save', x: 280, y: 100, w: 200, h: 108, label: 'scheduleSave', sub: 'host policy', tone: 'kernel' },
      { id: 'update', x: 548, y: 100, w: 220, h: 108, label: 'storage.update', sub: 'content + data', tone: 'data' },
      { id: 'event', x: 836, y: 100, w: 250, h: 108, label: 'note:updated', sub: 'Outline, partners', tone: 'plugin' },
    ],
    edges: [
      { from: 'type', to: 'save', label: 'onChange' },
      { from: 'save', to: 'update' },
      { from: 'update', to: 'event', label: 'emit' },
    ],
    play: ['type', 'save', 'update', 'event'],
  },
  {
    id: 'chat',
    title: 'Send chat',
    hint: 'The browser does not run the agent loop.',
    width: 1120,
    height: 520,
    nodes: [
      { id: 'chat', x: 40, y: 40, w: 220, h: 92, label: 'Chat panel', sub: 'agent-chat-ui', tone: 'ui' },
      { id: 'send', x: 340, y: 40, w: 240, h: 92, label: 'agent-chat.send', sub: 'command', tone: 'kernel' },
      { id: 'socket', x: 660, y: 40, w: 220, h: 92, label: 'WebSocket', sub: 'to runtime', tone: 'runtime' },
      { id: 'pi', x: 660, y: 200, w: 220, h: 92, label: 'Pi', sub: 'agent-sdk', tone: 'plugin' },
      { id: 'llm', x: 340, y: 200, w: 240, h: 92, label: 'llm-chat', sub: 'registry', tone: 'kernel' },
      { id: 'or', x: 40, y: 200, w: 220, h: 92, label: 'OpenRouter', sub: 'provider', tone: 'plugin' },
      { id: 'stream', x: 40, y: 380, w: 840, h: 80, label: 'token events stream back to the panel', sub: 'chat-store is separate from notes', tone: 'ui' },
    ],
    edges: [
      { from: 'chat', to: 'send' },
      { from: 'send', to: 'socket' },
      { from: 'socket', to: 'pi' },
      { from: 'pi', to: 'llm', label: 'complete' },
      { from: 'llm', to: 'or' },
      { from: 'or', to: 'stream', dashed: true },
      { from: 'stream', to: 'chat', dashed: true },
    ],
    play: ['chat', 'send', 'socket', 'pi', 'llm', 'or', 'stream'],
  },
  {
    id: 'plugin',
    title: 'Install a plugin',
    hint: 'No host file changes. Registries pick it up.',
    width: 1120,
    height: 320,
    nodes: [
      { id: 'json', x: 28, y: 100, w: 200, h: 108, label: 'catalog.json', sub: 'GitHub raw', tone: 'plugin' },
      { id: 'install', x: 292, y: 100, w: 188, h: 108, label: 'Install', sub: 'Marketplace', tone: 'ui' },
      { id: 'setup', x: 544, y: 100, w: 220, h: 108, label: 'setup()', sub: 'register *', tone: 'plugin' },
      { id: 'appear', x: 828, y: 100, w: 260, h: 108, label: 'UI discovers it', sub: 'slot / editor / theme', tone: 'kernel' },
    ],
    edges: [
      { from: 'json', to: 'install' },
      { from: 'install', to: 'setup', label: 'bundle' },
      { from: 'setup', to: 'appear', label: 'capability' },
    ],
    play: ['json', 'install', 'setup', 'appear'],
  },
]
