export interface FileStat {
  path: string;
  size: number;
  modifiedAt: number;
  isDirectory: boolean;
}

export interface FilesystemCapability {
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(path: string): Promise<FileStat[]>;
  mkdir(path: string): Promise<void>;
}
