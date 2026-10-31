export type ChartTone = 'ui' | 'kernel' | 'runtime' | 'data' | 'plugin'

export type ChartNode = {
  id: string
  x: number
  y: number
  w: number
  h: number
  label: string
  sub?: string
  detail?: string
  step?: number
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
  /** One sentence. The chart should still make sense if this is all you read. */
  story: string
  width: number
  height: number
  lanes?: ChartLane[]
  nodes: ChartNode[]
  edges: ChartEdge[]
  play?: string[]
}

const W = 1080

export const DIAGRAMS: Diagram[] = [
  {
    id: 'system',
    title: 'The map',
    story:
      'You use a shell. The shell talks only to a kernel. The kernel talks to this tab, or to a Node process on the machine. Features arrive as plugins.',
    width: W,
    height: 700,
    lanes: [
      { label: 'Catalog', y: 10, h: 96 },
      { label: 'Shell', y: 118, h: 196 },
      { label: 'Kernel', y: 326, h: 108 },
      { label: 'Processes', y: 446, h: 240 },
    ],
    nodes: [
      {
        id: 'catalog',
        x: 118,
        y: 28,
        w: 930,
        h: 60,
        label: 'readergo-plugins catalog',
        sub: 'Editors, themes, AI, this guide. Installed. Not compiled into the host.',
        detail:
          'The host fetches catalog.json from GitHub (dev or main). A listing can ship a browser bundle, a runtime bundle, or both.',
        tone: 'plugin',
      },
      {
        id: 'bar',
        x: 118,
        y: 156,
        w: 132,
        h: 136,
        label: 'Activity bar',
        sub: 'Every activity-bar-item icon.',
        detail:
          'Click may create a document or run a command. Spreadsheet, chat, and this guide each add their own icon.',
        tone: 'ui',
      },
      {
        id: 'folders',
        x: 266,
        y: 156,
        w: 196,
        h: 136,
        label: 'Sidebar',
        sub: 'The active Space, through document-storage.',
        detail:
          'A click runs document.open. The tree never imports Prisma or a folder API.',
        tone: 'ui',
      },
      {
        id: 'pane',
        x: 478,
        y: 156,
        w: 318,
        h: 136,
        label: 'Center pane',
        sub: 'EditorRegistry picks the plugin for document.type.',
        detail:
          'type "note" mounts TipTap. type "epub" mounts the EPUB plugin. There is no switch(document.type) in the host.',
        tone: 'ui',
      },
      {
        id: 'dock',
        x: 812,
        y: 156,
        w: 236,
        h: 136,
        label: 'Right dock',
        sub: 'Chat slot, plus sidebar-panel.',
        detail:
          'agent-chat-ui mounts in shell-right-dock. Outline and Thinking Partner register sidebar-panel and stack in the inspector.',
        tone: 'ui',
      },
      {
        id: 'kernel',
        x: 118,
        y: 348,
        w: 930,
        h: 68,
        label: 'Plugin kernel',
        sub: 'PluginManager · CommandRegistry · EditorRegistry · DocumentTypeRegistry',
        detail:
          'The kernel is host code, not a plugin. It holds registrations and runs activate / disable. UI looks things up here. It does not import plugin files.',
        tone: 'kernel',
      },
      {
        id: 'host',
        x: 118,
        y: 468,
        w: 448,
        h: 196,
        label: 'Host (this tab)',
        sub: 'Next.js. Shell, routing, Space providers. Does not run Pi or OpenRouter.',
        detail:
          'Platform plugins that notes cannot boot without live here: spaces, notes, folders, chat-source, agent-chat-ui. Everything else installs from the catalog.',
        tone: 'kernel',
      },
      {
        id: 'runtime',
        x: 600,
        y: 468,
        w: 448,
        h: 196,
        label: 'Local Runtime',
        sub: 'Node on the machine. Default ws://127.0.0.1:28787.',
        detail:
          'Folder Spaces, agent-chat, llm-chat, Pi, and filesystem plugins run here. UI-only plugins never need this process.',
        tone: 'runtime',
      },
    ],
    edges: [
      { from: 'catalog', to: 'kernel', label: 'install / sync' },
      { from: 'bar', to: 'kernel' },
      { from: 'folders', to: 'kernel' },
      { from: 'pane', to: 'kernel' },
      { from: 'dock', to: 'kernel' },
      { from: 'kernel', to: 'host', label: 'same tab' },
      { from: 'kernel', to: 'runtime', label: 'commands' },
      { from: 'host', to: 'runtime', label: 'WebSocket', dashed: true },
    ],
    play: ['catalog', 'kernel', 'bar', 'folders', 'pane', 'dock', 'host', 'runtime'],
  },
  {
    id: 'pipeline',
    title: 'The rule',
    story:
      'UI never talks to storage. Every click walks the same five steps, in this order.',
    width: W,
    height: 280,
    nodes: [
      {
        id: 'ui',
        x: 16,
        y: 56,
        w: 188,
        h: 168,
        step: 1,
        label: 'UI',
        sub: 'You click or type. React only renders and dispatches.',
        detail:
          'No fetch. No Prisma. No provider import. The UI calls executeCommand and subscribes to events.',
        tone: 'ui',
      },
      {
        id: 'command',
        x: 228,
        y: 56,
        w: 196,
        h: 168,
        step: 2,
        label: 'Command',
        sub: 'A named action, like document.open or agent-chat.send.',
        detail:
          'Commands are the only legal way to mutate. The kernel resolves the handler from who registered it.',
        tone: 'kernel',
      },
      {
        id: 'capability',
        x: 448,
        y: 56,
        w: 196,
        h: 168,
        step: 3,
        label: 'Capability',
        sub: 'A named slot. Look it up. Never import the other plugin.',
        detail:
          'document-storage, llm-chat, sidebar-panel. Latest-wins for one active backend. Registry slots keep every contribution.',
        tone: 'kernel',
      },
      {
        id: 'provider',
        x: 668,
        y: 56,
        w: 188,
        h: 168,
        step: 4,
        label: 'Provider',
        sub: 'One concrete backend: folder, OpenRouter, sqlite.',
        detail:
          'A provider implements a contract (id + methods). Plugins register into a capability. Callers pick by id when several exist.',
        tone: 'plugin',
      },
      {
        id: 'storage',
        x: 880,
        y: 56,
        w: 184,
        h: 168,
        step: 5,
        label: 'Storage',
        sub: 'Bytes on disk, OPFS, or Postgres.',
        detail:
          'Only the provider touches storage. Plugin UI never writes files or SQL.',
        tone: 'data',
      },
    ],
    edges: [
      { from: 'ui', to: 'command', label: 'dispatch' },
      { from: 'command', to: 'capability', label: 'look up' },
      { from: 'capability', to: 'provider', label: 'by slot or id' },
      { from: 'provider', to: 'storage', label: 'read / write' },
    ],
    play: ['ui', 'command', 'capability', 'provider', 'storage'],
  },
  {
    id: 'open',
    title: 'Open a document',
    story:
      'A sidebar click becomes document.open. The Space loads the bytes. EditorRegistry mounts the plugin that knows that type.',
    width: W,
    height: 420,
    nodes: [
      {
        id: 'click',
        x: 16,
        y: 36,
        w: 200,
        h: 132,
        step: 1,
        label: 'Click a file',
        sub: 'Sidebar UI only. No database import.',
        detail: 'The tree asks the kernel to open an id. It does not load the document itself.',
        tone: 'ui',
      },
      {
        id: 'openCmd',
        x: 248,
        y: 36,
        w: 220,
        h: 132,
        step: 2,
        label: 'document.open',
        sub: 'Navigation focuses that id.',
        detail: 'A command, not a function call across layers. document-navigation owns the open.',
        tone: 'kernel',
      },
      {
        id: 'getDoc',
        x: 500,
        y: 36,
        w: 228,
        h: 132,
        step: 3,
        label: 'storage.get',
        sub: 'The active document-storage capability.',
        detail: 'Whichever Space is active answers. Cloud, SQLite+OPFS, or a folder.',
        tone: 'data',
      },
      {
        id: 'space',
        x: 760,
        y: 36,
        w: 304,
        h: 132,
        step: 4,
        label: 'Space backend',
        sub: 'Cloud row, local sqlite, or a real file.',
        detail:
          'A Space picks one document-storage. Agent memory (chat-store, vectors) is a different set of providers.',
        tone: 'data',
      },
      {
        id: 'registry',
        x: 500,
        y: 232,
        w: 228,
        h: 140,
        step: 5,
        label: 'EditorRegistry',
        sub: 'type → plugin editor. Missing plugin = empty pane.',
        detail:
          'The host never switches on type. If the EPUB plugin is off, an .epub has no editor.',
        tone: 'kernel',
      },
      {
        id: 'editor',
        x: 16,
        y: 232,
        w: 452,
        h: 140,
        step: 6,
        label: 'Plugin editor mounts',
        sub: 'Center pane receives the document. TipTap, EPUB, canvas, paged reader…',
        detail:
          'The editor renders and emits onChange. It does not persist. Persistence is the next chart.',
        tone: 'plugin',
      },
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
    story:
      'The editor reports changes. The host decides when to write. Plugins never persist.',
    width: W,
    height: 280,
    nodes: [
      {
        id: 'type',
        x: 16,
        y: 56,
        w: 228,
        h: 168,
        step: 1,
        label: 'You type',
        sub: 'TipTap, canvas, or another editor plugin.',
        detail: 'The plugin updates its view and emits onChange through the document-editor bridge.',
        tone: 'ui',
      },
      {
        id: 'save',
        x: 276,
        y: 56,
        w: 236,
        h: 168,
        step: 2,
        label: 'Host schedules save',
        sub: 'Debounce and policy live in the host.',
        detail:
          'Editors do not call storage.update. The host owns when a draft becomes a write.',
        tone: 'kernel',
      },
      {
        id: 'update',
        x: 544,
        y: 56,
        w: 244,
        h: 168,
        step: 3,
        label: 'storage.update',
        sub: 'content string, plus data for structured editors.',
        detail:
          'Custom plugin state goes in document.data. Never JSON.stringified into content.',
        tone: 'data',
      },
      {
        id: 'event',
        x: 820,
        y: 56,
        w: 244,
        h: 168,
        step: 4,
        label: 'note:updated',
        sub: 'Outline, backlinks, and partners refresh.',
        detail:
          'Panels subscribe to the event. They do not poll the editor DOM unless they choose to watch it.',
        tone: 'plugin',
      },
    ],
    edges: [
      { from: 'type', to: 'save', label: 'onChange' },
      { from: 'save', to: 'update', label: 'write' },
      { from: 'update', to: 'event', label: 'emit' },
    ],
    play: ['type', 'save', 'update', 'event'],
  },
  {
    id: 'chat',
    title: 'Send chat',
    story:
      'The tab does not run the agent loop. It sends a command. Pi and the model run on the Local Runtime. Tokens stream back.',
    width: W,
    height: 560,
    lanes: [
      { label: 'Browser', y: 12, h: 156 },
      { label: 'Wire', y: 180, h: 100 },
      { label: 'Runtime', y: 292, h: 156 },
      { label: 'Back', y: 460, h: 88 },
    ],
    nodes: [
      {
        id: 'panel',
        x: 118,
        y: 40,
        w: 400,
        h: 108,
        step: 1,
        label: 'Chat panel',
        sub: 'agent-chat-ui. Reads chat-source for the open document.',
        detail:
          'A platform browser plugin. Setup picks agent-sdk, llm-chat, and memory providers. The panel never imports Pi.',
        tone: 'ui',
      },
      {
        id: 'send',
        x: 562,
        y: 40,
        w: 486,
        h: 108,
        step: 2,
        label: 'agent-chat.send',
        sub: 'A command. The tab asks the runtime to run a turn.',
        detail:
          'Payload includes the message, provider ids, and source. The host is a WebSocket client, not an agent.',
        tone: 'kernel',
      },
      {
        id: 'socket',
        x: 118,
        y: 198,
        w: 930,
        h: 64,
        step: 3,
        label: 'WebSocket to Local Runtime',
        sub: 'Default ws://127.0.0.1:28787. One socket per tab.',
        detail:
          'Runtime plugins do the work. If the runtime is down, chat cannot run. Notes in a cloud Space still can.',
        tone: 'runtime',
      },
      {
        id: 'pi',
        x: 118,
        y: 316,
        w: 280,
        h: 112,
        step: 4,
        label: 'Pi',
        sub: 'agent-sdk. Runs tools: library.search, reads.',
        detail:
          'Pi is a provider plugin. Another agent SDK can register the same slot. The host calls run() on the selected id.',
        tone: 'plugin',
      },
      {
        id: 'llm',
        x: 430,
        y: 316,
        w: 280,
        h: 112,
        step: 5,
        label: 'llm-chat',
        sub: 'A registry. Dispatches to the selected model provider.',
        detail:
          'The registry stores no model logic. OpenRouter (or another provider) registers into it.',
        tone: 'kernel',
      },
      {
        id: 'or',
        x: 742,
        y: 316,
        w: 306,
        h: 112,
        step: 6,
        label: 'OpenRouter',
        sub: 'One llm-chat provider. Tokens come from here.',
        detail:
          'An API key is asked when selected. An empty key is not a selection. Other providers can take this slot.',
        tone: 'plugin',
      },
      {
        id: 'stream',
        x: 118,
        y: 476,
        w: 930,
        h: 56,
        step: 7,
        label: 'Token events stream back into the panel',
        sub: 'chat-store is not notes. A cloud Space can keep notes while chats stay on disk.',
        detail:
          'Memory providers (sqlite chat-store, embeddings, lancedb) are chosen in Setup. They are independent of document-storage.',
        tone: 'ui',
      },
    ],
    edges: [
      { from: 'panel', to: 'send', label: 'send' },
      { from: 'send', to: 'socket' },
      { from: 'socket', to: 'pi' },
      { from: 'pi', to: 'llm', label: 'complete' },
      { from: 'llm', to: 'or', label: 'dispatch' },
      { from: 'or', to: 'stream', dashed: true },
      { from: 'stream', to: 'panel', dashed: true },
    ],
    play: ['panel', 'send', 'socket', 'pi', 'llm', 'or', 'stream'],
  },
  {
    id: 'plugin',
    title: 'Install a plugin',
    story:
      'A catalog bundle registers itself. The host does not gain a new source file. Disable removes the registrations.',
    width: W,
    height: 280,
    nodes: [
      {
        id: 'json',
        x: 16,
        y: 56,
        w: 236,
        h: 168,
        step: 1,
        label: 'catalog.json',
        sub: 'GitHub raw, dev or main. Or a local serve.',
        detail:
          'Hosted ReaderGo dev/preview reads the plugins repo dev branch. Production reads main.',
        tone: 'plugin',
      },
      {
        id: 'install',
        x: 284,
        y: 56,
        w: 236,
        h: 168,
        step: 2,
        label: 'Install',
        sub: 'Marketplace or a sideload URL. Bundle lands in browser storage.',
        detail:
          'A listing may include a UI bundle, a runtime bundle (~/.readergo/plugins), or both.',
        tone: 'ui',
      },
      {
        id: 'setup',
        x: 552,
        y: 56,
        w: 244,
        h: 168,
        step: 3,
        label: 'activate()',
        sub: 'Registers types, editors, commands, slots, providers.',
        detail:
          'External plugins import @readergo/plugin-sdk. They do not import host internals. Disable runs cleanup.',
        tone: 'plugin',
      },
      {
        id: 'appear',
        x: 828,
        y: 56,
        w: 236,
        h: 168,
        step: 4,
        label: 'The shell notices',
        sub: 'Activity bar, editor, theme, or sidebar-panel appears.',
        detail:
          'DynamicSidebar, EditorRegistry, and ExtensionSlot re-read registrations. Uninstall deletes the bundle. No host file was edited.',
        tone: 'kernel',
      },
    ],
    edges: [
      { from: 'json', to: 'install', label: 'fetch' },
      { from: 'install', to: 'setup', label: 'load bundle' },
      { from: 'setup', to: 'appear', label: 'register' },
    ],
    play: ['json', 'install', 'setup', 'appear'],
  },
  {
    id: 'spaces',
    title: 'A Space',
    story:
      'A Space is which document-storage is active. Agent memory is a different set of providers. They do not have to live in the same place.',
    width: W,
    height: 360,
    nodes: [
      {
        id: 'spacePick',
        x: 16,
        y: 36,
        w: 1048,
        h: 88,
        label: 'The active Space',
        sub: 'Picks one document-storage backend. Notes, folders, and search go through that slot.',
        detail:
          'Switching Space swaps the active document-storage provider. The notes UI stays the same.',
        tone: 'kernel',
      },
      {
        id: 'cloud',
        x: 16,
        y: 156,
        w: 332,
        h: 168,
        label: 'Cloud',
        sub: 'Postgres. Host-owned save path. Good for a hosted Space.',
        detail:
          'The host writes notes. Plugin UI never talks to Prisma. library.search still goes through document-storage.',
        tone: 'data',
      },
      {
        id: 'opfs',
        x: 374,
        y: 156,
        w: 332,
        h: 168,
        label: 'SQLite + OPFS',
        sub: 'Local-first in the browser, with an outbox for later sync.',
        detail:
          'Works offline in the tab. Sync is a later write, not a different document model.',
        tone: 'data',
      },
      {
        id: 'files',
        x: 732,
        y: 156,
        w: 332,
        h: 168,
        label: 'Folder',
        sub: 'Real files: .md, .epub, .pdf, .cbz. Needs Local Runtime or a browser folder.',
        detail:
          'DocumentTypeRegistry maps extensions to types. The matching editor plugin must be installed.',
        tone: 'data',
      },
    ],
    edges: [
      { from: 'spacePick', to: 'cloud', label: 'or' },
      { from: 'spacePick', to: 'opfs', label: 'or' },
      { from: 'spacePick', to: 'files', label: 'or' },
    ],
    play: ['spacePick', 'cloud', 'opfs', 'files'],
  },
]
