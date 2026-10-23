import { PluginContext, EditorProvider, definePlugin } from '@readergo/plugin-sdk';
import { LayoutDashboard } from 'lucide-react';
import { CanvasDocumentEditor } from './CanvasDocumentEditor';
// audit-ignore: sdk-boundary - Internal plugin uses shared skeleton component
import { CanvasSkeleton } from '@/components/ui/LoadingSkeleton';

const manifest = {
  id: 'readergo.editor.canvas',
  name: 'Canvas',
  version: '1.0.0',
  description: 'Structured infinite canvas for organizing documents',
  category: 'editor' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: [],
};

const canvasEditorProvider: EditorProvider = {
  id: 'canvas-editor',
  name: 'Canvas',
  componentId: 'canvas',
  supportedTypes: ['canvas'],
};

export default definePlugin({
  manifest: manifest as any,
  async setup(context: PluginContext) {
    context.log.info('Canvas plugin activated');
    context.registerCapability('editor-provider', canvasEditorProvider);

    context.registerDocumentType({
      type: 'canvas',
      label: 'Canvas',
      icon: LayoutDashboard,
      create: () => ({
        content: '',
        data: {
          nodes: {},
          edges: {},
          viewport: { x: 0, y: 0, zoom: 1 },
          gridSize: 32,
        },
      }),
    });

    context.registerEditor({
      type: 'canvas',
      component: CanvasDocumentEditor,
      capabilityId: canvasEditorProvider.id,
      loadingComponent: CanvasSkeleton,
    });

    context.registerCapability('activity-bar-item', {
      id: 'canvas-new',
      label: 'New Canvas',
      noteType: 'canvas',
      icon: LayoutDashboard,
      position: 'top',
      order: 5,
    });

    return async () => {
      context.log.info('Canvas plugin deactivated');
    };
  },
});

