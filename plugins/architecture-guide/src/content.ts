export type GuideScene = 'shell' | 'pipeline' | 'documents' | 'stories'

export type GuideNode = {
  id: string
  title: string
  kind: string
  what: string
  when: string
  click: string
  related?: string[]
}

export type ClickStory = {
  id: string
  title: string
  prompt: string
  hops: Array<{
    nodeId: string
    label: string
    detail: string
  }>
}

export const SCENES: Array<{ id: GuideScene; label: string; hint: string }> = [
  { id: 'shell', label: 'The shell', hint: 'Click a region of the app' },
  { id: 'pipeline', label: 'The pipeline', hint: 'Follow one action through the layers' },
  { id: 'documents', label: 'Documents', hint: 'What lives in a note, and who renders it' },
  { id: 'stories', label: 'Click a thing', hint: 'Pick an action and watch the hops' },
]

export const NODES: Record<string, GuideNode> = {
  'activity-bar': {
    id: 'activity-bar',
    title: 'Activity bar',
    kind: 'Shell',
    what: 'The thin icon strip on the left. Built-in items plus every plugin that registers an activity-bar-item show up here. It is a registry, not latest-wins: two plugins can both add an icon.',
    when: 'Use it to create a document type (note, canvas, EPUB, PDF), toggle a left panel, or run a plugin action.',
    click: 'If the item has a noteType, the host creates that document and opens it. If it has a panel, the left drawer toggles. Otherwise the item onClick / command runs.',
    related: ['sidebar', 'editor', 'plugins'],
  },
  sidebar: {
    id: 'sidebar',
    title: 'Folder sidebar',
    kind: 'Shell',
    what: 'The tree of folders and documents in the active Space. This is navigation over document-storage, not a separate database.',
    when: 'Use it to find, nest, rename, and open documents. Folder Spaces show real files; cloud Spaces show notes in Postgres or local SQLite.',
    click: 'Click a document: the host runs document.open, EditorRegistry picks the editor for that type, and the center pane mounts it. Click a folder to expand. Context menus dispatch create/delete commands.',
    related: ['document', 'editor-registry', 'storage'],
  },
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    kind: 'Shell',
    what: 'The home surface when no document is focused. It lists spaces, recent documents, create-type buttons, and the dashboard-pinned extension slot.',
    when: 'Start here to pick a Space, create a document, or jump into a pinned note. Plugins can pin cards into this middle slot.',
    click: 'Create buttons call document.create for that type. Pinned widgets (this guide, Pin Notes) run their own commands, usually ending in document.open.',
    related: ['document', 'plugins', 'command'],
  },
  editor: {
    id: 'editor',
    title: 'Center editor',
    kind: 'Shell',
    what: 'The Dynamic Center Pane. It does not switch(type). EditorRegistry resolves the plugin editor registered for the document type.',
    when: 'Whenever a document is open. Notes, canvases, EPUBs, PDFs, spreadsheets, and this guide all land here.',
    click: 'Typing or drawing stays in the plugin UI. Saves go up through the bridge to the host: change -> scheduleDocumentSave -> handleSave -> document-storage. Plugins do not write the DB themselves.',
    related: ['document', 'editor-registry', 'command', 'storage'],
  },
  'right-dock': {
    id: 'right-dock',
    title: 'Right dock / Chat',
    kind: 'Shell',
    what: 'The shell-right-dock extension slot. The platform agent-chat-ui plugin mounts the chat panel here. Right sidebars (Outline, Thinking Partner) are a separate sidebar-panel list.',
    when: 'Talk to an agent about the open document, or keep an inspector plugin beside the editor.',
    click: 'Send in chat: UI command -> Local Runtime agent-chat -> agent-sdk (Pi) -> llm-chat (OpenRouter or similar) -> streamed events back to the panel. Outline listens to note:updated and jumps in the TipTap DOM.',
    related: ['runtime', 'capability', 'provider'],
  },
  marketplace: {
    id: 'marketplace',
    title: 'Marketplace',
    kind: 'Shell',
    what: 'Settings surface that installs catalog plugins. The host fetches catalog.json from the readergo-plugins GitHub repo (dev or main) and hydrates bundles into browser storage.',
    when: 'Install editors, themes, AI providers, and tools that are not bundled in the host. New catalog entries must be installed once; already-installed plugins auto-sync.',
    click: 'Install downloads the UI (and optional runtime) bundle, activates the plugin, and it registers editors, commands, slots, or providers. Uninstall removes the registration.',
    related: ['plugins', 'host', 'runtime'],
  },
  host: {
    id: 'host',
    title: 'Host (this app)',
    kind: 'Process',
    what: 'The Next.js ReaderGo app. It owns the shell, routing, PluginManager, CommandRegistry, EditorRegistry, DocumentTypeRegistry, and Space note providers.',
    when: 'Always. The website and the desktop webview are this host. It does not run Pi or OpenRouter itself.',
    click: 'Boot: init platform plugins, hydrate marketplace installs, auto-sync the catalog, then resolve UI from registries. UI only dispatches commands and subscribes to events.',
    related: ['plugins', 'runtime', 'command'],
  },
  runtime: {
    id: 'runtime',
    title: 'Local Runtime',
    kind: 'Process',
    what: 'A Node process on the machine (default ws://127.0.0.1:28787). It serves folder access, agent chat, runtime plugins, and filesystem Spaces. UI-only plugins do not need it.',
    when: 'Folder Spaces, SFTP, agent chat, embeddings, and any plugin with a runtime bundle. Pure editors (notes, EPUB, themes) run in the tab.',
    click: 'The host opens a WebSocket. Commands such as readergo.agent-chat.send cross the socket. Runtime plugins do the work and stream events back.',
    related: ['provider', 'storage', 'right-dock'],
  },
  plugins: {
    id: 'plugins',
    title: 'Plugins',
    kind: 'Package',
    what: 'Loadable packages with a manifest, activate/setup, and optional UI or runtime bundles. They talk only through PluginContext: capabilities, commands, events. They must not import readergo/src.',
    when: 'Anything that is not the kernel: editors, themes, AI, extra panels. Platform plugins boot from the host. Optional ones come from the catalog repo.',
    click: 'On activate, a plugin registers document types, editors, commands, slots, or providers. After that, the host discovers them through registries, not hardcoded switches.',
    related: ['capability', 'editor-registry', 'marketplace'],
  },
  ui: {
    id: 'ui',
    title: 'UI',
    kind: 'Pipeline',
    what: 'React surfaces: shell, editors, dashboard widgets, chat panel. They render state, dispatch commands, and subscribe to events.',
    when: 'Every click, key, and visible pixel. The UI must not call providers or persistence directly.',
    click: 'A click handler calls executeCommand(...) or a plugin command. It never imports a storage class. Results come back as command return values or events.',
    related: ['command', 'activity-bar', 'editor'],
  },
  command: {
    id: 'command',
    title: 'Command',
    kind: 'Pipeline',
    what: 'A named action in CommandRegistry, such as document.open, document.create, or readergo.agent-chat.send. This is the preferred UI-to-host-to-plugin door.',
    when: 'Any mutation or navigation that should work the same from a button, the palette, an agent tool, or another plugin.',
    click: 'executeCommand(id, payload) runs the registered handler. Core commands live on PluginManager. Plugins add namespaced commands during activate.',
    related: ['ui', 'capability'],
  },
  capability: {
    id: 'capability',
    title: 'Capability',
    kind: 'Pipeline',
    what: 'A named slot in the running system: document-storage, llm-chat, filesystem, sidebar-panel. Plugins register an implementation or look one up. Never import the other plugin.',
    when: 'Need a feature another package owns. Two styles: latest-wins (one active provider, like document-storage) or registry (many providers, pick by id).',
    click: 'getCapability(id) returns the active implementation. Registering again either prepends (latest wins) or adds to a list (activity bar, sidebar panels).',
    related: ['provider', 'command', 'plugins'],
  },
  provider: {
    id: 'provider',
    title: 'Provider',
    kind: 'Pipeline',
    what: 'One concrete implementation of a contract, with an id and name. OpenRouter implements llm-chat. Pi implements agent-sdk. Folder and cloud backends implement document-storage.',
    when: 'Swap backends without changing UI. Pick OpenRouter vs Ollama, cloud vs folder Space, sqlite vs other chat stores.',
    click: 'The UI sends a providerId on the command. The registry dispatches to that provider. The host does not hardcode the backend.',
    related: ['capability', 'runtime', 'storage'],
  },
  storage: {
    id: 'storage',
    title: 'Storage',
    kind: 'Pipeline',
    what: 'Where bytes actually live. Cloud Spaces use Postgres. Local-first notes can use SQLite WASM + OPFS with an outbox. Folder Spaces are real files. Agent memory is a separate tree under ~/.readergo/agent.',
    when: 'Create, open, save, list, delete. Native files (EPUB, PDF, CBZ) use readBytes / writeBytes / createNativeFile on document-storage.',
    click: 'Save is host-owned: any editor change -> scheduleDocumentSave -> handleSave -> document-storage.update (or writeBytes). Plugins never open Prisma or the filesystem themselves.',
    related: ['document', 'editor', 'runtime'],
  },
  document: {
    id: 'document',
    title: 'Document',
    kind: 'Model',
    what: 'The canonical persisted entity: id, type, title, content, data, metadata, spaceId, timestamps. One model for notes, canvases, books, and this guide.',
    when: 'Everything you can open in the center pane is a document in a Space.',
    click: 'Opening uses the id. The type picks the editor. content is searchable text. data is structured editor state (graph JSON, spreadsheet grid, EPUB location).',
    related: ['content-vs-data', 'editor-registry', 'storage'],
  },
  'content-vs-data': {
    id: 'content-vs-data',
    title: 'content vs data',
    kind: 'Model',
    what: 'content is the canonical text layer (search, previews, TipTap HTML/markdown). data is structured state (canvas nodes, spreadsheet cells, mindmap trees).',
    when: 'Text editors treat content as source of truth. Structured editors treat data as source of truth and still keep content as a searchable summary.',
    click: 'Saving a canvas writes data for the graph and a text fallback into content so library search still works.',
    related: ['document', 'editor'],
  },
  'editor-registry': {
    id: 'editor-registry',
    title: 'EditorRegistry',
    kind: 'Kernel',
    what: 'Maps document type -> plugin editor component. DocumentTypeRegistry holds labels, icons, create factories, and file extensions for folder Spaces.',
    when: 'A plugin that adds a new kind of document registers both a type and an editor during activate.',
    click: 'Until the matching plugin is installed, that type has no editor. Install EPUB Reader, then .epub files open. Uninstall it, and they do not.',
    related: ['document', 'plugins', 'editor'],
  },
  space: {
    id: 'space',
    title: 'Space',
    kind: 'Model',
    what: 'The product container for notes. It chooses the document-storage backend (cloud, local SQLite, folder, SFTP). Agent memory providers are independent of the Space.',
    when: 'Switching Spaces swaps which notes you see and which storage implementation is active (latest-wins on document-storage).',
    click: 'Open a folder Space: the host talks to the Local Runtime filesystem plugin. Open a cloud Space: Postgres. The same sidebar and editors work on both.',
    related: ['storage', 'runtime', 'sidebar'],
  },
}

