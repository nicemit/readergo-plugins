/**
 * Space Types - Multi-source note storage
 *
 * A Space is metadata + backendId + config.
 * Backends are registered on the UI (and Runtime for privileged stores).
 */

export type SpaceBackendExecution = 'ui' | 'runtime';

export const SPACE_BACKEND_CLOUD = 'cloud';
export const SPACE_BACKEND_FILESYSTEM_BROWSER = 'filesystem.browser';
export const SPACE_BACKEND_FILESYSTEM_RUNTIME = 'filesystem.runtime';

export interface SpaceBackendConfigField {
  key: string;
  label: string;
  kind: 'text' | 'path' | 'directory-picker';
  required?: boolean;
  placeholder?: string;
}

export interface SpaceBackendDescriptor {
  id: string;
  name: string;
  description?: string;
  execution: SpaceBackendExecution;
  configFields?: SpaceBackendConfigField[];
  loadingComponent?: React.FC<any>;
}

export interface SpaceSkeletonRegistration {
  backendId: string;
  component: React.FC<any>;
}

/** Legacy discriminator kept for display / AgentChat compatibility */
export type SpaceType = 'cloud' | 'filesystem';

export interface Space {
  id: string;
  name: string;
  /** Derived from backendId for backward compatibility */
  type: SpaceType;
  /** Stable backend registration id */
  backendId: string;
  config: SpaceConfig;
  createdAt: Date;
  lastSyncedAt?: Date;
  isActive: boolean;
}

export interface CloudSpaceConfig {
  type: 'cloud';
  backendId?: string;
}

export interface FilesystemSpaceConfig {
  type: 'filesystem';
  backendId?: string;
  /** Display label / path shown in UI */
  rootPath: string;
  /**
   * How the Space reaches disk (legacy; prefer backendId):
   * - browser: File System Access API (directoryHandle)
   * - runtime: Local Runtime Filesystem Plugin (absolute rootPath)
   */
  access?: 'browser' | 'runtime';
  /** Browser File System Access handle (not serializable) */
  directoryHandle?: FileSystemDirectoryHandle;
}

export type SpaceConfig = CloudSpaceConfig | FilesystemSpaceConfig;

/** New create shape: backendId + opaque config (no legacy type discriminator) */
export interface SpaceBackendCreateInput {
  backendId: string;
  config?: Record<string, unknown>;
}

/** Input accepted by SpaceManager.addSpace / spaces.create */
export type AddSpaceInput = SpaceConfig | SpaceBackendCreateInput;

function isBackendCreateInput(
  input: AddSpaceInput,
): input is SpaceBackendCreateInput {
  return (
    typeof (input as SpaceBackendCreateInput).backendId === 'string' &&
    !('type' in input)
  );
}

export interface SpaceStats {
  noteCount: number;
  totalWords: number;
  lastModified: Date;
}

/**
 * SpaceProvider - Abstract interface for different storage backends
 */
export interface SpaceProvider {
  initialize(config: SpaceConfig): Promise<void>;
  isAvailable(): Promise<boolean>;
  getStats(): Promise<SpaceStats>;
  sync(): Promise<void>;
}

export interface SpaceNote {
  id: string;
  spaceId: string;
  title: string;
  content: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  filePath?: string;
  folderId?: string;
}

