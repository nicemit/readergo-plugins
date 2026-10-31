import React from 'react';
import type { Plugin, PluginContext, PluginManifest, SidebarPanel } from '@readergo/plugin-sdk';
import { Brain } from 'lucide-react';
import { ThinkingPartnerPanel } from './ThinkingPartnerPanel';
import { extractProfile, findRelatedNotes } from './engine';

const manifest: PluginManifest = {
  id: 'readergo.features.thinking-partner',
  name: 'Thinking Partner',
  version: '1.0.7',
  description: 'In-editor intelligence: automatic knowledge connection discovery, unlinked mention linking, and dynamic content-aware actions',
  category: 'ai',
  provides: ['sidebar-panel', 'thinking-partner-service'],
  requires: ['document-storage'],
  permissions: ['note:read', 'note:write'],
  trust: 'trusted',
  source: 'external',
  runtime: 'local',
};

export const ThinkingPartnerPlugin: Plugin = {
  manifest,

  async activate(context: PluginContext): Promise<void> {
    context.log.info('Thinking Partner plugin activating...');

    // 1. Register Sidebar Panel for Right Sidebar
    const thinkingPanel: SidebarPanel = {
      id: 'readergo.thinking-partner.panel',
      name: 'Thinking Partner',
      icon: Brain,
      position: 'right',
      order: 5, // Top priority right below outline/scrollspy
      render: (props) => <ThinkingPartnerPanel {...props} />,
    };

    context.registerCapability('sidebar-panel', thinkingPanel);
    context.log.info('✅ Registered sidebar-panel capability');

    // 2. Register Thinking Partner Service for peer agent queries
    context.registerCapability('thinking-partner-service', {
      analyzeNote: async (noteId: string) => {
        const storage = await context.getCapability<any>('document-storage');
        if (!storage) return null;
        const doc = await storage.get(noteId);
        if (!doc) return null;

        const profile = extractProfile(doc.title || '', doc.content || '');
        const all = (await storage.list()) || [];
        const validOther = await Promise.all(
          all.slice(0, 30).map(async (d: any) => {
            if (d.id === noteId) return null;
            try {
              return await storage.get(d.id);
            } catch {
              return d;
            }
          })
        );
        const related = findRelatedNotes(noteId, profile, validOther.filter(Boolean));
        return { profile, related };
      },
    });

    // 3. Register Command for Palette Execution
    await context.registerCommand({
      id: 'readergo.thinking-partner.findConnections',
      title: 'Thinking Partner: Find Related Notes',
      handler: async (payload?: { noteId: string }) => {
        if (!payload?.noteId) return false;
        context.emit('thinking-partner:re-analyze', { noteId: payload.noteId });
        return true;
      },
    });

    context.log.info('✅ Thinking Partner plugin activated successfully');
  },

  deactivate(context: PluginContext) {
    context.log.info('Thinking Partner plugin deactivated');
  },
};

export default ThinkingPartnerPlugin;
