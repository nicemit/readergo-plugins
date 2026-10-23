import {
  PluginContext,
  EditorProvider,
  definePlugin,
} from '@readergo/plugin-sdk';
import React from 'react';
import { PenLine } from 'lucide-react';
import { WhiteboardDocumentEditor } from './WhiteboardDocumentEditor';

const manifest = {
  id: 'readergo.editor.whiteboard',
  name: 'Whiteboard',
  version: '1.0.0',
  description: 'Infinite canvas whiteboard documents',
  category: 'editor' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: [],
};

const whiteboardEditorProvider: EditorProvider = {
  id: 'whiteboard-editor',
  name: 'Whiteboard',
  componentId: 'whiteboard',
  supportedTypes: ['whiteboard'],
};

export default definePlugin({
  manifest: manifest as any,
  async setup(context: PluginContext) {
    context.log.info('Whiteboard plugin activated');
    context.registerCapability('editor-provider', whiteboardEditorProvider);

    context.registerDocumentType({
      type: 'whiteboard',
      label: 'Whiteboard',
      icon: PenLine,
      create: () => ({
        content: '',
        data: {
          nodes: {},
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      }),
    });

    context.registerEditor({
      type: 'whiteboard',
      component: WhiteboardDocumentEditor,
      capabilityId: whiteboardEditorProvider.id,
    });

    context.registerCapability('activity-bar-item', {
      id: 'whiteboard-new',
      label: 'New Whiteboard',
      noteType: 'whiteboard',
      icon: PenLine,
      position: 'top',
      order: 4,
    });

    return async () => {
      context.log.info('Whiteboard plugin deactivated');
    };
  },
});