export interface SpaceFolder {
  id: string;
  name: string;
  parentId: string | null;
  path?: string;
  noteCount?: number;
  childCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SpaceManager {
  listSpaces(): Promise<Space[]>;
  getActiveSpace(): Promise<Space | null>;
  setActiveSpace(spaceId: string): Promise<void>;
  addSpace(name: string, input: AddSpaceInput): Promise<Space>;
  removeSpace(spaceId: string): Promise<void>;
  requestDirectoryAccess(spaceId: string): Promise<void>;
  updateSpace(spaceId: string, updates: Partial<Space>): Promise<Space>;
  getProvider(spaceId: string): Promise<SpaceProvider | null>;
  getActiveProvider(): Promise<SpaceProvider | null>;
  syncSpace(spaceId: string): Promise<void>;
  getSpaceStats(spaceId: string): Promise<SpaceStats>;
  /** Registered Space backends available for Add Space */
  listBackends(): Promise<SpaceBackendDescriptor[]>;
}

/** Map backend id to legacy SpaceType */
export function spaceTypeFromBackendId(backendId: string): SpaceType {
  if (backendId === SPACE_BACKEND_CLOUD) return 'cloud';
  return 'filesystem';
}

/**
 * Resolve backendId from a persisted or in-memory space record.
 * Supports legacy { type, config.access } shapes.
 */
export function resolveBackendId(raw: {
  backendId?: string;
  type?: string;
  config?: Record<string, unknown> | SpaceConfig | null;
}): string {
  if (raw.backendId && String(raw.backendId).trim()) {
    return String(raw.backendId).trim();
  }
  const cfg = (raw.config ?? {}) as Record<string, unknown>;
  if (typeof cfg.backendId === 'string' && cfg.backendId.trim()) {
    return cfg.backendId.trim();
  }
  if (raw.type === 'cloud' || cfg.type === 'cloud') {
    return SPACE_BACKEND_CLOUD;
  }
  if (raw.type === 'filesystem' || cfg.type === 'filesystem') {
    const access = cfg.access;
    if (access === 'runtime') return SPACE_BACKEND_FILESYSTEM_RUNTIME;
    if (access === 'browser') return SPACE_BACKEND_FILESYSTEM_BROWSER;
    const root = String(cfg.rootPath ?? '').trim();
    if (root.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(root)) {
      return SPACE_BACKEND_FILESYSTEM_RUNTIME;
    }
    return SPACE_BACKEND_FILESYSTEM_BROWSER;
  }
  throw new Error(
    `Cannot resolve Space backendId from record type=${String(raw.type)}`,
  );
}

/** Normalize a loaded/created space onto backendId + serializable config fields */
export function normalizeSpaceRecord(raw: {
  id: string;
  name: string;
  backendId?: string;
  type?: string;
  config?: Record<string, unknown> | SpaceConfig | null;
  createdAt?: Date | string;
  lastSyncedAt?: Date | string | null;
  isActive?: boolean;
}): Space {
  const backendId = resolveBackendId(raw);
  const type = spaceTypeFromBackendId(backendId);
  const cfgIn = (raw.config ?? {}) as Record<string, unknown>;
  let config: SpaceConfig;

  if (backendId === SPACE_BACKEND_CLOUD) {
    config = { type: 'cloud', backendId };
  } else if (backendId === SPACE_BACKEND_FILESYSTEM_RUNTIME) {
    config = {
      type: 'filesystem',
      backendId,
      rootPath: String(cfgIn.rootPath ?? '').trim(),
      access: 'runtime',
    };
  } else if (backendId === SPACE_BACKEND_FILESYSTEM_BROWSER) {
    config = {
      type: 'filesystem',
      backendId,
      rootPath: String(cfgIn.rootPath ?? '').trim(),
      access: 'browser',
      ...(cfgIn.directoryHandle
        ? { directoryHandle: cfgIn.directoryHandle as FileSystemDirectoryHandle }
        : {}),
    };
  } else {
    const { directoryHandle: _handle, ...rest } = cfgIn;
    config = {
      ...rest,
      type: 'filesystem',
      backendId,
      rootPath: String(cfgIn.rootPath ?? '').trim(),
      access: 'runtime',
    } as FilesystemSpaceConfig;
  }

  return {
    id: raw.id,
    name: raw.name,
    type,
    backendId,
    config,
    createdAt:
      raw.createdAt instanceof Date
        ? raw.createdAt
        : raw.createdAt
          ? new Date(raw.createdAt)
          : new Date(),
    lastSyncedAt:
      raw.lastSyncedAt instanceof Date
        ? raw.lastSyncedAt
        : raw.lastSyncedAt
          ? new Date(raw.lastSyncedAt)
          : undefined,
    isActive: !!raw.isActive,
  };
}

/** Strip non-serializable fields for persistence */
export function serializeSpaceConfig(
  backendId: string,
  config: SpaceConfig,
): Record<string, unknown> {
  if (backendId === SPACE_BACKEND_CLOUD) {
    return { type: 'cloud', backendId };
  }
  const fs = config as FilesystemSpaceConfig & Record<string, unknown>;
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fs)) {
    if (key === 'directoryHandle') continue;
    rest[key] = value;
  }
  return {
    ...rest,
    type: 'filesystem',
    backendId,
    rootPath: String(fs.rootPath ?? ''),
    access:
      backendId === SPACE_BACKEND_FILESYSTEM_BROWSER ? 'browser' : 'runtime',
  };
}

/** Convert AddSpaceInput into backendId + config */
export function normalizeAddSpaceInput(input: AddSpaceInput): {
  backendId: string;
  config: SpaceConfig;
} {
  if (isBackendCreateInput(input)) {
    const backendId = input.backendId.trim();
    const cfg = (input.config ?? {}) as Record<string, unknown>;
    if (backendId === SPACE_BACKEND_CLOUD) {
      return { backendId, config: { type: 'cloud', backendId } };
    }
    if (backendId === SPACE_BACKEND_FILESYSTEM_RUNTIME) {
      const rootPath = String(cfg.rootPath ?? '')
        .trim()
        .replace(/[/\\]+$/, '');
      return {
        backendId,
        config: {
          type: 'filesystem',
          backendId,
          rootPath,
          access: 'runtime',
        },
      };
    }
    if (backendId === SPACE_BACKEND_FILESYSTEM_BROWSER) {
      return {
        backendId,
        config: {
          type: 'filesystem',
          backendId,
          rootPath: String(cfg.rootPath ?? ''),
          access: 'browser',
          ...(cfg.directoryHandle
            ? {
                directoryHandle:
                  cfg.directoryHandle as FileSystemDirectoryHandle,
              }
            : {}),
        },
      };
    }
    // Future backends: pass config through with type marker
    return {
      backendId,
      config: {
        type: 'filesystem',
        backendId,
        rootPath: String(cfg.rootPath ?? ''),
        access: 'runtime',
        ...cfg,
      } as FilesystemSpaceConfig,
    };
  }

  const legacy = input as SpaceConfig;
  const backendId = resolveBackendId({ type: legacy.type, config: legacy });
  const { config } = normalizeAddSpaceInput({
    backendId,
    config: legacy as unknown as Record<string, unknown>,
  });
  return { backendId, config };
}

export function isRuntimeFilesystemSpace(space: {
  backendId?: string;
  type?: string;
  config?: SpaceConfig | Record<string, unknown>;
}): boolean {
  try {
    const id = resolveBackendId(space);
    return (
      id !== SPACE_BACKEND_CLOUD && id !== SPACE_BACKEND_FILESYSTEM_BROWSER
    );
  } catch {
    return false;
  }
}
