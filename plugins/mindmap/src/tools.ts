import type { PluginContext } from '@readergo/plugin-sdk';
import { MINDMAP_ROOT_ID, type MindNode } from './types';

export async function registerMindmapTools(context: PluginContext): Promise<void> {
  await context.registerTool({
    name: 'mindmap_create',
    description:
      'Create a new mindmap document with a central root idea and radiating branches and sub-branches.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the mindmap document.',
        },
        rootText: {
          type: 'string',
          description: 'Label for the central root idea or topic.',
        },
        branches: {
          type: 'array',
          description:
            'List of branch topics radiating from the root. Each branch has "text" and optional "subBranches".',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Branch topic label' },
              subBranches: {
                type: 'array',
                description: 'Optional subtopics under this branch',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: 'Subtopic label' },
                    subBranches: {
                      type: 'array',
                      description: 'Optional third-level topics',
                      items: { type: 'string' },
                    },
                  },
                  required: ['text'],
                },
              },
            },
            required: ['text'],
          },
        },
        folderId: {
          type: 'string',
          description: 'Optional folder id to place the mindmap in.',
        },
        openAfterCreate: {
          type: 'boolean',
          description:
            'Whether to immediately navigate to and open the created mindmap in the editor. Defaults to true.',
        },
      },
      required: ['title', 'rootText'],
    },
    handler: async (args: Record<string, unknown>) => {
      const title =
        typeof args.title === 'string' && args.title.trim()
          ? args.title.trim()
          : 'Mindmap';
      const rootText =
        typeof args.rootText === 'string' && args.rootText.trim()
          ? args.rootText.trim()
          : title;
      const branches = Array.isArray(args.branches) ? args.branches : [];
      const folderId =
        typeof args.folderId === 'string' && args.folderId.trim()
          ? args.folderId.trim()
          : undefined;
      const openAfterCreate = args.openAfterCreate !== false;

      const rootId = MINDMAP_ROOT_ID;
      const nodes: Record<string, MindNode> = {
        [rootId]: {
          id: rootId,
          parentId: null,
          text: rootText,
          order: 0,
        },
      };

      let counter = 1;
      for (let i = 0; i < branches.length; i++) {
        const b = branches[i] as Record<string, unknown> | string;
        const bText = typeof b === 'string' ? b : b?.text;
        if (!bText || typeof bText !== 'string') continue;
        const bId = `node_${counter++}`;
        nodes[bId] = {
          id: bId,
          parentId: rootId,
          text: bText.trim(),
          order: i,
        };

        if (b && typeof b === 'object' && Array.isArray(b.subBranches)) {
          for (let j = 0; j < b.subBranches.length; j++) {
            const sub = b.subBranches[j] as Record<string, unknown> | string;
            const subText = typeof sub === 'string' ? sub : sub?.text;
            if (!subText || typeof subText !== 'string') continue;
            const subId = `node_${counter++}`;
            nodes[subId] = {
              id: subId,
              parentId: bId,
              text: subText.trim(),
              order: j,
            };

            if (sub && typeof sub === 'object' && Array.isArray(sub.subBranches)) {
              for (let k = 0; k < sub.subBranches.length; k++) {
                const leaf = sub.subBranches[k] as Record<string, unknown> | string;
                const leafText = typeof leaf === 'string' ? leaf : leaf?.text;
                if (!leafText || typeof leafText !== 'string') continue;
                const leafId = `node_${counter++}`;
                nodes[leafId] = {
                  id: leafId,
                  parentId: subId,
                  text: leafText.trim(),
                  order: k,
                };
              }
            }
          }
        }
      }

      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `map_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const createRes = await context.executeCommand('readergo.note.create', {
        id,
        title,
        type: 'mindmap',
        data: { nodes },
        folderId,
      });

      if (createRes && createRes.success === false) {
        return {
          success: false,
          error: createRes.error || 'Failed to create mindmap',
        };
      }

      const createdDoc = createRes?.data;
      const targetId = createdDoc?.id || id;

      if (openAfterCreate) {
        try {
          await context.executeCommand('readergo.core.openNote', { noteId: targetId });
        } catch {
          // Non-fatal navigation failure
        }
      }

      return {
        success: true,
        document: {
          id: targetId,
          title,
          type: 'mindmap',
          nodeCount: Object.keys(nodes).length,
          opened: openAfterCreate,
        },
        message: `Successfully created mindmap "${title}" with ${Object.keys(nodes).length} nodes.`,
      };
    },
  });

  await context.registerTool({
    name: 'mindmap_add_node',
    description:
      'Add a new idea or subtopic node to an existing mindmap document.',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Unique document ID of the mindmap to update.',
        },
        text: {
          type: 'string',
          description: 'Text label for the new node.',
        },
        parentId: {
          type: 'string',
          description:
            'Optional ID of the parent node to attach under. If omitted or not found, attaches under the central root node.',
        },
      },
      required: ['documentId', 'text'],
    },
    handler: async (args: Record<string, unknown>) => {
      const documentId =
        typeof args.documentId === 'string' ? args.documentId.trim() : '';
      const text = typeof args.text === 'string' ? args.text.trim() : '';
      if (!documentId || !text) {
        return { success: false, error: 'Both documentId and text are required.' };
      }

      const getRes = await context.executeCommand('readergo.note.get', {
        id: documentId,
      });
      const doc = getRes?.data;
      if (!doc) {
        return { success: false, error: `Document "${documentId}" not found.` };
      }

      let nodes: Record<string, MindNode> = {};
      if (doc.data && typeof doc.data === 'object' && doc.data.nodes) {
        nodes = { ...doc.data.nodes };
      } else {
        nodes[MINDMAP_ROOT_ID] = {
          id: MINDMAP_ROOT_ID,
          parentId: null,
          text: doc.title || 'Central idea',
          order: 0,
        };
      }

      const parentId =
        typeof args.parentId === 'string' && nodes[args.parentId.trim()]
          ? args.parentId.trim()
          : MINDMAP_ROOT_ID;

      const nodeId = `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const siblingCount = Object.values(nodes).filter(
        (n) => n.parentId === parentId,
      ).length;

      nodes[nodeId] = {
        id: nodeId,
        parentId,
        text,
        order: siblingCount,
      };

      const updateRes = await context.executeCommand('readergo.note.update', {
        id: documentId,
        data: { nodes },
      });

      if (updateRes && updateRes.success === false) {
        return {
          success: false,
          error: updateRes.error || 'Failed to update mindmap',
        };
      }

      return {
        success: true,
        nodeId,
        parentId,
        text,
        message: `Added node "${text}" under parent "${parentId}".`,
      };
    },
  });
}
