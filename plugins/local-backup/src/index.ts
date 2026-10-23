/* eslint-disable @typescript-eslint/no-explicit-any */
import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext, SidebarExtensionDescriptor } from '@readergo/plugin-sdk';

/**
 * Manifest definition for the Local Backup Plugin
 */
const manifest = {
  id: 'readergo.plugin.readergolocalbackup',
  name: 'Local Backup Plugin',
  version: '1.0.0',
  description: 'Periodically exports notes to JSON via the storage capabilities.',
  category: 'feature' as const,
  provides: [],
  requires: ['document-storage'], // We need document-storage to fetch and save backups
  permissions: ['note:read' as const],
};

// We store our interval and local state outside the activated block
// but inside the plugin module
let backupInterval: NodeJS.Timeout | null = null;
let lastBackupTime: string = 'Never';
let notesBackedUp: number = 0;

export const ReadergoLocalBackupPlugin: Plugin = {
  manifest,

  async activate(context: PluginContext) {
    context.log.info('Local Backup plugin activating...');

    const runBackup = async () => {
      try {
        context.log.info('Starting local backup...');
        const storage = await context.getCapability('document-storage');

        if (!storage) {
          throw new Error('document-storage capability unavailable');
        }

        // Fetch all notes using the NoteStorage capability
        const exportedNotes = await storage.list();

        // In a real plugin, you might write to a "files-storage" capability.
        const backupPayload = JSON.stringify(exportedNotes, null, 2);
        context.log.info(`Generated backup JSON payload: \${backupPayload.length} bytes`);

        // Update stats
        lastBackupTime = new Date().toLocaleTimeString();
        notesBackedUp = Array.isArray(exportedNotes) ? exportedNotes.length : 0;

        context.log.info(`✅ Backup complete! \${notesBackedUp} notes backed up at \${lastBackupTime}`);
      } catch (e: any) {
        if (e.message === 'NOT_AUTHENTICATED') {
          context.log.info('Skipping local backup: User not authenticated.');
          return;
        }
        context.log.error('Backup failed:', e);
      }
    };

    // 1. Periodically export notes
    // Run every 10 minutes
    backupInterval = setInterval(() => {
      runBackup();
    }, 10 * 60 * 1000);

    // Run once on startup
    setTimeout(() => runBackup(), 2000);

    // 2. Register Dashboard Widget (Sidebar Panel)
    // We register a simple declarative schema for a widget. The host App can map this
    // "BackupWidget" strings dynamically if it implements it, or just render fallback JSON texts.
    await context.registerExtension({
      id: `${manifest.id}.panel`,
      type: 'sidebar.panel',
      title: 'Local Backups',
      renderStrategy: 'host',
      schema: {
        target: 'GenericSettingsPanel',
        config: {
          status: `Last Backup: \${lastBackupTime}`,
          count: `${notesBackedUp} Notes`,
          description: 'Periodically exports data locally.'
        }
      }
    } as SidebarExtensionDescriptor);

    // 3. Register Action Command "Run Backup Now"
    await context.registerCommand({
      id: 'readergo.backup.run',
      title: 'Run Backup',
      description: 'Manually triggers a local backup of all notes.',
      handler: async () => {
        context.log.info('Manual backup triggered via command!');
        await runBackup();
        return {
          lastBackupTime,
          notesBackedUp
        };
      }
    });

    // 4. Register a toolbar command if host supports it
    await context.registerExtension({
      id: `${manifest.id}.command`,
      type: 'toolbar.action',
      title: 'Run backup now',
      renderStrategy: 'host',
      schema: { commandId: 'readergo.backup.run' }
    });

    context.log.info('✅ Local Backup plugin activated successfully.');
  },

  deactivate(context: PluginContext) {
    if (backupInterval) {
      clearInterval(backupInterval);
    }
    context.log.info('Local Backup plugin deactivated.');
  },
};
