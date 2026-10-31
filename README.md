# ReaderGo Plugins Catalog

The official marketplace catalog for [ReaderGo](https://github.com/nicemit/readergo) plugins.

ReaderGo is split into two repositories:

- **[readergo](https://github.com/nicemit/readergo)** - the host (Next.js app, plugin kernel, Local Runtime, platform plugins).
- **This repo** - optional plugins. Document editors (including the TipTap note editor), themes, AI providers, and extra tools compile here into catalog bundles.

Work happens on the `dev` branch. A push to `dev` is what every ReaderGo `dev` / preview / localhost build installs. `main` is the production catalog.

---

## Included Plugins (40)

### Document Editors
- **TipTap Note Editor** (`readergo.editor.note`): Rich text notes with markdown, tables, and collapsible headings. This is the default note editor; it is not bundled in the host.
- **Canvas** (`readergo.editor.canvas`): Structured infinite canvas for organizing documents.
- **EPUB Reader** (`readergo.editor.epub`): Paginated e-reader with two-page desktop spreads, typography, atmospheres, search, bookmarks, and a chapter scrubber.
- **PDF and Comic Reader** (`readergo.editor.paged`): Paged reader for `.pdf` files and `.cbz` comic archives (a zip of page images). Fit width/page, keyboard navigation, and saved place in folder Spaces.
- **Graph** (`readergo.editor.graph`): Interactive knowledge graph on an infinite canvas.
- **Mindmap** (`readergo.editor.mindmap`): Tree-structured mind mapping with layouts, color, and SVG export.
- **Simple Text Editor** (`readergo.editor.simple`): Lightweight plaintext editor.
- **Spreadsheet** (`readergo.editor.spreadsheet`): Grid-based spreadsheet editor.
- **Whiteboard** (`readergo.editor.whiteboard`): Infinite canvas whiteboard.

### Knowledge and Productivity
- **Zettelkasten** (`readergo.features.zettelkasten`): Bidirectional `[[Note Title]]` links, autocomplete, backlinks, and unlinked mentions.
- **Thinking Partner** (`readergo.features.thinking-partner`): In-editor intelligence: related notes, unlinked mentions, and content-aware actions.
- **Document Structure** (`readergo.features.outline`): Right-sidebar heading outline with jump-to-heading and section collapse.
- **Link Clipper** (`readergo.features.link-clipper`): Clip web articles into structured notes.
- **Pin Notes** (`readergo.features.pin-notes`): Pin favorite notes to the dashboard.
- **Selection Actions** (`readergo.features.selection-actions`): Contextual action bar on text selection.
- **Local Backup** (`readergo.plugin.readergolocalbackup`): Periodic JSON exports.
- **Plugin Dev Tools** (`readergo.plugin.readergodevtools`): Introspection dashboard for debugging plugins.
- **How ReaderGo Works** (`readergo.features.architecture`): Self-explaining flowcharts of the shell, kernel, click pipeline, open/save, chat, install, and Spaces.

### Themes
- **Amber CRT Terminal** (`readergo.theme.amber`)
- **Nord Frost** (`readergo.theme.nord`)
- **E-Ink Reading Suite** (`readergo.theme.eink`)
- **Catppuccin Mocha** (`readergo.theme.catppuccin`)
- **Solarized Light** (`readergo.theme.solarized`)
- **Gruvbox Dark** (`readergo.theme.gruvbox`)
- **Rose Pine** (`readergo.theme.rose-pine`)

### AI and LLM
- **Ollama AI Insights** (`readergo.ai.ollama`)
- **OpenRouter** (`readergo.llm.openrouter`): Runtime LLM provider for agent chat.
- **Pi** (`readergo.agent.pi`): Agent SDK. Runs chat tools and calls the selected LLM provider.
- **Pollinations AI Beautify** (`readergo.features.pollinations`)
- **Note Digest** (`readergo.tools.note-digest`): Agent tool that digests one note.
- **Embeddings (Local)** (`readergo.embeddings.local`)
- **Embeddings (OpenRouter)** (`readergo.embeddings.openrouter`)
- **Vector Store (Local)** (`readergo.vector-store.lancedb`)
- **Chat Store (SQLite)** (`readergo.chat-store.sqlite`)

### Storage and Filesystem
- **SFTP Space** (`readergo.sftp-space`): Browser UI plus a Local Runtime bundle for SSH/SFTP folders.
- **Filesystem (Runtime)** (`readergo.filesystem`): Host filesystem directory bridge.

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

Work on `dev`:

```bash
git checkout dev
npm install
npm run build
```

This compiles every plugin with `esbuild`, writes self-contained `public/*.bundle.json` (browser UI) and `public/*.runtime.json` (Local Runtime) packages, and regenerates `public/catalog.json`.

### Run a local catalog server
```bash
npm run serve
```
Serves `public/` at `http://localhost:3001/catalog.json` with permissive CORS headers.

---

## Connecting to ReaderGo

ReaderGo resolves the catalog from the environment and the current deployment:

| ReaderGo environment | Catalog URL |
| --- | --- |
| `dev`, preview, localhost | `https://raw.githubusercontent.com/nicemit/readergo-plugins/dev/public/catalog.json` |
| production | `https://raw.githubusercontent.com/nicemit/readergo-plugins/main/public/catalog.json` |
| local catalog server | `http://localhost:3001/catalog.json` |

To point a local ReaderGo checkout at this repo's serve command, set:

```bash
NEXT_PUBLIC_PLUGIN_CATALOG_URL="http://localhost:3001/catalog.json"
```

Pushing compiled bundles to `dev` is enough for hosted ReaderGo `dev` / preview builds: they fetch `catalog.json` from this branch at startup and auto-sync installed plugins whose version or hash changed.

### Sideloading via URL
Any compiled bundle can be installed directly:

```javascript
await window.readergo.installPlugin("https://raw.githubusercontent.com/nicemit/readergo-plugins/dev/public/zettelkasten.bundle.json");
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
3. Write the plugin in `src/index.tsx`, importing from `@readergo/plugin-sdk`.
4. Run `npm run build` to compile it and add it to `public/catalog.json`.

`packages/plugin-sdk` in this repo is a vendored copy of the host SDK. Keep it in step with [`readergo/packages/plugin-sdk`](https://github.com/nicemit/readergo/tree/dev/packages/plugin-sdk). See the [SDK distribution plan](https://github.com/nicemit/readergo/blob/dev/docs/plans/11-PLUGIN_SDK_DISTRIBUTION_PLAN.md) in the host repo.

---

## What stays in the host

These boot from ReaderGo itself and are not catalog packages:

- plugin kernel (`PluginManager`, `EditorRegistry`, `DocumentTypeRegistry`, commands)
- spaces, notes, folders, IndexedDB storage
- navigation, chat-source, agent-chat UI, user-state

Everything else, including the note editor, installs from this catalog.
