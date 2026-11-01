import { definePlugin, type EditorProvider, type PluginContext } from '@readergo/plugin-sdk';
import { Network } from 'lucide-react';
import { MindmapEditor, createMindmapDocument } from './MindmapEditor';
import { registerMindmapTools } from './tools';

const manifest = {
  id: 'readergo.editor.mindmap',
  name: 'Mindmap',
  version: '0.2.0',
  description: 'Create, edit, and save mind maps.',
  category: 'editor' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: [],
};

const mindmapEditorProvider: EditorProvider = {
  id: 'mindmap-editor',
  name: 'Mindmap',
  componentId: 'mindmap',
  supportedTypes: ['mindmap'],
};

export default definePlugin({
  manifest: manifest as never,
  async setup(context: PluginContext) {
    context.log.info('Mindmap plugin activated');
    context.registerCapability('editor-provider', mindmapEditorProvider);

    context.registerDocumentType({
      type: 'mindmap',
      label: 'Mindmap',
      icon: Network,
      create: () => createMindmapDocument(),
    });

    context.registerEditor({
      type: 'mindmap',
      component: MindmapEditor,
      capabilityId: mindmapEditorProvider.id,
    });

    context.registerCapability('activity-bar-item', {
      id: 'mindmap-new',
      label: 'New Mindmap',
      noteType: 'mindmap',
      icon: Network,
      position: 'top',
      order: 6,
    });

    // Expose dedicated Agent/MCP tools for AI assistants
    await registerMindmapTools(context);

    return async () => {
      context.log.info('Mindmap plugin deactivated');
    };
  },
});


