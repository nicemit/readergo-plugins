/**
 * SQLite chat-store provider. Conversations live under ~/.readergo/agent.
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

function agentDataRoot(): string {
  const fromEnv = process.env.READERGO_AGENT_DATA_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), '.readergo', 'agent');
}

function openDb(): DatabaseSync {
  const dir = agentDataRoot();
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'chat.db');
  const db = new DatabaseSync(dbPath);
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
      db.prepare(
        `INSERT INTO conversations (id, title, space_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, title, spaceId, now, now);
      return {
        id,
        title,
        spaceId: spaceId || undefined,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        messages: [],
      };
    },
    async append(input) {
      const now = Date.now();
      const id = `msg_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const content = String(input.content ?? '').slice(0, 32_000);
      const role = input.role;
      db.prepare(
        `INSERT INTO messages (id, conversation_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(id, input.conversationId, role, content, now);
      db.prepare(
        `UPDATE conversations SET updated_at = ? WHERE id = ?`,
      ).run(now, input.conversationId);
      const record: ChatMessageRecord = {
        id,
        role,
        content,
        createdAt: now,
      };
      return record;
    },
    async listConversations(input) {
      const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
      const spaceId = input.spaceId?.trim();
      const rows = spaceId
        ? (db
            .prepare(
              `SELECT c.id, c.title, c.space_id, c.created_at, c.updated_at,
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
               FROM conversations c
               WHERE c.space_id = ?
               ORDER BY c.updated_at DESC
               LIMIT ?`,
            )
            .all(spaceId, limit) as Array<Record<string, unknown>>)
        : (db
            .prepare(
              `SELECT c.id, c.title, c.space_id, c.created_at, c.updated_at,
                      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
               FROM conversations c
               ORDER BY c.updated_at DESC
               LIMIT ?`,
            )
            .all(limit) as Array<Record<string, unknown>>);
      return rows.map(toSummary);
    },
    async get(input) {
      const row = db
        .prepare(
          `SELECT id, title, space_id, created_at, updated_at
           FROM conversations WHERE id = ?`,
        )
        .get(input.conversationId) as Record<string, unknown> | undefined;
      if (!row) return null;
      const messages = db
        .prepare(
          `SELECT id, role, content, created_at
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

function toSummary(row: Record<string, unknown>): ChatConversationSummary {
  const spaceId = row.space_id == null ? undefined : String(row.space_id);
  return {
    id: String(row.id),
    title: String(row.title ?? 'Chat'),
    spaceId: spaceId || undefined,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    messageCount: Number(row.message_count) || 0,
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.chat-store.sqlite',
    name: 'Chat Store (SQLite)',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description: 'Stores agent conversations in SQLite under ~/.readergo/agent.',
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
