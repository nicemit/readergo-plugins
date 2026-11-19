import type {
  AgentActivityCapability,
  AgentChatRequest,
  AgentToolSpec,
  ChatStoreCapability,
  EmbeddingsCapability,
  FilesystemCapability,
  RemoteCallCapability,
  TagsCapability,
  VectorStoreCapability,
  WebSearchCapability,
} from '@readergo/plugin-contracts';
import {
  composeAgentSystemPrompt,
  createSharedAgentTools,
} from '@readergo/plugin-contracts';
import type { AgentTool } from '@earendil-works/pi-agent-core';
import type { TSchema } from 'typebox';

const TOOL_RESULT_CHAR_CAP = 100_000;

/**
 * Pi only adapts the shared catalog into pi-agent-core tools.
 * Execution stays in createSharedAgentTools (plugin-contracts).
 */
export function createPiTools(input: {
  req: AgentChatRequest;
  remote: RemoteCallCapability;
  fs: FilesystemCapability | null;
  chatStore: ChatStoreCapability | null;
  embeddings: EmbeddingsCapability | null;
  vectorStore: VectorStoreCapability | null;
  activity?: AgentActivityCapability | null;
  tags?: TagsCapability | null;
  webSearch?: WebSearchCapability | null;
}): AgentTool[] {
  const shared = createSharedAgentTools({
    req: input.req,
    remote: input.remote,
    fs: input.fs,
    chatStore: input.chatStore,
    embeddings: input.embeddings,
    vectorStore: input.vectorStore,
    activity: input.activity ?? null,
    tags: input.tags ?? null,
    webSearch: input.webSearch ?? null,
  });
  return shared.map((spec) =>
    tool(spec.name, spec.description, spec.inputSchema, spec.execute),
  );
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
          params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
        const result = await run(args);
        return {
          content: [{ type: 'text', text: capText(JSON.stringify(result)) }],
          details: {},
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: errorText(err) }],
          details: {},
          isError: true,
        };
      }
    },
  };
}

function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Tool call failed';
}

function capText(text: string): string {
  if (text.length <= TOOL_RESULT_CHAR_CAP) return text;
  return `${text.slice(0, TOOL_RESULT_CHAR_CAP)}\n[truncated]`;
}

/**
 * Agent SDK owns prompt composition. UI ships persona + uiMechanics as facts;
 * this function (via contracts.composeAgentSystemPrompt) builds the final
 * system string. Future agent SDKs must call the same helper - do not assemble
 * prompts in the chat UI.
 */
export function systemPrompt(req: AgentChatRequest, browserTools: AgentToolSpec[]): string {
  const persona = req.assistant?.systemPrompt?.trim();
  const personaName = req.assistant?.name?.trim() || 'a helpful assistant';

  if (req.disableTools === true) {
    if (browserTools.length === 0) {
      return composeAgentSystemPrompt({
        persona,
        personaName,
        uiMechanics: req.uiMechanics,
        runtimeLines: [
          'Tools are disabled for this turn. Answer directly from the user message.',
          'Follow the output format in the user message exactly. Do not call tools.',
        ],
      });
    }
    return composeAgentSystemPrompt({
      persona,
      personaName,
      uiMechanics: req.uiMechanics,
      runtimeLines: [
        'Built-in note and filesystem tools are disabled for this turn.',
        `You may ONLY call these tools: ${browserTools.map((t) => t.name).join(', ')}.`,
        'Do not invent other tools. Call a tool when you need current document state; otherwise answer briefly.',
      ],
    });
  }

  const runtimeLines: string[] = [
    'When the user refers to "this", "the article", or selected text, use the provided source context.',
    'For questions about the user\'s library: call search_documents once, or list_documents to survey. Both include every document type (note, concept, mindmap, …) inside folders; use the folder field as the path. search_notes / list_notes / read_note are aliases.',
    'If search returns hits, call read_document on the best 1-3 ids (full ids, never truncated), then answer. Do not keep trying new search phrases after you have a hit.',
    'If search and list are empty, say so and stop.',
    'Cite the full document id when you use a document.',
    'If the user mentions another chat or asks you to check with another agent, call chat_search or chat_list, then chat_read. Use agent_list or agent_status for live runs. Use tags_search for tagged spans.',
  ];

  const source = req.source;
  if (source?.title) runtimeLines.push(`Title: ${source.title}`);
  if (source?.documentId) runtimeLines.push(`Document id: ${source.documentId}`);
  if (source?.selection?.text) {
    runtimeLines.push(`Selected text:\n${source.selection.text}`);
  }
  if (source?.content) {
    runtimeLines.push(`Document content:\n${source.content}`);
  }
  if (req.space?.access === 'runtime') {
    runtimeLines.push('You can list and read files in the active runtime folder.');
  }
  if (req.memory?.chatStoreId) {
    runtimeLines.push(
      'You can list, search, and read saved agent chats with chat_list, chat_search, and chat_read.',
    );
  }
  if (req.memory?.embeddingsId && req.memory?.vectorStoreId) {
    runtimeLines.push('You can search indexed chat memory with memory_search.');
  }
  if (req.webSearch?.providerId) {
    runtimeLines.push(
      'You can search the public web with web_search for current facts outside the user library. Cite result URLs when you use them.',
    );
  }
  runtimeLines.push(
    'You can list agent activity with agent_list and agent_status when those tools are present.',
  );
  runtimeLines.push(
    'You can query and create tags and relations with tags_list, tags_search, tags_annotate, links_search, and links_relate.',
  );
  if (browserTools.some((t) => t.name === 'create_document')) {
    runtimeLines.push(
      'Document creation and editing capabilities:\n' +
        '- Create any document type with `create_document` (or dedicated tools like `concept_create` / `mindmap_create`).\n' +
        '- Call `get_available_document_types` before creating complex documents.\n' +
        '- Prefer dedicated plugin tools when they exist.\n' +
        '- Update with `update_document`. Inspect with `get_active_document` and `list_workspace_tabs`.\n' +
        '- Create receipts include document.id, type, and folderId. Always use the full id for later moves.',
    );
  }
  if (
    browserTools.some(
      (t) =>
        t.name === 'list_folders' ||
        t.name === 'create_folder' ||
        t.name === 'move_document_to_folder' ||
        t.name === 'move_note_to_folder',
    )
  ) {
    runtimeLines.push(
      'Folder tools follow the active space and apply to every document type.\n' +
        '- Call `list_folders` for id, name, parentId, and path.\n' +
        '- Call `create_folder` with name. Pass parentId to nest.\n' +
        '- Call `move_document_to_folder` with documentId and folderId (move_note_to_folder is an alias).',
    );
  }
  if (browserTools.length > 0) {
    runtimeLines.push(
      `Extra tools: ${browserTools.map((item) => item.name).join(', ')}.`,
    );
  }

  return composeAgentSystemPrompt({
    persona,
    personaName,
    uiMechanics: req.uiMechanics,
    runtimeLines,
  });
}
