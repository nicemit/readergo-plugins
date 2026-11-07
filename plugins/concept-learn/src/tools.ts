import type { PluginContext } from '@readergo/plugin-sdk';
import {
  getConceptSession,
} from './conceptSession';
import { emptyConceptData, conceptSummary, normalizeConceptData } from './schema';
import { CONCEPT_TYPE } from './types';
import type { ConceptData, ConceptNode } from './types';

/** Specs passed on tutor turns (read-only). Handlers live in the registry. */
export const CONCEPT_TUTOR_TOOL_SPECS: Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> = [
  {
    name: 'concept_get_state',
    description:
      'Read-only. Get the open Concept Learn document overview: topic, progress, node list (id/title/status), and active node id. Use before answering when you need the map.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description:
            'Optional concept document id. Defaults to the concept open in the editor.',
        },
      },
    },
  },
  {
    name: 'concept_get_node',
    description:
      'Read-only. Get one concept node: title, status, explain text, and playground (including learner state). Defaults to the active node.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description:
            'Optional concept document id. Defaults to the concept open in the editor.',
        },
        nodeId: {
          type: 'string',
          description: 'Node id. Defaults to the active node.',
        },
      },
    },
  },
];

type NotePayload = {
  id?: string;
  title?: string;
  type?: string;
  data?: unknown;
};

async function loadConceptDocument(
  context: PluginContext,
  documentId?: string,
): Promise<{ documentId: string; title: string; data: ConceptData } | { error: string }> {
  const live = getConceptSession();
  if (live && (!documentId || documentId === live.documentId)) {
    return {
      documentId: live.documentId,
      title: live.title || live.data.seed?.topic || 'Concept',
      data: live.data,
    };
  }

  let id = documentId?.trim() || '';
  if (!id) {
    try {
      const source = await context.executeCommand<{
        document?: { documentId?: string } | null;
      }>('readergo.chat-source.get');
      id = source?.document?.documentId?.trim() || '';
    } catch {
      // fall through
    }
  }
  if (!id) {
    return { error: 'No concept document is open.' };
  }

  const getRes = await context.executeCommand<{
    success?: boolean;
    data?: NotePayload;
    error?: string;
  }>('readergo.note.get', { id });

  const note = getRes?.data;
  if (!note || typeof note !== 'object') {
    return { error: getRes?.error || `Document "${id}" not found.` };
  }
  if (note.type && note.type !== CONCEPT_TYPE) {
    return { error: `Document "${id}" is type "${note.type}", not a concept.` };
  }

  return {
    documentId: note.id || id,
    title: note.title || 'Concept',
    data: normalizeConceptData(note.data),
  };
}

function summarizeNode(node: ConceptNode) {
  return {
    id: node.id,
    title: node.title,
    status: node.status,
  };
}

function detailNode(node: ConceptNode) {
  return {
    id: node.id,
    title: node.title,
    status: node.status,
    explainMd: node.explainMd,
    playground: node.playground,
  };
}

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

  await context.registerTool({
    name: 'concept_get_state',
    description: CONCEPT_TUTOR_TOOL_SPECS[0].description,
    inputSchema: CONCEPT_TUTOR_TOOL_SPECS[0].inputSchema,
    handler: async (args: Record<string, unknown>) => {
      const documentId =
        typeof args.documentId === 'string' ? args.documentId.trim() : undefined;
      const loaded = await loadConceptDocument(context, documentId);
      if ('error' in loaded) {
        return { success: false, error: loaded.error };
      }
      const { data, title } = loaded;
      return {
        success: true,
        readOnly: true,
        documentId: loaded.documentId,
        title,
        topic: data.seed?.topic || title,
        mode: data.seed?.mode || null,
        building: Boolean(data.building),
        buildError: data.buildError || null,
        activeNodeId: data.activeNodeId,
        progress: {
          completedCount: data.progress.completedNodeIds.length,
          totalNodes: data.map.nodes.length,
          completedNodeIds: data.progress.completedNodeIds,
        },
        nodes: data.map.nodes.map(summarizeNode),
      };
    },
  });

  await context.registerTool({
    name: 'concept_get_node',
    description: CONCEPT_TUTOR_TOOL_SPECS[1].description,
    inputSchema: CONCEPT_TUTOR_TOOL_SPECS[1].inputSchema,
    handler: async (args: Record<string, unknown>) => {
      const documentId =
        typeof args.documentId === 'string' ? args.documentId.trim() : undefined;
      const nodeId =
        typeof args.nodeId === 'string' ? args.nodeId.trim() : undefined;
      const loaded = await loadConceptDocument(context, documentId);
      if ('error' in loaded) {
        return { success: false, error: loaded.error };
      }
      const { data } = loaded;
      const id = nodeId || data.activeNodeId || '';
      if (!id) {
        return { success: false, error: 'No active node and no nodeId given.' };
      }
      const node = data.map.nodes.find((n) => n.id === id);
      if (!node) {
        return {
          success: false,
          error: `Node "${id}" not found.`,
          availableNodeIds: data.map.nodes.map((n) => n.id),
        };
      }
      return {
        success: true,
        readOnly: true,
        documentId: loaded.documentId,
        isActive: node.id === data.activeNodeId,
        node: detailNode(node),
      };
    },
  });
}
