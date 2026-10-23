'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FilesystemStat } from '@readergo/plugin-contracts';
import { FILESYSTEM_CAPABILITY_ID } from '@readergo/plugin-contracts';
import {
  ensureRuntimeConnection,
  enableRuntimeAutoReconnect,
  getRuntimeConnectionState,
  getRuntimeStatusMeta,
  onRuntimeConnectionState,
  onRuntimeStatusMeta,
  fsList,
  fsRead,
  fsWrite,
  hasFilesystemCapability,
  type RuntimeConnectionState,
  type RuntimeStatusMeta,
} from '@/lib/runtime/RuntimeBridge';

/**
 * Minimal verification UI for the Filesystem Runtime Plugin.
 * Not a file manager - exercises RuntimeBridge → protocol → FS plugin.
 */
export function FilesystemDemoPanel() {
  const [connection, setConnection] = useState<RuntimeConnectionState>(
    getRuntimeConnectionState(),
  );
  const [meta, setMeta] = useState<RuntimeStatusMeta>(getRuntimeStatusMeta());
  const [path, setPath] = useState('.');
  const [entries, setEntries] = useState<FilesystemStat[]>([]);
  const [filePath, setFilePath] = useState('hello.txt');
  const [fileContent, setFileContent] = useState('');
  const [writeContent, setWriteContent] = useState('Hello from ReaderGo FS');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    enableRuntimeAutoReconnect(true);
    const unsubState = onRuntimeConnectionState(setConnection);
    const unsubMeta = onRuntimeStatusMeta(setMeta);
    void ensureRuntimeConnection();
    return () => {
      unsubState();
      unsubMeta();
    };
  }, []);

  const available =
    connection === 'connected' &&
    (hasFilesystemCapability() ||
      meta.capabilities.includes(FILESYSTEM_CAPABILITY_ID));

  const onList = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const list = await fsList(path || '.');
      setEntries(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [path]);

  const onRead = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await fsRead(filePath);
      setFileContent(result.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [filePath]);

  const onWrite = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await fsWrite(filePath, writeContent);
      setFileContent(writeContent);
      await onList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [filePath, writeContent, onList]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Filesystem (Runtime Plugin)</h1>
        <div className="text-right text-xs opacity-70">
          <div>{connection}</div>
          <div>
            fs:{' '}
            {available ? 'available' : 'unavailable'}
          </div>
        </div>
      </div>

      <p className="text-sm opacity-70">
        Verification surface for the Filesystem Runtime Plugin. Calls go through
        RuntimeBridge and the ReaderGo protocol - the UI never imports Node fs.
      </p>

      {error ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}

      <section className="space-y-2 rounded border border-border p-3">
        <h2 className="text-sm font-medium">List</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="relative path (default .)"
            disabled={busy || !available}
          />
          <button
            type="button"
            className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={() => void onList()}
            disabled={busy || !available}
          >
            List
          </button>
        </div>
        <ul className="max-h-40 overflow-auto text-sm font-mono">
          {entries.length === 0 ? (
            <li className="opacity-50">No entries</li>
          ) : (
            entries.map((e) => (
              <li key={e.path}>
                {e.isDirectory ? '[dir] ' : '[file] '}
                {e.path} ({e.size}b)
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-2 rounded border border-border p-3">
        <h2 className="text-sm font-medium">Read / Write</h2>
        <input
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="relative file path"
          disabled={busy || !available}
        />
        <textarea
          className="min-h-[80px] w-full rounded border border-border bg-background px-3 py-2 text-sm font-mono"
          value={writeContent}
          onChange={(e) => setWriteContent(e.target.value)}
          disabled={busy || !available}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-secondary px-3 py-2 text-sm"
            onClick={() => void onRead()}
            disabled={busy || !available}
          >
            Read
          </button>
          <button
            type="button"
            className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={() => void onWrite()}
            disabled={busy || !available}
          >
            Write
          </button>
        </div>
        {fileContent ? (
          <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
            {fileContent}
          </pre>
        ) : null}
      </section>
    </div>
  );
}

export default FilesystemDemoPanel;
