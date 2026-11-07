import {
  definePlugin,
  WellKnownPlaces,
  type EditorProvider,
  type PluginContext,
} from '@readergo/plugin-sdk';
import { GraduationCap } from 'lucide-react';
import { ConceptEditor } from './ConceptEditor';
import { conceptSummary, createConceptDocument, emptyConceptData } from './schema';
import { registerConceptTools } from './tools';
import { CONCEPT_TYPE } from './types';

const manifest = {
  id: 'readergo.features.concept-learn',
  name: 'Concept Learn',
  version: '0.1.3',
  description:
    'Interactive concept workspace with learning map, playgrounds, and a Socratic tutor on the shared AI backend.',
  category: 'feature' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: ['note:read', 'note:write'],
};

const editorProvider: EditorProvider = {
  id: 'concept-learn-editor',
  name: 'Concept Learn',
  componentId: 'concept',
  supportedTypes: [CONCEPT_TYPE],
};

export default definePlugin({
  manifest: manifest as never,
  async setup(context: PluginContext) {
    context.log.info('Concept Learn plugin activated');
    context.registerCapability('editor-provider', editorProvider);

    context.registerDocumentType({
      type: CONCEPT_TYPE,
      label: 'Concept',
      icon: GraduationCap,
      create: () => createConceptDocument(),
    });

    context.registerEditor({
      type: CONCEPT_TYPE,
      component: ConceptEditor,
      capabilityId: editorProvider.id,
      layout: 'fill',
      ownsTitle: true,
    });

    context.registerCapability('activity-bar-item', {
      id: 'concept-learn-new',
      label: 'Learn',
      noteType: CONCEPT_TYPE,
      icon: GraduationCap,
      position: 'top',
      order: 7,
    });

    await context.registerCommand({
      id: 'readergo.concept-learn.fromSelection',
      title: 'Learn this',
      handler: async (payload?: { text?: string }) => {
        const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
        if (!text) return { success: false, error: 'No selection' };

        const firstLine = text.split(/\n/)[0]?.trim() || text.slice(0, 80);
        const topic =
          firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
        const data = emptyConceptData();
        data.seed = { mode: 'spark', topic, raw: text };

        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `concept_${Date.now()}`;

        const createRes = await context.executeCommand('readergo.note.create', {
          id,
          title: topic,
          type: CONCEPT_TYPE,
          content: conceptSummary(data),
          data,
        });
        if (createRes && createRes.success === false) {
          return {
            success: false,
            error: createRes.error || 'Failed to create concept',
          };
        }
        const targetId = createRes?.data?.id || id;
        try {
          await context.executeCommand('readergo.core.openNote', {
            noteId: targetId,
          });
        } catch {
          // non-fatal
        }
        return { success: true, noteId: targetId };
      },
    });

    await context.registerContribution({
      id: 'readergo.concept-learn.selection-learn',
      place: WellKnownPlaces.EDITOR_SELECTION_MENU,
      title: 'Learn this',
      order: 35,
      requires: ['text-range'],
      when: { hasSelection: true },
      commandId: 'readergo.concept-learn.fromSelection',
    });

    await registerConceptTools(context);

    return async () => {
      context.log.info('Concept Learn plugin deactivated');
    };
  },
});