export const PIPELINE_STEPS = ['ui', 'command', 'capability', 'provider', 'storage'] as const

export const STORIES: ClickStory[] = [
  {
    id: 'open-note',
    title: 'Open a note from the sidebar',
    prompt: 'You click "Weekly review" in the folder tree.',
    hops: [
      {
        nodeId: 'sidebar',
        label: 'Sidebar click',
        detail: 'The tree is just UI. It calls a navigation helper with the document id.',
      },
      {
        nodeId: 'command',
        label: 'document.open',
        detail: 'The host command asks document-navigation to focus that id.',
      },
      {
        nodeId: 'storage',
        label: 'document-storage.get',
        detail: 'The active Space backend loads the row or file.',
      },
      {
        nodeId: 'editor-registry',
        label: 'Resolve editor',
        detail: 'Type "note" maps to the TipTap plugin. Type "epub" would map to the EPUB plugin.',
      },
      {
        nodeId: 'editor',
        label: 'Center pane mounts',
        detail: 'The plugin editor receives the document as props and renders.',
      },
    ],
  },
  {
    id: 'type-note',
    title: 'Type in a note',
    prompt: 'You type a sentence in TipTap and pause.',
    hops: [
      {
        nodeId: 'editor',
        label: 'Editor onChange',
        detail: 'The note plugin updates local editor state and emits content upward through the document-editor bridge.',
      },
      {
        nodeId: 'command',
        label: 'Host save policy',
        detail: 'The host schedules a save. Plugins do not call Prisma or OPFS themselves.',
      },
      {
        nodeId: 'storage',
        label: 'document-storage.update',
        detail: 'content is written. Search and previews read this text later.',
      },
      {
        nodeId: 'right-dock',
        label: 'note:updated',
        detail: 'Outline, Thinking Partner, and similar panels refresh from the event. They do not scrape the editor unless they need DOM jump.',
      },
    ],
  },
  {
    id: 'send-chat',
    title: 'Send a chat message',
    prompt: 'You open Chat and ask "Summarize this note".',
    hops: [
      {
        nodeId: 'right-dock',
        label: 'Chat UI',
        detail: 'agent-chat-ui is a platform plugin in the host. It reads the open document via chat-source.',
      },
      {
        nodeId: 'command',
        label: 'readergo.agent-chat.send',
        detail: 'The command crosses the WebSocket to the Local Runtime. The tab does not run the agent loop.',
      },
      {
        nodeId: 'runtime',
        label: 'agent-chat registry',
        detail: 'Runtime facade picks the selected agent-sdk provider (Pi) and llm-chat provider (OpenRouter, etc.).',
      },
      {
        nodeId: 'provider',
        label: 'Pi + LLM',
        detail: 'Pi runs tools (library.search, document reads). llm-chat calls the model. Chunks stream back as events.',
      },
      {
        nodeId: 'right-dock',
        label: 'Panel updates',
        detail: 'The UI subscribes to chunk events and renders tokens. Chat history can persist in the chat-store provider, separate from notes.',
      },
    ],
  },
  {
    id: 'open-epub',
    title: 'Import and read an EPUB',
    prompt: 'You click Import EPUB or drop a .epub file.',
    hops: [
      {
        nodeId: 'activity-bar',
        label: 'Import EPUB',
        detail: 'The EPUB plugin registered an activity-bar-item with noteType "epub".',
      },
      {
        nodeId: 'command',
        label: 'createNativeFile',
        detail: 'document-storage writes the zip bytes as a native file in a folder Space, not a markdown wrapper.',
      },
      {
        nodeId: 'editor-registry',
        label: 'type: epub',
        detail: 'EditorRegistry mounts EpubDocumentEditor. On a wide pane it opens a two-page spread.',
      },
      {
        nodeId: 'storage',
        label: 'readBytes + user-state',
        detail: 'The plugin reads the archive through the capability and stores chapter location in user-state, not in the EPUB file.',
      },
    ],
  },
  {
    id: 'install-plugin',
    title: 'Install a plugin from Marketplace',
    prompt: 'You install Outline and Word Count.',
    hops: [
      {
        nodeId: 'marketplace',
        label: 'Catalog fetch',
        detail: 'The host loads catalog.json from readergo-plugins (dev or main). This package is one of those entries.',
      },
      {
        nodeId: 'plugins',
        label: 'Activate',
        detail: 'The UI bundle runs setup(). Outline registers a sidebar-panel. Themes register theme-provider. Editors register types.',
      },
      {
        nodeId: 'capability',
        label: 'Host discovers it',
        detail: 'DynamicSidebar lists sidebar-panel registrations. No host file was edited. Uninstall removes the panel.',
      },
    ],
  },
  {
    id: 'folder-space',
    title: 'Open a folder Space',
    prompt: 'You point ReaderGo at a directory on disk.',
    hops: [
      {
        nodeId: 'space',
        label: 'Space backend swaps',
        detail: 'document-storage latest-wins: the folder provider becomes active for this Space.',
      },
      {
        nodeId: 'runtime',
        label: 'Local Runtime',
        detail: 'Filesystem and SFTP plugins live in Node. The host is only a WebSocket client.',
      },
      {
        nodeId: 'storage',
        label: 'Real files',
        detail: '.md notes, .epub, .pdf, .cbz are listed by extension maps from DocumentTypeRegistry.',
      },
      {
        nodeId: 'editor',
        label: 'Same editors',
        detail: 'Opening a file still goes EditorRegistry. Cloud vs folder is a storage swap, not a different app.',
      },
    ],
  },
]
