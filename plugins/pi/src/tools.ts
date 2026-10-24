import type {
  AgentChatRequest,
  AgentToolSpec,
  ChatStoreCapability,
  EmbeddingsCapability,
  FilesystemCapability,
  RemoteCallCapability,
  VectorStoreCapability,
} from '@readergo/plugin-contracts';
import {
  AGENT_TOOLS_CAPABILITY_ID,
  LIBRARY_CAPABILITY_ID,
  LIST_NOTES_TOOL,
  LIST_SPACE_FILES_TOOL,
  READ_NOTE_TOOL,
  READ_SPACE_FILE_TOOL,
  SEARCH_NOTES_TOOL,
  chatVectorNamespace,
  notesVectorNamespace,
} from '@readergo/plugin-contracts';
import type { AgentTool } from '@earendil-works/pi-agent-core';
import type { TSchema } from 'typebox';

const TOOL_RESULT_CHAR_CAP = 100_000;
const SPACE_FILE_CHAR_CAP = 100_000;
export const CHAT_LIST_TOOL = 'chat_list';
export const CHAT_READ_TOOL = 'chat_read';
export const MEMORY_SEARCH_TOOL = 'memory_search';

const objectSchema = {
  type: 'object',
  properties: {},
};

export function createPiTools(input: {
  req: AgentChatRequest;
  remote: RemoteCallCapability;
  fs: FilesystemCapability | null;
  chatStore: ChatStoreCapability | null;
  embeddings: EmbeddingsCapability | null;
  vectorStore: VectorStoreCapability | null;
}): AgentTool[] {
  const browserTools = input.req.tools ?? [];
  const browserNames = new Set(browserTools.map((tool) => tool.name));
  const tools: AgentTool[] = [
    tool(
      SEARCH_NOTES_TOOL,
      'Search notes in the active space, including notes inside folders and subfolders. Prefer this once, then read_note on the best hits. Returns id, title, folder path, and a short excerpt.',
      {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      async (args) => {
        const query = stringArg(args, 'query');
        const semantic = await searchNotesSemantic(input, query);
        if (semantic.length > 0) return { hits: semantic, source: 'vector' };
        return input.remote.call(LIBRARY_CAPABILITY_ID, 'search', { query });
      },
    ),
    tool(
      READ_NOTE_TOOL,
      'Read one note by id. Returns title and plain text.',
      {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      async (args) =>
        input.remote.call(LIBRARY_CAPABILITY_ID, 'read', {
          id: stringArg(args, 'id'),
        }),
    ),
    tool(
      LIST_NOTES_TOOL,
      'List notes in the active space, including those in folders and subfolders. Each hit has id, title, and folder path when the note is nested.',
      objectSchema,
      async () => input.remote.call(LIBRARY_CAPABILITY_ID, 'list', {}),
    ),
  ];
  if (input.chatStore && input.req.memory?.chatStoreId) {
    const providerId = input.req.memory.chatStoreId;
    const chatStore = input.chatStore;
    tools.push(
      tool(
        CHAT_LIST_TOOL,
        'List saved agent chats for the active space.',
        objectSchema,
        async () =>
          chatStore.listConversations({
            providerId,
            spaceId: input.req.space?.id,
            limit: 20,
          }),
      ),
      tool(
        CHAT_READ_TOOL,
        'Read one saved agent chat by conversation id.',
        {
          type: 'object',
          properties: { conversationId: { type: 'string' } },
          required: ['conversationId'],
        },
        async (args) =>
          chatStore.get({
            providerId,
            conversationId: stringArg(args, 'conversationId'),
          }),
      ),
    );
  }
  if (
    input.embeddings &&
    input.vectorStore &&
    input.req.memory?.embeddingsId &&
    input.req.memory?.vectorStoreId
  ) {
    const embeddings = input.embeddings;
    const vectorStore = input.vectorStore;
    const embeddingsId = input.req.memory.embeddingsId;
    const vectorStoreId = input.req.memory.vectorStoreId;
    tools.push(
      tool(
        MEMORY_SEARCH_TOOL,
        'Semantic search over indexed chat memory for this space.',
        {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
        async (args) => {
          const query = stringArg(args, 'query');
          const embedded = await embeddings.embed({
            providerId: embeddingsId,
            texts: [query],
            model: input.req.memory?.embeddingsModel,
            apiKey: input.req.memory?.embeddingsApiKey,
          });
          const vector = embedded.vectors[0];
          if (!vector?.length) return { hits: [] };
          const hits = await vectorStore.query({
            providerId: vectorStoreId,
            namespace: chatVectorNamespace(input.req.space?.id),
            vector,
            limit: 8,
          });
          return { hits };
        },
      ),
    );
  }
  if (input.req.space?.access === 'runtime' && input.req.space.id) {
    tools.push(
      tool(
        LIST_SPACE_FILES_TOOL,
        'List files in the active runtime folder, including nested folders and subfolders.',
        objectSchema,
        async () => listSpaceFiles(input.fs, input.req),
      ),
      tool(
        READ_SPACE_FILE_TOOL,
        'Read one file in the active runtime folder. Path is relative to that folder.',
        {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        async (args) => readSpaceFile(input.fs, input.req, stringArg(args, 'path')),
      ),
    );
  }
  for (const spec of browserTools) {
    tools.push(
      tool(spec.name, spec.description, spec.inputSchema, async (args) => {
        if (!browserNames.has(spec.name)) return { error: `Unknown tool ${spec.name}` };
        return input.remote.call(AGENT_TOOLS_CAPABILITY_ID, 'execute', {
          name: spec.name,
          arguments: args,
        });
      }),
    );
  }
  return tools;
}

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  run: (args: Record<string, unknown>) => Promise<unknown>,
): AgentTool {
  return {
    name,
    label: name,
    description,
    parameters: parameters as unknown as TSchema,
    async execute(_toolCallId, params) {
      try {
        const args =
          params && typeof params === 'object'
            ? (params as Record<string, unknown>)
            : {};
        const result = await run(args);
        return {
          content: [{ type: 'text', text: capText(JSON.stringify(result)) }],
          details: {},
        };
      } catch (err) {
        const message = errorText(err);
        return {
          content: [{ type: 'text', text: message }],
          details: {},
          isError: true,
        };
      }
    },
  };
}

async function searchNotesSemantic(
  input: {
    req: AgentChatRequest;
    embeddings: EmbeddingsCapability | null;
    vectorStore: VectorStoreCapability | null;
  },
  query: string,
): Promise<Array<{ id: string; title: string; excerpt: string; folder?: string; score: number }>> {
  if (
    !query ||
    !input.embeddings ||
    !input.vectorStore ||
    !input.req.memory?.embeddingsId ||
    !input.req.memory?.vectorStoreId
  ) {
    return [];
  }
  try {
    const embedded = await input.embeddings.embed({
      providerId: input.req.memory.embeddingsId,
      texts: [query],
      model: input.req.memory.embeddingsModel,
      apiKey: input.req.memory.embeddingsApiKey,
    });
    const vector = embedded.vectors[0];
    if (!vector?.length) return [];
    const hits = await input.vectorStore.query({
      providerId: input.req.memory.vectorStoreId,
      namespace: notesVectorNamespace(input.req.space?.id),
      vector,
      limit: 12,
    });
    const byNote = new Map<
      string,
      { id: string; title: string; excerpt: string; folder?: string; score: number }
    >();
    for (const hit of hits) {
      const fromMeta = hit.metadata?.noteId;
      const match = /^note:(.+):(\d+)$/.exec(hit.id);
      const id =
        typeof fromMeta === 'string' && fromMeta.trim()
          ? fromMeta
          : match?.[1] || hit.id;
      const title =
        typeof hit.metadata?.title === 'string' && hit.metadata.title.trim()
          ? hit.metadata.title
          : id;
      const folder =
        typeof hit.metadata?.folder === 'string' && hit.metadata.folder.trim()
          ? hit.metadata.folder
          : undefined;
      const existing = byNote.get(id);
      if (!existing || hit.score > existing.score) {
        byNote.set(id, {
          id,
          title,
          excerpt: (hit.text || '').slice(0, 240),
          ...(folder ? { folder } : {}),
          score: hit.score,
        });
      }
    }
    return [...byNote.values()]
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  } catch {
    return [];
  }
}

async function collectSpaceFiles(
  fs: FilesystemCapability,
  spaceId: string,
  dir: string,
  limit: number,
  out: Array<{ path: string; isDirectory: boolean }> = [],
): Promise<Array<{ path: string; isDirectory: boolean }>> {
  if (out.length >= limit) return out;
  const entries = await fs.list(dir, { spaceId });
  for (const entry of entries) {
    const name = entry.path.split('/').pop() || entry.path;
    if (name.startsWith('.')) continue;
    out.push({ path: entry.path, isDirectory: entry.isDirectory });
    if (out.length >= limit) break;
    if (entry.isDirectory) {
      await collectSpaceFiles(fs, spaceId, entry.path, limit, out);
    }
  }
  return out;
}

async function listSpaceFiles(
  fs: FilesystemCapability | null,
  req: AgentChatRequest,
): Promise<unknown> {
  if (!fs || req.space?.access !== 'runtime' || !req.space.id) {
    return { error: 'This space has no runtime folder' };
  }
  const files = await collectSpaceFiles(fs, req.space.id, '.', 200);
  return { files };
}

async function readSpaceFile(
  fs: FilesystemCapability | null,
  req: AgentChatRequest,
  filePath: string,
): Promise<unknown> {
  if (!fs || req.space?.access !== 'runtime' || !req.space.id) {
    return { error: 'This space has no runtime folder' };
  }
  const path = filePath.trim() || '.';
  const stat = await fs.stat(path, { spaceId: req.space.id });
  if (stat.isDirectory) {
    const entries = await fs.list(path, { spaceId: req.space.id });
    return {
      path: stat.path || path,
      isDirectory: true,
      files: entries.slice(0, 40).map((entry) => ({
        path: entry.path,
        isDirectory: entry.isDirectory,
      })),
    };
  }
  const result = await fs.read(path, { spaceId: req.space.id });
  return {
    path: result.path,
    content: result.content.slice(0, SPACE_FILE_CHAR_CAP),
  };
}

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === 'string' ? value : '';
}

function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Tool call failed';
}

function capText(text: string): string {
  if (text.length <= TOOL_RESULT_CHAR_CAP) return text;
  return `${text.slice(0, TOOL_RESULT_CHAR_CAP)}\n[truncated]`;
}

export function systemPrompt(req: AgentChatRequest, browserTools: AgentToolSpec[]): string {
  const lines = [
    'You are a helpful assistant inside ReaderGo.',
    'When the user refers to "this", "the article", or selected text, use the provided source context.',
    'For questions about the user\'s notes: call search_notes once, or list_notes to survey the library. Both include notes inside folders and subfolders; use the folder field as the path.',
    'If search returns hits, call read_note on the best 1-3 ids, then answer. Do not keep trying new search phrases after you have a hit.',
    'If search and list are empty, say so and stop.',
    'Cite the note id when you use a note.',
  ];
  const source = req.source;
  if (source?.title) lines.push(`Title: ${source.title}`);
  if (source?.documentId) lines.push(`Document id: ${source.documentId}`);
  if (source?.selection?.text) lines.push(`Selected text:\n${source.selection.text}`);
  if (source?.content) lines.push(`Document content:\n${source.content}`);
  if (req.space?.access === 'runtime') {
    lines.push('You can list and read files in the active runtime folder.');
  }
  if (req.memory?.chatStoreId) {
    lines.push('You can list and read saved agent chats with chat_list and chat_read.');
  }
  if (req.memory?.embeddingsId && req.memory?.vectorStoreId) {
    lines.push('You can search indexed chat memory with memory_search.');
  }
  if (browserTools.some((t) => t.name === 'create_document')) {
    lines.push(
      'Document creation & editing capabilities:\n' +
        '- You can create new documents or notes using `create_document`. Supported document types include "note", "spreadsheet", "whiteboard", "graph", "canvas".\n' +
        '- To check which document types and structured data templates are available before creating complex documents, call `get_available_document_types`.\n' +
        '- When specialized plugins provide dedicated tools (such as `mindmap_create` for mindmaps), ALWAYS prefer calling those dedicated tools to create and structure the document directly.\n' +
        '- You can update existing documents using `update_document`. For text notes, specify mode "append" or "replace" for content. For structured documents, pass updated `data`.\n' +
        '- You can inspect the currently open document in the editor with `get_active_document`.\n' +
        '- You can delete documents with `delete_document` when explicitly asked.',
    );
  }

  if (browserTools.length > 0) {
    lines.push(`Extra tools: ${browserTools.map((item) => item.name).join(', ')}.`);
  }
  return lines.join('\n\n');
}
