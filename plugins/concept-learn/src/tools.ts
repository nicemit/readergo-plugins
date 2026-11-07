import type { PluginContext } from '@readergo/plugin-sdk';
import { emptyConceptData, conceptSummary } from './schema';
import { CONCEPT_TYPE } from './types';

export async function registerConceptTools(context: PluginContext): Promise<void> {
  await context.registerTool({
    name: 'concept_create',
    description:
      'Create a Concept Learn document for a topic or spark text. Opens an interactive learning workspace (map, playgrounds, Socratic tutor).',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Concept topic, e.g. "game theory" or "cognitive biases".',
        },
        spark: {
          type: 'string',
          description:
            'Optional pasted spark (caption, quote, notes). When set, mode is spark.',
        },
        title: {
          type: 'string',
          description: 'Optional document title. Defaults to topic.',
        },
        folderId: {
          type: 'string',
          description: 'Optional folder id.',
        },
        openAfterCreate: {
          type: 'boolean',
          description: 'Open the concept after create. Defaults to true.',
        },
      },
      required: ['topic'],
    },
    handler: async (args: Record<string, unknown>) => {
      const topic =
        typeof args.topic === 'string' && args.topic.trim()
          ? args.topic.trim()
          : '';
      if (!topic) {
        return { success: false, error: 'topic is required' };
      }
      const spark =
        typeof args.spark === 'string' && args.spark.trim()
          ? args.spark.trim()
          : undefined;
      const title =
        typeof args.title === 'string' && args.title.trim()
          ? args.title.trim()
          : topic;
      const folderId =
        typeof args.folderId === 'string' && args.folderId.trim()
          ? args.folderId.trim()
          : undefined;
      const openAfterCreate = args.openAfterCreate !== false;

      const data = emptyConceptData();
      data.seed = spark
        ? { mode: 'spark', topic, raw: spark }
        : { mode: 'topic', topic };

      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `concept_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const createRes = await context.executeCommand('readergo.note.create', {
        id,
        title,
        type: CONCEPT_TYPE,
        content: conceptSummary(data),
        data,
        folderId,
      });

      if (createRes && createRes.success === false) {
        return {
          success: false,
          error: createRes.error || 'Failed to create concept',
        };
      }

      const targetId = createRes?.data?.id || id;
      if (openAfterCreate) {
        try {
          await context.executeCommand('readergo.core.openNote', {
            noteId: targetId,
          });
        } catch {
          // non-fatal
        }
      }

      return {
        success: true,
        document: {
          id: targetId,
          title,
          type: CONCEPT_TYPE,
          opened: openAfterCreate,
        },
        message: `Created concept "${title}". Open it and tap Learn to build the map (or rebuild in the editor).`,
      };
    },
  });
}
