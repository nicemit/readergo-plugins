/**
 * Sideload entry for Filesystem UI marker.
 * Filesystem ops run in the Runtime Host.
 */
export const FilesystemUiPlugin = {
  manifest: {
    id: 'readergo.filesystem',
    name: 'Filesystem (Runtime)',
    category: 'storage',
    version: '0.3.0',
    description:
      'Runtime filesystem capability for Spaces. Requires Local Runtime Host.',
    provides: ['filesystem-ui'],
    requires: [],
    permissions: ['filesystem:read', 'filesystem:write'],
    source: 'external',
    trust: 'trusted',
    main: 'index.js',
    runtime: 'local',
  },
  async activate(context) {
    await context.log.info(
      'Filesystem UI plugin activated (Runtime Spaces + /fs-demo harness)',
    );
  },
  async deactivate(context) {
    await context.log.info('Filesystem UI plugin deactivated');
  },
};

export default FilesystemUiPlugin;
