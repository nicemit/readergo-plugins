import type { Plugin, PluginContext } from '@readergo/plugin-sdk';
import {
  registerBrowserAgentTool,
  unregisterBrowserAgentTool,
} from '@/lib/runtime/agentToolRegistry';

const TOOL_NAME = 'note_digest';

export const NoteDigestPlugin: Plugin = {
  manifest: {
    id: 'readergo.tools.note-digest',
    name: 'Note Digest',
    version: '0.1.0',
    description: 'Adds a note_digest tool the agent can call for one note.',
    category: 'ai',
    provides: [],
    requires: ['document-storage'],
    permissions: ['note:read'],
  },
  async activate(context: PluginContext) {
    registerBrowserAgentTool({
      name: TOOL_NAME,
      description: 'Return a short plain-text digest of one note by id.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      handler: async (args) => digestNote(context, args),
    });
    context.log.info('note_digest tool registered');
  },
  async deactivate() {
    unregisterBrowserAgentTool(TOOL_NAME);
  },
};

async function digestNote(
  context: PluginContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  const id = typeof args.id === 'string' ? args.id.trim() : '';
  if (!id) return { error: 'id is required' };
  const notes = await context.getCapability<{
    get: (noteId: string) => Promise<{ id?: string; title?: string; content?: string } | null>;
  }>('document-storage');
  if (!notes) return { error: 'document-storage is not available' };
  const note = await notes.get(id);
  if (!note) return { error: `Note ${id} was not found` };
  const plain = String(note.content ?? '').replace(/\s+/g, ' ').trim();
  return {
    id: note.id || id,
    title: note.title || id,
    digest: plain.slice(0, 400),
  };
}
