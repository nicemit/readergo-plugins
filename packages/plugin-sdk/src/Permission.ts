export type Permission =
    | 'note:read'
    | 'note:write'
    | 'note:delete'
    | 'filesystem:read'
    | 'filesystem:write'
    | 'network:request'
    | 'ai:use'
    | 'storage:access';

export const PERMISSIONS = {
    NOTE_READ: 'note:read' as const,
    NOTE_WRITE: 'note:write' as const,
    NOTE_DELETE: 'note:delete' as const,
    FILESYSTEM_READ: 'filesystem:read' as const,
    FILESYSTEM_WRITE: 'filesystem:write' as const,
    NETWORK_REQUEST: 'network:request' as const,
    AI_USE: 'ai:use' as const,
    STORAGE_ACCESS: 'storage:access' as const,
} as const;
