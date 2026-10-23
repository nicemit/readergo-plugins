import { describe, expect, it } from 'vitest';
import {
  SPACE_BACKEND_CLOUD,
  SPACE_BACKEND_FILESYSTEM_BROWSER,
  SPACE_BACKEND_FILESYSTEM_RUNTIME,
  normalizeAddSpaceInput,
  normalizeSpaceRecord,
  resolveBackendId,
  serializeSpaceConfig,
  spaceTypeFromBackendId,
} from './Space';

describe('Space backend migration helpers', () => {
  it('resolves legacy cloud', () => {
    expect(resolveBackendId({ type: 'cloud', config: { type: 'cloud' } })).toBe(
      SPACE_BACKEND_CLOUD,
    );
  });

  it('resolves legacy browser filesystem', () => {
    expect(
      resolveBackendId({
        type: 'filesystem',
        config: { type: 'filesystem', rootPath: 'Notes', access: 'browser' },
      }),
    ).toBe(SPACE_BACKEND_FILESYSTEM_BROWSER);
  });

  it('resolves legacy runtime via access', () => {
    expect(
      resolveBackendId({
        type: 'filesystem',
        config: {
          type: 'filesystem',
          rootPath: '/home/v/notes',
          access: 'runtime',
        },
      }),
    ).toBe(SPACE_BACKEND_FILESYSTEM_RUNTIME);
  });

  it('resolves absolute rootPath as runtime when access missing', () => {
    expect(
      resolveBackendId({
        type: 'filesystem',
        config: { type: 'filesystem', rootPath: '/tmp/proj' },
      }),
    ).toBe(SPACE_BACKEND_FILESYSTEM_RUNTIME);
  });

  it('prefers explicit backendId', () => {
    expect(
      resolveBackendId({
        backendId: SPACE_BACKEND_FILESYSTEM_RUNTIME,
        type: 'cloud',
        config: { type: 'cloud' },
      }),
    ).toBe(SPACE_BACKEND_FILESYSTEM_RUNTIME);
  });

  it('normalizeSpaceRecord rewrites shape', () => {
    const space = normalizeSpaceRecord({
      id: 's1',
      name: 'Proj',
      type: 'filesystem',
      config: { type: 'filesystem', rootPath: '/data', access: 'runtime' },
    });
    expect(space.backendId).toBe(SPACE_BACKEND_FILESYSTEM_RUNTIME);
    expect(space.type).toBe('filesystem');
    expect(space.config).toMatchObject({
      access: 'runtime',
      rootPath: '/data',
      backendId: SPACE_BACKEND_FILESYSTEM_RUNTIME,
    });
  });

  it('serializeSpaceConfig drops directoryHandle', () => {
    const serialized = serializeSpaceConfig(SPACE_BACKEND_FILESYSTEM_BROWSER, {
      type: 'filesystem',
      rootPath: 'Docs',
      access: 'browser',
      directoryHandle: {} as FileSystemDirectoryHandle,
    });
    expect(serialized).toEqual({
      type: 'filesystem',
      backendId: SPACE_BACKEND_FILESYSTEM_BROWSER,
      rootPath: 'Docs',
      access: 'browser',
    });
    expect(serialized).not.toHaveProperty('directoryHandle');
  });

  it('normalizeAddSpaceInput accepts backendId form', () => {
    const { backendId, config } = normalizeAddSpaceInput({
      backendId: SPACE_BACKEND_FILESYSTEM_RUNTIME,
      config: { rootPath: '/home/x/notes/' },
    });
    expect(backendId).toBe(SPACE_BACKEND_FILESYSTEM_RUNTIME);
    expect(config).toMatchObject({
      rootPath: '/home/x/notes',
      access: 'runtime',
    });
  });

  it('spaceTypeFromBackendId', () => {
    expect(spaceTypeFromBackendId(SPACE_BACKEND_CLOUD)).toBe('cloud');
    expect(spaceTypeFromBackendId(SPACE_BACKEND_FILESYSTEM_BROWSER)).toBe(
      'filesystem',
    );
  });
});
