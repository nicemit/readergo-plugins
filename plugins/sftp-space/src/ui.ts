/**
 * UI half: registers the SFTP Space backend.
 * Compiled to dist/ui.js before the browser loads it.
 */
interface SftpUiContext {
  registerRuntimeFilesystemBackend?: (descriptor: {
    id: string;
    name: string;
    description?: string;
    configFields?: Array<{
      key: string;
      label: string;
      kind: 'text' | 'path' | 'directory-picker';
      required?: boolean;
      placeholder?: string;
    }>;
  }) => Promise<void>;
  log: { info: (message: string) => Promise<void> | void };
}

export const SftpSpacePlugin = {
  manifest: {
    id: 'readergo.sftp-space',
    name: 'SFTP Space',
    version: '0.1.0',
    description: 'Store notes on an SFTP server (host, user, remote folder).',
    category: 'storage',
    provides: ['filesystem.sftp'],
    requires: [],
    permissions: ['filesystem:read', 'filesystem:write'],
    source: 'external',
    trust: 'trusted',
    main: 'dist/ui.js',
    runtime: 'local',
    boot: 'early',
    components: { ui: './dist/ui.js', runtime: './dist/runtime.mjs' },
  },
  async activate(context: SftpUiContext) {
    if (typeof context.registerRuntimeFilesystemBackend !== 'function') {
      throw new Error('Host does not support registerRuntimeFilesystemBackend');
    }
    await context.registerRuntimeFilesystemBackend({
      id: 'filesystem.sftp',
      name: 'SFTP',
      description:
        'Notes on an SFTP server. Start the local fixture or point at your own host.',
      configFields: [
        { key: 'host', label: 'Host', kind: 'text', required: true, placeholder: '127.0.0.1' },
        { key: 'port', label: 'Port', kind: 'text', required: true, placeholder: '2222' },
        { key: 'username', label: 'Username', kind: 'text', required: true, placeholder: 'readergo' },
        { key: 'password', label: 'Password', kind: 'text', required: true, placeholder: 'readergo' },
        { key: 'rootPath', label: 'Remote folder', kind: 'text', required: true, placeholder: '/' },
      ],
    });
    await context.log.info('SFTP Space backend registered');
  },
  async deactivate(context: SftpUiContext) {
    await context.log.info('SFTP Space UI deactivated');
  },
};

export default SftpSpacePlugin;
