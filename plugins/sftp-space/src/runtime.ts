/**
 * Runtime half: bind filesystem.sftp sessions onto the host filesystem router.
 * Compiled to dist/runtime.mjs. ssh2 stays an external Node package.
 */
import { connectSftp, createSftpFilesystem } from '../sftpClient.mjs';

interface SftpSession {
  close: () => void;
}

interface SpaceSessionsApi {
  registerBindHandler: (
    backendId: string,
    handler: {
      bind: (spaceId: string, config: Record<string, unknown>) => Promise<void>;
      unbind: (spaceId: string) => Promise<void>;
    },
  ) => void;
  attachFilesystem: (spaceId: string, impl: unknown) => void;
  detachFilesystem: (spaceId: string) => void;
}

interface RuntimeContext {
  getCapability: (id: string) => Promise<SpaceSessionsApi | null>;
  log: { info: (message: string) => void };
}

const sessions = new Map<string, SftpSession>();

export const plugin = {
  manifest: {
    id: 'readergo.sftp-space',
    name: 'SFTP Space',
    version: '0.1.0',
    description: 'Store notes on an SFTP server',
    provides: ['filesystem.sftp'],
    permissions: ['filesystem:read', 'filesystem:write'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context: RuntimeContext) {
    const api = await context.getCapability('space-sessions');
    if (!api) {
      throw new Error('space-sessions capability missing (filesystem plugin)');
    }
    api.registerBindHandler('filesystem.sftp', {
      async bind(spaceId, config) {
        const resolved = {
          host: String(config.host || '127.0.0.1'),
          port: String(config.port || '2222'),
          username: String(config.username || 'readergo'),
          password:
            config.password != null && String(config.password) !== ''
              ? String(config.password)
              : 'readergo',
          rootPath: String(config.rootPath || '/'),
        };
        const connected = await connectSftp(resolved);
        sessions.set(spaceId, connected);
        const fsImpl = createSftpFilesystem(connected, resolved.rootPath);
        api.attachFilesystem(spaceId, fsImpl);
      },
      async unbind(spaceId) {
        api.detachFilesystem(spaceId);
        const existing = sessions.get(spaceId);
        existing?.close();
        sessions.delete(spaceId);
      },
    });
    context.log.info('SFTP Space Runtime plugin ready');
  },
};

export default plugin;
