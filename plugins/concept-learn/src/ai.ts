import {
  loadLlmProviderSelection,
  OPENROUTER_DEFAULT_MODEL,
} from '@/lib/ai/config/llmProviderSelection';
import {
  DEFAULT_CHAT_STORE_ID,
  loadMemorySelection,
  OPENROUTER_EMBEDDINGS_ID,
} from '@/lib/ai/config/memorySelection';
import {
  appendChatMessage,
  createChatConversation,
  getChatConversation,
  sendAgentChat,
} from '@/lib/runtime/runtimeRpc';
import {
  localFallbackPlan,
  normalizeConceptData,
} from './schema';
import { CONCEPT_TUTOR_TOOL_SPECS } from './tools';
import type { ConceptData, ConceptSeed, TutorMessage } from './types';

const AGENT_SDK_KEY = 'readergo_agent_sdk';

function loadAgentSdkId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(AGENT_SDK_KEY);
    return typeof raw === 'string' ? raw.trim() : '';
  } catch {
    return '';
  }
}

/** Same default Chat uses after resolve - tutor must not skip persist when localStorage is empty. */
function resolveTutorChatStoreId(): string {
  const saved = loadMemorySelection().chatStoreId.trim();
  return saved || DEFAULT_CHAT_STORE_ID;
}

async function ensureTutorConversation(input: {
  providerId: string;
  conversationId: string;
  title: string;
}): Promise<void> {
  try {
    const existing = await getChatConversation({
      providerId: input.providerId,
      conversationId: input.conversationId,
    });
    if (existing?.id) return;
  } catch {
    // create below
  }
  try {
    await createChatConversation({
      providerId: input.providerId,
      id: input.conversationId,
      title: input.title,
    });
  } catch {
    // Duplicate create races are fine; append will still work if the row exists.
  }
}

async function persistTutorMessage(input: {
  providerId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
}): Promise<void> {
  const content = input.content.trim();
  if (!content) return;
  await appendChatMessage({
    providerId: input.providerId,
    conversationId: input.conversationId,
    role: input.role,
    content,
  });
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function formatError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    const record = err as { message?: unknown; code?: unknown; error?: unknown };
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
    if (typeof record.code === 'string' && record.code.trim()) {
      return record.code;
    }
    try {
      return JSON.stringify(err);
    } catch {
      // fall through
    }
  }
  return 'AI request failed';
}

async function runAgentTurn(input: {
  conversationId: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
  disableTools?: boolean;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}): Promise<string> {
  const provider = loadLlmProviderSelection();
  const memory = loadMemorySelection();
  const chatStoreId = resolveTutorChatStoreId();
  const agentId = loadAgentSdkId();

  if (!provider.id || !provider.apiKey.trim()) {
    throw new Error(
      'AI is not configured. Open Chat Settings, set OpenRouter key and model, then retry.',
    );
  }
  if (!agentId) {
    throw new Error(
      'No agent SDK selected. Open Chat Settings, pick Pi (or another agent), then retry.',
    );
  }

  let assistantText = '';
  await sendAgentChat(
    {
      conversationId: input.conversationId,
      message: input.message,
      history: input.history,
      tools: input.tools ?? [],
      disableTools: input.disableTools === true,
      agent: { id: agentId },
      provider: {
        id: provider.id,
        apiKey: provider.apiKey.trim(),
        model: provider.model.trim() || OPENROUTER_DEFAULT_MODEL,
      },
      memory: {
        chatStoreId,
        embeddingsId: memory.embeddingsId || undefined,
        vectorStoreId: memory.vectorStoreId || undefined,
        embeddingsApiKey:
          memory.embeddingsId === OPENROUTER_EMBEDDINGS_ID
            ? memory.embeddingsApiKey.trim() || provider.apiKey.trim() || undefined
            : undefined,
        embeddingsModel: memory.embeddingsModel || undefined,
      },
    },
    {
      signal: input.signal,
      onChunk: (chunk: { text?: string }) => {
        assistantText += chunk.text || '';
        input.onChunk?.(assistantText);
      },
    },
  );
  return assistantText;
}

const PLAN_PROMPT = `You are building a Concept Learn curriculum for ReaderGo.
Reply with ONLY a JSON object (no markdown outside JSON) matching:
{
  "nodes": [
    {
      "id": "n1",
      "title": "short title",
      "explainMd": "2-5 short markdown sentences",
      "playground": { ... one of the kinds below ... }
    }
  ]
}
Playground kinds (pick exactly one per node):
- {"kind":"scenario","prompt":"...","choices":[{"id":"a","label":"...","outcome":"...","reveals":"optional"}]}
- {"kind":"matrix","rowLabels":["R1","R2"],"colLabels":["C1","C2"],"payoffs":[["3,3","0,5"],["5,0","1,1"]],"hint":"..."}
- {"kind":"timeline","events":[{"id":"e1","year":"1900","title":"...","blurb":"..."}]}
- {"kind":"sampler","label":"P(success)","probability":0.3,"trialsSuggested":20}
- {"kind":"check","questions":[{"id":"q1","prompt":"...","options":["A","B","C"],"correctIndex":0,"explanation":"..."}]}
Rules: 4-6 nodes, progressive, interactive. Prefer scenario/matrix/timeline/sampler when the topic fits; otherwise check.
Keep explainMd brief. No lecture walls.`;

