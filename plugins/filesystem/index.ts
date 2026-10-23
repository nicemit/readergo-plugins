/**
 * Filesystem Runtime UI marker plugin - appears on Settings → Plugins.
 * Actual FS ops run in Runtime Host; this registers the UI half only.
 */

import { Plugin, PluginManifest } from '@readergo/plugin-sdk';

const manifest: PluginManifest = {
  id: 'readergo.filesystem',
  name: 'Filesystem (Runtime)',
  category: 'storage',
  version: '0.2.0',
  author: 'ReaderGo',
  description:
    'Runtime filesystem capability for Spaces with access=runtime. Requires Local Runtime Host.',
  provides: ['filesystem-ui'],
  requires: [],
  permissions: ['filesystem:read', 'filesystem:write'],
  source: 'bundled',
  trust: 'trusted',
  components: { ui: './ui', runtime: './runtime' },
};

export const FilesystemUiPlugin: Plugin = {
  manifest,
  async activate(context) {
    context.log.info(
      'Filesystem UI plugin activated (Runtime Spaces + /fs-demo harness)',
    );
  },
  async deactivate(context) {
    context.log.info('Filesystem UI plugin deactivated');
  },
};

export default FilesystemUiPlugin;
