/**
 * SQLite chat-store provider. Conversations live under ~/.readergo/<env>/agent.
 * The host does not own this schema.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  ChatConversation,
  ChatConversationSummary,
  ChatMessageRecord,
  ChatStoreCapability,
  ChatStoreProvider,
  RuntimePlugin,
} from '@readergo/plugin-contracts';
import { CHAT_STORE_CAPABILITY_ID } from '@readergo/plugin-contracts';

export const SQLITE_CHAT_STORE_ID = 'sqlite';

function resolveReadergoEnv(): string {
  const raw = process.env.READERGO_ENV?.trim().toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'local') return 'local';
  return 'development';
}

function agentDataRoot(): string {
  const fromEnv = process.env.READERGO_AGENT_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), '.readergo', resolveReadergoEnv(), 'agent');
}

function tableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name?: string;
  }>;
  return new Set(
    rows
      .map((row) => (typeof row.name === 'string' ? row.name : ''))
      .filter(Boolean),
  );
}

function ensureColumn(
  db: DatabaseSync,
  table: string,
  column: string,
  alterSql: string,
): void {
  if (tableColumns(db, table).has(column)) return;
  db.exec(alterSql);
  if (!tableColumns(db, table).has(column)) {
    throw new Error(`chat-store-sqlite failed to add ${table}.${column}`);
  }
}

function openDb(): DatabaseSync {
  const dir = agentDataRoot();
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'chat.db');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      space_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages(conversation_id, created_at);
  `);
  // Existing DBs were created before these columns; verify after ALTER.
  ensureColumn(
    db,
    'conversations',
    'agent_sdk_id',
    'ALTER TABLE conversations ADD COLUMN agent_sdk_id TEXT',
  );
  ensureColumn(
    db,
    'conversations',
    'agent_label',
    'ALTER TABLE conversations ADD COLUMN agent_label TEXT',
  );
  ensureColumn(
    db,
    'messages',
    'metadata',
    'ALTER TABLE messages ADD COLUMN metadata TEXT',
  );
  return db;
}

function createSqliteProvider(): ChatStoreProvider {
  const db = openDb();

  return {
    id: SQLITE_CHAT_STORE_ID,
    name: 'SQLite (local)',
    async create(input) {
      const now = Date.now();
      const id = input.id?.trim() || `conv_${now.toString(36)}`;
      const title = input.title?.trim() || 'New chat';
      const spaceId = input.spaceId?.trim() || null;
      const agentSdkId = input.agentSdkId?.trim() || null;
      const agentLabel = input.agentLabel?.trim() || null;
      db.prepare(
        `INSERT INTO conversations (id, title, space_id, agent_sdk_id, agent_label, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, title, spaceId, agentSdkId, agentLabel, now, now);
      return {
        id,
        title,
        spaceId: spaceId || undefined,
        agentSdkId: agentSdkId || undefined,
        agentLabel: agentLabel || undefined,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        messages: [],
      };
    },
    async append(input) {
      const now = Date.now();
      const id =
        (typeof input.id === 'string' && input.id.trim()) ||
        `msg_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const content = String(input.content ?? '').slice(0, 32_000);
      const role = input.role;
      const metadata =
        input.metadata && typeof input.metadata === 'object'
          ? JSON.stringify(input.metadata)
          : null;
      db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(id, input.conversationId, role, content, now, metadata);
      db.prepare(
        `UPDATE conversations SET updated_at = ? WHERE id = ?`,
      ).run(now, input.conversationId);
      const record: ChatMessageRecord = {
        id,
        role,
        content,
        createdAt: now,
        metadata: input.metadata,
      };
      return record;
    },
    async update(input) {
      const now = Date.now();
      const content = String(input.content ?? '').slice(0, 32_000);
      const existing = db
        .prepare(
          `SELECT id, role, created_at, metadata FROM messages
           WHERE id = ? AND conversation_id = ?`,
        )
        .get(input.messageId, input.conversationId) as
        | { id: string; role: string; created_at: number; metadata: string | null }
        | undefined;
      if (!existing) {
        throw new Error(`Chat message ${input.messageId} not found`);
      }
      const nextMetadata =
        input.metadata && typeof input.metadata === 'object'
          ? {
              ...(parseMetadata(existing.metadata) ?? {}),
              ...input.metadata,
            }
          : parseMetadata(existing.metadata);
      const metadataJson =
        nextMetadata && typeof nextMetadata === 'object'
          ? JSON.stringify(nextMetadata)
          : null;
      db.prepare(
        `UPDATE messages SET content = ?, metadata = ? WHERE id = ? AND conversation_id = ?`,
      ).run(content, metadataJson, input.messageId, input.conversationId);
      db.prepare(
        `UPDATE conversations SET updated_at = ? WHERE id = ?`,
      ).run(now, input.conversationId);
      return {
        id: existing.id,
        role: existing.role as ChatMessageRecord['role'],
        content,
        createdAt: Number(existing.created_at) || now,
        metadata: nextMetadata ?? undefined,
      };
    },
    async listConversations(input) {
      const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
      const spaceId = input.spaceId?.trim() || null;
      const agentSdkId = input.agentSdkId?.trim() || null;
      const query = input.query?.trim() ? `%${input.query.trim()}%` : null;
      const rows = db
        .prepare(
          `SELECT c.id, c.title, c.space_id, c.agent_sdk_id, c.agent_label, c.created_at, c.updated_at,
                  (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
           FROM conversations c
           WHERE (? IS NULL OR c.space_id = ?)
             AND (? IS NULL OR c.agent_sdk_id = ?)
             AND (? IS NULL OR c.title LIKE ?)
           ORDER BY c.updated_at DESC
           LIMIT ?`,
        )
        .all(spaceId, spaceId, agentSdkId, agentSdkId, query, query, limit) as Array<
        Record<string, unknown>
      >;
      return rows.map(toSummary);
    },
    async search(input) {
      const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
      const q = `%${input.query.trim()}%`;
      const spaceId = input.spaceId?.trim() || null;
      const agentSdkId = input.agentSdkId?.trim() || null;
      const rows = db
        .prepare(
          `SELECT c.id, c.title, c.space_id, c.agent_sdk_id, c.agent_label, c.created_at, c.updated_at,
                  (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id) AS message_count
           FROM conversations c
           WHERE (? IS NULL OR c.space_id = ?)
             AND (? IS NULL OR c.agent_sdk_id = ?)
             AND (
               c.title LIKE ?
               OR EXISTS (
                 SELECT 1 FROM messages m
                 WHERE m.conversation_id = c.id AND m.content LIKE ?
               )
             )
           ORDER BY c.updated_at DESC
           LIMIT ?`,
        )
        .all(
          spaceId,
          spaceId,
          agentSdkId,
          agentSdkId,
          q,
          q,
          limit,
        ) as Array<Record<string, unknown>>;
      return rows.map(toSummary);
    },
    async get(input) {
      const row = db
        .prepare(
          `SELECT id, title, space_id, agent_sdk_id, agent_label, created_at, updated_at
           FROM conversations WHERE id = ?`,
        )
        .get(input.conversationId) as Record<string, unknown> | undefined;
      if (!row) return null;
      const messages = db
        .prepare(
          `SELECT id, role, content, created_at, metadata
           FROM messages WHERE conversation_id = ?
           ORDER BY created_at ASC`,
        )
        .all(input.conversationId) as Array<Record<string, unknown>>;
      const summary = toSummary({
        ...row,
        message_count: messages.length,
      });
      const conversation: ChatConversation = {
        ...summary,
        messages: messages.map((item) => ({
          id: String(item.id),
          role: item.role as ChatMessageRecord['role'],
          content: String(item.content ?? ''),
          createdAt: Number(item.created_at) || 0,
          metadata: parseMetadata(item.metadata),
        })),
      };
      return conversation;
    },
    async delete(input) {
      db.prepare(`DELETE FROM messages WHERE conversation_id = ?`).run(
        input.conversationId,
      );
      db.prepare(`DELETE FROM conversations WHERE id = ?`).run(input.conversationId);
    },
  };
}

function parseMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
  return undefined;
}

function toSummary(row: Record<string, unknown>): ChatConversationSummary {
  const spaceId = row.space_id == null ? undefined : String(row.space_id);
  const agentSdkId = row.agent_sdk_id == null ? undefined : String(row.agent_sdk_id);
  const agentLabel = row.agent_label == null ? undefined : String(row.agent_label);
  return {
    id: String(row.id),
    title: String(row.title ?? 'Chat'),
    spaceId: spaceId || undefined,
    agentSdkId: agentSdkId || undefined,
    agentLabel: agentLabel || undefined,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    messageCount: Number(row.message_count) || 0,
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.chat-store.sqlite',
    name: 'Chat Store (SQLite)',
    version: '0.1.1',
    sdkVersion: '0.1.0',
    description: 'Stores agent conversations in SQLite under ~/.readergo/<env>/agent.',
    category: 'ai',
    provides: ['chat-store.sqlite'],
    requires: [CHAT_STORE_CAPABILITY_ID],
    permissions: ['ai:use'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const registry = await context.getCapability<ChatStoreCapability>(
      CHAT_STORE_CAPABILITY_ID,
    );
    if (!registry) throw new Error('chat-store capability is not available');
    registry.register(createSqliteProvider());
    context.log.info('SQLite chat-store registered');
  },
};

export default plugin;
