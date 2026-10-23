export function connectSftp(config: Record<string, unknown>): Promise<{ close: () => void }>;
export function createSftpFilesystem(
  session: { close: () => void },
  rootPath: string,
): unknown;
