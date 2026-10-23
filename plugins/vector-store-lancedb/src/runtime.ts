/**
 * Local file vector store. Provider id is `lancedb` for UI defaults.
 * Stores JSON namespaces under ~/.readergo/agent/vectors.
 * A later revision can swap the engine for LanceDB without changing the contract.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  RuntimePlugin,
  VectorQueryHit,
  VectorRecord,
  VectorStoreCapability,
  VectorStoreProvider,
} from '@readergo/plugin-contracts';
import { VECTOR_STORE_CAPABILITY_ID } from '@readergo/plugin-contracts';

export const LANCEDB_VECTOR_STORE_ID = 'lancedb';

function agentVectorsRoot(): string {
  const fromEnv = process.env.READERGO_AGENT_DATA_DIR?.trim();
  const root = fromEnv
    ? path.resolve(fromEnv)
    : path.join(os.homedir(), '.readergo', 'agent');
  const dir = path.join(root, 'vectors');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function namespacePath(namespace: string): string {
  const safe = namespace.replace(/[^a-zA-Z0-9:_-]+/g, '_').slice(0, 180);
  return path.join(agentVectorsRoot(), `${safe}.json`);
}

function loadNamespace(namespace: string): VectorRecord[] {
  const file = namespacePath(namespace);
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as VectorRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNamespace(namespace: string, records: VectorRecord[]): void {
  fs.writeFileSync(namespacePath(namespace), JSON.stringify(records), 'utf8');
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function createFileVectorStore(): VectorStoreProvider {
  return {
    id: LANCEDB_VECTOR_STORE_ID,
    name: 'Local vectors (file)',
    async upsert(input) {
      const namespace = input.namespace?.trim();
      if (!namespace) throw new Error('namespace is required');
      const existing = loadNamespace(namespace);
      const byId = new Map(existing.map((record) => [record.id, record]));
      for (const record of input.records ?? []) {
        if (!record?.id || !Array.isArray(record.vector)) continue;
        byId.set(record.id, {
          id: String(record.id),
          vector: record.vector.map(Number),
          text: String(record.text ?? '').slice(0, 16_000),
          metadata: record.metadata && typeof record.metadata === 'object'
            ? record.metadata
            : undefined,
        });
      }
      saveNamespace(namespace, [...byId.values()]);
    },
    async query(input) {
      const namespace = input.namespace?.trim();
      if (!namespace) throw new Error('namespace is required');
      const limit = Math.min(Math.max(input.limit ?? 8, 1), 40);
      const query = Array.isArray(input.vector) ? input.vector.map(Number) : [];
      const records = loadNamespace(namespace);
      const hits: VectorQueryHit[] = records
        .map((record) => ({
          id: record.id,
          score: cosine(query, record.vector),
          text: record.text,
          metadata: record.metadata,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return hits;
    },
    async delete(input) {
      const namespace = input.namespace?.trim();
      if (!namespace) throw new Error('namespace is required');
      if (!input.ids || input.ids.length === 0) {
        const file = namespacePath(namespace);
        if (fs.existsSync(file)) fs.unlinkSync(file);
        return;
      }
      const remove = new Set(input.ids.map(String));
      const next = loadNamespace(namespace).filter((record) => !remove.has(record.id));
      saveNamespace(namespace, next);
    },
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.vector-store.lancedb',
    name: 'Vector Store (Local)',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description:
      'Local file vector store under ~/.readergo/agent/vectors (provider id lancedb).',
    category: 'ai',
    provides: ['vector-store.lancedb'],
    requires: [VECTOR_STORE_CAPABILITY_ID],
    permissions: ['ai:use'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const registry = await context.getCapability<VectorStoreCapability>(
      VECTOR_STORE_CAPABILITY_ID,
    );
    if (!registry) throw new Error('vector-store capability is not available');
    registry.register(createFileVectorStore());
    context.log.info('Local vector-store registered');
  },
};

export default plugin;
