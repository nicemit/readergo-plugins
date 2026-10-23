import React from 'react';

export interface Document {
  id: string;
  type: string;
  title?: string;
  content?: string;
  data?: any;
  metadata?: Record<string, any>;
  status?: string;
  spaceId?: string;
  createdAt?: string | Date | number;
  updatedAt?: string | Date | number;
  folders?: Array<{ folderId: string }>;
}

export interface EditorCapability {
  onMount?(document: Document): void;
  onUnmount?(): void;
  save?(): Promise<Document>;
}

export interface EditorRegistration {
  type: string;
  component: React.FC<any>;
  capabilityId?: string;
  loadingComponent?: React.FC<any>;
}

export interface DocumentStorageProvider {
  create(doc: Document): Promise<Document>;
  update(doc: Document): Promise<Document>;
  get(id: string): Promise<Document | null>;
  list(spaceId?: string): Promise<Document[]>;
  delete(id: string): Promise<void>;
}
