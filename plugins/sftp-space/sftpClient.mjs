/**
 * SFTP filesystem capability used by the Runtime plugin.
 * Paths are relative to the Space remote root.
 */
import ssh2 from 'ssh2';

const { Client } = ssh2;

function remotePath(root, input) {
  const base = String(root || '/').replace(/\/$/, '') || '/';
  const rel = String(input || '.').replace(/^\/+/, '');
  if (!rel || rel === '.') return base === '' ? '/' : base;
  if (base === '/') return `/${rel}`;
  return `${base}/${rel}`;
}

function call(sftp, method, args) {
  return new Promise((resolve, reject) => {
    sftp[method](...args, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export async function connectSftp(config) {
  const conn = new Client();
  const sftp = await new Promise((resolve, reject) => {
    conn.on('ready', () => {
      conn.sftp((err, session) => {
        if (err) reject(err);
        else resolve(session);
      });
    });
    conn.on('error', reject);
    conn.connect({
      host: String(config.host || '127.0.0.1'),
      port: Number(config.port || 22),
      username: String(config.username || ''),
      password: config.password != null ? String(config.password) : undefined,
      readyTimeout: 10000,
    });
  });
  return {
    conn,
    sftp,
    close() {
      try {
        conn.end();
      } catch {
        // ignore
      }
    },
  };
}

function statToEntry(relPath, st) {
  const isDirectory = (st.mode & 0o170000) === 0o040000;
  return {
    path: relPath,
    size: Number(st.size || 0),
    modifiedAt: Number(st.mtime || 0) * (st.mtime > 10_000_000_000 ? 1 : 1000),
    isDirectory,
    isFile: !isDirectory,
  };
}

export function createSftpFilesystem(session, rootPath) {
  const root = rootPath || '/';
  const { sftp } = session;

  return {
    async read(inputPath, options) {
      const abs = remotePath(root, inputPath);
      const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
      const st = await call(sftp, 'stat', [abs]);
      const size = Number(st?.size || 0);
      if (size > 32 * 1024 * 1024) {
        const err = new Error(
          `File exceeds ${32 * 1024 * 1024} bytes (ranged reads are not in this pass)`,
        );
        err.code = 'FS_TOO_LARGE';
        throw err;
      }
      if (encoding === 'base64') {
        const buf = await call(sftp, 'readFile', [abs]);
        const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
        return {
          path: inputPath,
          content: bytes.toString('base64'),
          encoding: 'base64',
        };
      }
      const content = await call(sftp, 'readFile', [abs, { encoding: 'utf8' }]);
      return { path: inputPath, content: String(content), encoding: 'utf8' };
    },
    async write(inputPath, content, options) {
      const abs = remotePath(root, inputPath);
      const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
      const dir = abs.split('/').slice(0, -1).join('/') || '/';
      try {
        await call(sftp, 'mkdir', [dir]);
      } catch {
        // exists
      }
      const text = String(content ?? '');
      const data =
        encoding === 'base64' ? Buffer.from(text, 'base64') : Buffer.from(text, 'utf8');
      if (data.length > 32 * 1024 * 1024) {
        const err = new Error(
          `File exceeds ${32 * 1024 * 1024} bytes (ranged reads are not in this pass)`,
        );
        err.code = 'FS_TOO_LARGE';
        throw err;
      }
      await call(sftp, 'writeFile', [abs, data]);
      return { path: inputPath, bytesWritten: data.length };
    },
    async list(inputPath = '.') {
      const abs = remotePath(root, inputPath);
      const names = await call(sftp, 'readdir', [abs]);
      return names
        .filter((n) => n.filename !== '.' && n.filename !== '..')
        .map((n) => {
          const rel =
            !inputPath || inputPath === '.'
              ? n.filename
              : `${String(inputPath).replace(/\/$/, '')}/${n.filename}`;
          return statToEntry(rel, n.attrs || {});
        });
    },
    async exists(inputPath) {
      try {
        await call(sftp, 'stat', [remotePath(root, inputPath)]);
        return true;
      } catch {
        return false;
      }
    },
    async stat(inputPath) {
      const st = await call(sftp, 'stat', [remotePath(root, inputPath)]);
      return statToEntry(inputPath, st);
    },
    async delete(inputPath) {
      const abs = remotePath(root, inputPath);
      try {
        await call(sftp, 'unlink', [abs]);
      } catch (err) {
        await call(sftp, 'rmdir', [abs]);
      }
    },
    async registerSpaceRoot() {},
    async unregisterSpaceRoot() {},
    async listSpaceRoots() {
      return [];
    },
  };
}
