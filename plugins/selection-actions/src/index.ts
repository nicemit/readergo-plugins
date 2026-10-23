/**
 * Selection Actions plugin
 *
 * Demo Contribution Places contributor for `editor/selection-menu`.
 * Works on any editor that advertises `text-range` (Note TipTap, Simple, etc.).
 */

import { Plugin, PluginContext, WellKnownPlaces } from '@readergo/plugin-sdk';

const manifest = {
  id: 'readergo.features.selection-actions',
  name: 'Selection Actions',
  version: '1.0.0',
  description: 'Contribution Places demo: Copy and Log on text selection',
  category: 'feature' as const,
  provides: [],
  requires: [],
  permissions: [],
};

export const SelectionActionsPlugin: Plugin = {
  manifest,
  async activate(context: PluginContext) {
    context.log.info('Selection Actions plugin activating...');

    await context.registerCommand({
      id: 'readergo.selection.copy',
      title: 'Copy Selection',
      handler: async (payload?: { text?: string }) => {
        const text = payload?.text || '';
        if (!text) return { success: false, error: 'No selection' };
        try {
          await navigator.clipboard.writeText(text);
          context.log.info(`Copied ${text.length} characters`);
          return { success: true };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, error: message };
        }
      },
    });

    await context.registerCommand({
      id: 'readergo.selection.log',
      title: 'Log Selection',
      handler: async (payload?: { text?: string; editorType?: string; documentId?: string }) => {
        context.log.info(
          `Selection (${payload?.editorType || 'unknown'} / ${payload?.documentId || '-'}):`,
          payload?.text || '',
        );
        return { success: true, length: payload?.text?.length || 0 };
      },
    });

    await context.registerContribution({
      id: 'readergo.selection-actions.copy',
      place: WellKnownPlaces.EDITOR_SELECTION_MENU,
      title: 'Copy',
      order: 10,
      requires: ['text-range'],
      when: { hasSelection: true },
      commandId: 'readergo.selection.copy',
    });

    await context.registerContribution({
      id: 'readergo.selection-actions.log',
      place: WellKnownPlaces.EDITOR_SELECTION_MENU,
      title: 'Log',
      order: 20,
      requires: ['text-range'],
      when: { hasSelection: true },
      commandId: 'readergo.selection.log',
    });

    context.log.info('Registered editor/selection-menu contributions');
  },
  deactivate(context: PluginContext) {
    context.log.info('Selection Actions plugin deactivated');
  },
};
