# ReaderGo Plugins Catalog

The official public repository and marketplace catalog for [ReaderGo](https://github.com/nicemit/readergo) plugins.

ReaderGo features an extensible, modular architecture where capabilities, document types, editors, and external tools are decoupled into standalone plugins that can be compiled, cataloged, and installed via URL or marketplace.

---

## Included Plugins (28)

### Document Editors
- **Canvas** (`readergo.editor.canvas`): Structured infinite canvas for organizing documents.
- **EPUB Reader** (`readergo.editor.epub`): Read and interact with EPUB books.
- **Graph** (`readergo.editor.graph`): Interactive knowledge graph visualization on an infinite canvas.
- **Mindmap** (`readergo.editor.mindmap`): Interactive tree-structured mind mapping.
- **Simple Text Editor** (`readergo.editor.simple`): Clean, lightweight plaintext editor.
- **Spreadsheet** (`readergo.editor.spreadsheet`): Grid-based spreadsheet editor.
- **Whiteboard** (`readergo.editor.whiteboard`): Infinite canvas whiteboard for sketching and diagramming.

### Knowledge & Productivity Features
- **Zettelkasten** (`readergo.features.zettelkasten`): Bidirectional note linking via `[[Note Title]]`, live autocomplete dropdown, incoming backlinks, and forward links.
- **Link Clipper** (`readergo.features.link-clipper`): Clip web articles and convert them into structured notes.
- **Pin Notes** (`readergo.features.pin-notes`): Pin favorite notes to your dashboard for rapid access.
- **Selection Actions** (`readergo.features.selection-actions`): Contextual action bar triggered upon text selection.
- **Local Backup** (`readergo.plugin.readergolocalbackup`): Automated JSON exports and local backup routines.
- **Plugin Dev Tools** (`readergo.plugin.readergodevtools`): Introspection dashboard for debugging plugins.

### AI & LLM Integrations
- **Ollama AI Insights** (`readergo.ai.ollama`): Connect to local or remote Ollama models for summarization and analysis.
- **OpenRouter** (`readergo.ai.openrouter`): Unified multi-model LLM inference via OpenRouter API.
- **Pollinations AI Beautify** (`readergo.features.pollinations`): AI-powered text embellishment and formatting.
- **Note Digest** (`readergo.ai.note-digest`): Automated periodic note digest and insight generation.
- **Embeddings Local** (`readergo.embeddings.local`): Local on-device vector embeddings generation.
- **Embeddings OpenRouter** (`readergo.embeddings.openrouter`): Cloud vector embeddings via OpenRouter.
- **Vector Store (LanceDB)** (`readergo.vector-store.lancedb`): High-performance vector database indexing.
- **Pi AI Assistant** (`readergo.ai.pi`): Agentic personal assistant runtime extension.

### Storage & Filesystem
- **SFTP Space** (`readergo.sftp-space`): Remote filesystem space backed by SSH/SFTP servers.
- **SQLite Chat Store** (`readergo.chat-store.sqlite`): Local persistent chat message history storage.
- **Filesystem Runtime** (`readergo.filesystem`): Host filesystem directory bridge.

### Developer Examples
- **Hello World** (`readergo.examples.hello-world`)
- **Settings Panel** (`readergo.examples.settings-panel`)
- **Sync Style** (`readergo.examples.sync-style`)
- **Demo External Plugin** (`demo.external.plugin`)

---

## Developing Plugins

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Build All Plugins and Catalog
```bash
npm install
npm run build
```
This compiles all TypeScript plugins using `esbuild`, extracts metadata, generates self-contained `*.bundle.json` (UI) and `*.runtime.json` (local runtime) packages, and produces `public/catalog.json`.

### Run Local Catalog Server
```bash
npm run serve
```
Serves `public/` at `http://localhost:3001/catalog.json` with permissive CORS headers.

---

## Connecting to ReaderGo

### 1. In ReaderGo Application Settings / Env
Set the catalog environment variable before starting ReaderGo:
```bash
NEXT_PUBLIC_PLUGIN_CATALOG_URL="http://localhost:3001/catalog.json"
```
Or point it directly to the hosted GitHub Pages release:
```bash
NEXT_PUBLIC_PLUGIN_CATALOG_URL="https://nicemit.github.io/readergo-plugins/catalog.json"
```

### 2. Sideloading via URL
Any plugin bundle generated here can be directly installed in ReaderGo via:
```javascript
// In browser console or UI
await window.readergo.installPlugin("https://.../zettelkasten.bundle.json");
```

---

## Creating a New Plugin

1. Create a directory inside `plugins/<your-plugin-name>/`.
2. Add `manifest.json`:
```json
{
  "id": "com.example.myplugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does something awesome",
  "category": "feature",
  "provides": ["sidebar-panel"],
  "main": "dist/ui.js",
  "compile": {
    "ui": "./src/index.tsx"
  }
}
```
3. Write your plugin code in `src/index.tsx` importing from `@readergo/plugin-sdk`.
4. Run `npm run build` to compile and add it to the catalog!