export async function generateConceptPlan(input: {
  seed: ConceptSeed;
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
}): Promise<ConceptData> {
  const conversationId = newId('concept_plan');
  const seedBlock =
    input.seed.mode === 'spark' && input.seed.raw?.trim()
      ? `Topic: ${input.seed.topic}\nSpark text:\n${input.seed.raw.trim()}`
      : `Topic: ${input.seed.topic}`;

  try {
    input.onChunk?.(
      'Calling the shared AI backend (no note tools). Waiting for the model…',
    );
    const reply = await runAgentTurn({
      conversationId,
      message: `${PLAN_PROMPT}\n\n${seedBlock}`,
      onChunk: input.onChunk,
      signal: input.signal,
      disableTools: true,
    });

    const parsed = extractJsonObject(reply);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Model did not return JSON curriculum.');
    }
    const nodesRaw = Array.isArray((parsed as { nodes?: unknown }).nodes)
      ? (parsed as { nodes: unknown[] }).nodes
      : [];
    const draft = normalizeConceptData({
      version: 1,
      seed: input.seed,
      map: {
        nodes: nodesRaw.map((n, i) => {
          const obj = n && typeof n === 'object' ? (n as Record<string, unknown>) : {};
          return {
            id: typeof obj.id === 'string' ? obj.id : `n${i + 1}`,
            title: typeof obj.title === 'string' ? obj.title : `Node ${i + 1}`,
            status: 'ready',
            explainMd: typeof obj.explainMd === 'string' ? obj.explainMd : '',
            playground: obj.playground,
          };
        }),
      },
      activeNodeId: null,
      progress: { completedNodeIds: [] },
    });
    if (draft.map.nodes.length === 0) {
      throw new Error('Curriculum JSON had no nodes.');
    }
    return {
      ...draft,
      seed: input.seed,
      activeNodeId: draft.map.nodes[0].id,
      building: false,
      buildError: undefined,
    };
  } catch (err) {
    const fallback = localFallbackPlan(input.seed);
    return {
      ...fallback,
      building: false,
      buildError: formatError(err),
    };
  }
}

export async function loadTutorHistory(
  tutorThreadId: string | undefined,
): Promise<TutorMessage[]> {
  if (!tutorThreadId) return [];
  const chatStoreId = resolveTutorChatStoreId();
  try {
    const conversation = await getChatConversation({
      providerId: chatStoreId,
      conversationId: tutorThreadId,
    });
    if (!conversation?.messages?.length) return [];
    return conversation.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        text: m.content,
      }));
  } catch {
    return [];
  }
}

export async function sendTutorMessage(input: {
  concept: ConceptData;
  userText: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; tutorThreadId: string; persistError?: string }> {
  const active = input.concept.map.nodes.find(
    (n) => n.id === input.concept.activeNodeId,
  );
  const topic = input.concept.seed?.topic || 'this concept';
  const conversationId = input.concept.tutorThreadId || newId('concept_tutor');
  const chatStoreId = resolveTutorChatStoreId();
  let persistError: string | undefined;

  try {
    await ensureTutorConversation({
      providerId: chatStoreId,
      conversationId,
      title: `Tutor: ${topic}`,
    });
  } catch (err) {
    persistError = formatError(err);
  }

  const context = [
    `You are a Socratic tutor inside ReaderGo Concept Learn for "${topic}".`,
    'Ask questions, give short hints, point at the playground. Do not dump long lectures.',
    'Prefer one question or one next move at a time.',
    'You have read-only tools: concept_get_state and concept_get_node. Use them when you need map or node detail beyond the snapshot below. You cannot change the document.',
    active
      ? `Active node: ${active.title} (${active.id})\nExplain:\n${active.explainMd}\nPlayground kind: ${active.playground.kind}`
      : 'No active node yet. Call concept_get_state if needed.',
    input.concept.seed?.raw
      ? `User spark:\n${input.concept.seed.raw.slice(0, 600)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const message = `${context}\n\n---\nLearner says: ${input.userText}`;

  try {
    await persistTutorMessage({
      providerId: chatStoreId,
      conversationId,
      role: 'user',
      content: input.userText,
    });
  } catch (err) {
    persistError = formatError(err);
  }

  const text = await runAgentTurn({
    conversationId,
    message,
    history: input.history,
    onChunk: input.onChunk,
    signal: input.signal,
    disableTools: true,
    tools: CONCEPT_TUTOR_TOOL_SPECS,
  });

  try {
    await persistTutorMessage({
      providerId: chatStoreId,
      conversationId,
      role: 'assistant',
      content: text,
    });
  } catch (err) {
    persistError = formatError(err);
  }

  return { text, tutorThreadId: conversationId, persistError };
}
