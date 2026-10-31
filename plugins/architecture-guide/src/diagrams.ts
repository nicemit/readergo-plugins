export type ChartTone = 'ui' | 'kernel' | 'runtime' | 'data' | 'plugin'

export type ChartNode = {
  id: string
  label: string
  sub?: string
  detail?: string
  step?: number
  tone?: ChartTone
  lane?: string
}

export type ChartEdge = {
  from: string
  to: string
  label?: string
  dashed?: boolean
}

export type Diagram = {
  id: string
  title: string
  /** One sentence. The chart should still make sense if this is all you read. */
  story: string
  nodes: ChartNode[]
  edges: ChartEdge[]
  play?: string[]
  /** Delay between nodes when the flow is building. */
  paceMs?: number
}

export const DIAGRAMS: Diagram[] = [
  {
    id: 'spreadsheet',
    title: 'Create a spreadsheet',
    story:
      'You click Spreadsheet. A command creates the document. The spreadsheet plugin mounts. The host never switches on type.',
    paceMs: 1700,
    nodes: [
      {
        id: 'ss-click',
        step: 1,
        label: 'You click Spreadsheet',
        sub: 'Activity bar. UI only.',
        detail:
          'The icon is an activity-bar-item from the spreadsheet plugin. The click does not create a file by itself.',
        tone: 'ui',
      },
      {
        id: 'ss-cmd',
        step: 2,
        label: 'document.create',
        sub: 'A named command. type: spreadsheet.',
        detail:
          "executeCommand('document.create', { type: 'spreadsheet' }). The UI does not call storage.",
        tone: 'kernel',
      },
      {
        id: 'ss-store',
        step: 3,
        label: 'storage.create',
        sub: 'The active Space writes the document.',
        detail: 'document-storage for this Space creates the row or file. Cloud, sqlite, or folder.',
        tone: 'data',
      },
      {
        id: 'ss-reg',
        step: 4,
        label: 'EditorRegistry',
        sub: 'type spreadsheet → grid plugin.',
        detail: 'No switch(type) in the host. If the plugin is off, the pane stays empty.',
        tone: 'kernel',
      },
      {
        id: 'ss-grid',
        step: 5,
        label: 'Grid mounts',
        sub: 'Center pane. The sheet is a plugin.',
        detail:
          'The spreadsheet editor renders. Typing later goes through onChange and the host save path.',
        tone: 'plugin',
      },
    ],
    edges: [
      { from: 'ss-click', to: 'ss-cmd', label: 'dispatch' },
      { from: 'ss-cmd', to: 'ss-store', label: 'create' },
      { from: 'ss-store', to: 'ss-reg', label: 'type' },
      { from: 'ss-reg', to: 'ss-grid', label: 'mount' },
    ],
    play: ['ss-click', 'ss-cmd', 'ss-store', 'ss-reg', 'ss-grid'],
  },
  {
    id: 'system',
    title: 'The map',
    story:
      'You use a shell. The shell talks only to a kernel. The kernel talks to this tab, or to a Node process on the machine. Features arrive as plugins.',
    nodes: [
      {
        id: 'catalog',
        label: 'readergo-plugins catalog',
        sub: 'Editors, themes, AI, this guide. Installed. Not compiled into the host.',
        detail:
          'The host fetches catalog.json from GitHub (dev or main). A listing can ship a browser bundle, a runtime bundle, or both.',
        tone: 'plugin',
        lane: 'Catalog',
      },
      {
        id: 'bar',
        label: 'Activity bar',
        sub: 'Every activity-bar-item icon.',
        detail:
          'Click may create a document or run a command. Spreadsheet, chat, and this guide each add their own icon.',
        tone: 'ui',
        lane: 'Shell',
      },
      {
        id: 'folders',
        label: 'Sidebar',
        sub: 'The active Space, through document-storage.',
        detail: 'A click runs document.open. The tree never imports Prisma or a folder API.',
        tone: 'ui',
        lane: 'Shell',
      },
      {
        id: 'pane',
        label: 'Center pane',
        sub: 'EditorRegistry picks the plugin for document.type.',
        detail:
          'type "note" mounts TipTap. type "epub" mounts the EPUB plugin. There is no switch(document.type) in the host.',
        tone: 'ui',
        lane: 'Shell',
      },
      {
        id: 'dock',
        label: 'Right dock',
        sub: 'Chat slot, plus sidebar-panel.',
        detail:
          'agent-chat-ui mounts in shell-right-dock. Outline and Thinking Partner register sidebar-panel and stack in the inspector.',
        tone: 'ui',
        lane: 'Shell',
      },
      {
        id: 'kernel',
        label: 'Plugin kernel',
        sub: 'PluginManager · CommandRegistry · EditorRegistry · DocumentTypeRegistry',
        detail:
          'The kernel is host code, not a plugin. It holds registrations and runs activate / disable. UI looks things up here. It does not import plugin files.',
        tone: 'kernel',
        lane: 'Kernel',
      },
      {
        id: 'host',
        label: 'Host (this tab)',
        sub: 'Next.js. Shell, routing, Space providers. Does not run Pi or OpenRouter.',
        detail:
          'Platform plugins that notes cannot boot without live here: spaces, notes, folders, chat-source, agent-chat-ui. Everything else installs from the catalog.',
        tone: 'kernel',
        lane: 'Process',
      },
      {
        id: 'runtime',
        label: 'Local Runtime',
        sub: 'Node on the machine. Default ws://127.0.0.1:28787.',
        detail:
          'Folder Spaces, agent-chat, llm-chat, Pi, and filesystem plugins run here. UI-only plugins never need this process.',
        tone: 'runtime',
        lane: 'Process',
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
    play: ['catalog', 'bar', 'folders', 'pane', 'dock', 'kernel', 'host', 'runtime'],
  },
  {
    id: 'pipeline',
    title: 'The rule',
    story: 'UI never talks to storage. Every click walks the same five steps, in this order.',
    nodes: [
      {
        id: 'ui',
        step: 1,
        label: 'UI',
        sub: 'You click or type. React only renders and dispatches.',
        detail:
          'No fetch. No Prisma. No provider import. The UI calls executeCommand and subscribes to events.',
        tone: 'ui',
      },
      {
        id: 'command',
        step: 2,
        label: 'Command',
        sub: 'A named action, like document.open or agent-chat.send.',
        detail:
          'Commands are the only legal way to mutate. The kernel resolves the handler from who registered it.',
        tone: 'kernel',
      },
      {
        id: 'capability',
        step: 3,
        label: 'Capability',
        sub: 'A named slot. Look it up. Never import the other plugin.',
        detail:
          'document-storage, llm-chat, sidebar-panel. Latest-wins for one active backend. Registry slots keep every contribution.',
        tone: 'kernel',
      },
      {
        id: 'provider',
        step: 4,
        label: 'Provider',
        sub: 'One concrete backend: folder, OpenRouter, sqlite.',
        detail:
          'A provider implements a contract (id + methods). Plugins register into a capability. Callers pick by id when several exist.',
        tone: 'plugin',
      },
      {
        id: 'storage',
        step: 5,
        label: 'Storage',
        sub: 'Bytes on disk, OPFS, or Postgres.',
        detail: 'Only the provider touches storage. Plugin UI never writes files or SQL.',
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
    nodes: [
      {
        id: 'click',
        step: 1,
        label: 'Click a file',
        sub: 'Sidebar UI only. No database import.',
        detail: 'The tree asks the kernel to open an id. It does not load the document itself.',
        tone: 'ui',
      },
      {
        id: 'openCmd',
        step: 2,
        label: 'document.open',
        sub: 'Navigation focuses that id.',
        detail: 'A command, not a function call across layers. document-navigation owns the open.',
        tone: 'kernel',
      },
      {
        id: 'getDoc',
        step: 3,
        label: 'storage.get',
        sub: 'The active document-storage capability.',
        detail: 'Whichever Space is active answers. Cloud, SQLite+OPFS, or a folder.',
        tone: 'data',
      },
      {
        id: 'space',
        step: 4,
        label: 'Space backend',
        sub: 'Cloud row, local sqlite, or a real file.',
        detail:
          'A Space picks one document-storage. Agent memory (chat-store, vectors) is a different set of providers.',
        tone: 'data',
      },
      {
        id: 'registry',
        step: 5,
        label: 'EditorRegistry',
        sub: 'type → plugin editor. Missing plugin = empty pane.',
        detail: 'The host never switches on type. If the EPUB plugin is off, an .epub has no editor.',
        tone: 'kernel',
      },
      {
        id: 'editor',
        step: 6,
        label: 'Plugin editor mounts',
        sub: 'Center pane receives the document. TipTap, EPUB, canvas, paged reader.',
        detail: 'The editor renders and emits onChange. It does not persist. Persistence is the next chart.',
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
    story: 'The editor reports changes. The host decides when to write. Plugins never persist.',
    nodes: [
      {
        id: 'type',
        step: 1,
        label: 'You type',
        sub: 'TipTap, canvas, or another editor plugin.',
        detail: 'The plugin updates its view and emits onChange through the document-editor bridge.',
        tone: 'ui',
      },
      {
        id: 'save',
        step: 2,
        label: 'Host schedules save',
        sub: 'Debounce and policy live in the host.',
        detail: 'Editors do not call storage.update. The host owns when a draft becomes a write.',
        tone: 'kernel',
      },
      {
        id: 'update',
        step: 3,
        label: 'storage.update',
        sub: 'content string, plus data for structured editors.',
        detail: 'Custom plugin state goes in document.data. Never JSON.stringified into content.',
        tone: 'data',
      },
      {
        id: 'event',
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
    nodes: [
      {
        id: 'panel',
        step: 1,
        label: 'Chat panel',
        sub: 'agent-chat-ui. Reads chat-source for the open document.',
        detail:
          'A platform browser plugin. Setup picks agent-sdk, llm-chat, and memory providers. The panel never imports Pi.',
        tone: 'ui',
        lane: 'Browser',
      },
      {
        id: 'send',
        step: 2,
        label: 'agent-chat.send',
        sub: 'A command. The tab asks the runtime to run a turn.',
        detail:
          'Payload includes the message, provider ids, and source. The host is a WebSocket client, not an agent.',
        tone: 'kernel',
        lane: 'Browser',
      },
      {
        id: 'socket',
        step: 3,
        label: 'WebSocket to Local Runtime',
        sub: 'Default ws://127.0.0.1:28787. One socket per tab.',
        detail:
          'Runtime plugins do the work. If the runtime is down, chat cannot run. Notes in a cloud Space still can.',
        tone: 'runtime',
        lane: 'Wire',
      },
      {
        id: 'pi',
        step: 4,
        label: 'Pi',
        sub: 'agent-sdk. Runs tools: library.search, reads.',
        detail:
          'Pi is a provider plugin. Another agent SDK can register the same slot. The host calls run() on the selected id.',
        tone: 'plugin',
        lane: 'Runtime',
      },
      {
        id: 'llm',
        step: 5,
        label: 'llm-chat',
        sub: 'A registry. Dispatches to the selected model provider.',
        detail:
          'The registry stores no model logic. OpenRouter (or another provider) registers into it.',
        tone: 'kernel',
        lane: 'Runtime',
      },
      {
        id: 'or',
        step: 6,
        label: 'OpenRouter',
        sub: 'One llm-chat provider. Tokens come from here.',
        detail:
          'An API key is asked when selected. An empty key is not a selection. Other providers can take this slot.',
        tone: 'plugin',
        lane: 'Runtime',
      },
      {
        id: 'stream',
        step: 7,
        label: 'Tokens stream back',
        sub: 'chat-store is not notes. A cloud Space can keep notes while chats stay on disk.',
        detail:
          'Memory providers (sqlite chat-store, embeddings, lancedb) are chosen in Setup. They are independent of document-storage.',
        tone: 'ui',
        lane: 'Back',
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
    nodes: [
      {
        id: 'json',
        step: 1,
        label: 'catalog.json',
        sub: 'GitHub raw, dev or main. Or a local serve.',
        detail: 'Hosted ReaderGo dev/preview reads the plugins repo dev branch. Production reads main.',
        tone: 'plugin',
      },
      {
        id: 'install',
        step: 2,
        label: 'Install',
        sub: 'Marketplace or a sideload URL. Bundle lands in browser storage.',
        detail:
          'A listing may include a UI bundle, a runtime bundle (~/.readergo/plugins), or both.',
        tone: 'ui',
      },
      {
        id: 'setup',
        step: 3,
        label: 'activate()',
        sub: 'Registers types, editors, commands, slots, providers.',
        detail:
          'External plugins import @readergo/plugin-sdk. They do not import host internals. Disable runs cleanup.',
        tone: 'plugin',
      },
      {
        id: 'appear',
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
    nodes: [
      {
        id: 'spacePick',
        label: 'The active Space',
        sub: 'Picks one document-storage backend. Notes, folders, and search go through that slot.',
        detail:
          'Switching Space swaps the active document-storage provider. The notes UI stays the same.',
        tone: 'kernel',
      },
      {
        id: 'cloud',
        label: 'Cloud',
        sub: 'Postgres. Host-owned save path. Good for a hosted Space.',
        detail:
          'The host writes notes. Plugin UI never talks to Prisma. library.search still goes through document-storage.',
        tone: 'data',
      },
      {
        id: 'opfs',
        label: 'SQLite + OPFS',
        sub: 'Local-first in the browser, with an outbox for later sync.',
        detail: 'Works offline in the tab. Sync is a later write, not a different document model.',
        tone: 'data',
      },
      {
        id: 'files',
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
