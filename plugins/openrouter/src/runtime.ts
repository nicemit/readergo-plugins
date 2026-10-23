/**
 * OpenRouter llm-chat provider. The host discovers this plugin.
 * OpenRouter is an LLM provider, not an agent SDK.
 * The host does not import OpenRouter.
 */
import type {
  LlmChatCapability,
  LlmChatMessage,
  LlmChatTurnRequest,
  LlmChatTurnResult,
  LlmToolCall,
  RuntimePlugin,
} from '@readergo/plugin-contracts';
import { LLM_CHAT_CAPABILITY_ID } from '@readergo/plugin-contracts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export const OPENROUTER_PROVIDER_ID = 'openrouter';

export function createOpenRouterProvider() {
  return {
    id: OPENROUTER_PROVIDER_ID,
    name: 'OpenRouter',
    async complete(
      req: LlmChatTurnRequest,
      signal: AbortSignal,
    ): Promise<LlmChatTurnResult> {
      const model = req.model?.trim() || DEFAULT_MODEL;
      const body: Record<string, unknown> = {
        model,
        messages: req.messages.map(toOpenAIMessage),
      };
      if (req.tools.length > 0) {
        body.tools = req.tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }));
        body.tool_choice = 'auto';
      }

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${req.apiKey}`,
          'X-Title': 'ReaderGo',
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`OpenRouter request failed (${response.status}): ${clip(errText)}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
        error?: { message?: string };
      };
      if (json.error?.message) {
        throw new Error(`OpenRouter request failed: ${json.error.message}`);
      }
      const message = json.choices?.[0]?.message;
      const toolCalls = (message?.tool_calls ?? [])
        .map(parseToolCall)
        .filter((call): call is LlmToolCall => call !== null);
      return {
        text: typeof message?.content === 'string' ? message.content : '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    },
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.llm.openrouter',
    name: 'OpenRouter',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description: 'OpenRouter model provider for agent chat',
    category: 'ai',
    provides: ['llm-chat.openrouter'],
    requires: [LLM_CHAT_CAPABILITY_ID],
    permissions: ['ai:use', 'network:request'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const llm = await context.getCapability<LlmChatCapability>(LLM_CHAT_CAPABILITY_ID);
    if (!llm) {
      throw new Error('llm-chat capability is not available');
    }
    llm.register(createOpenRouterProvider());
    context.log.info('OpenRouter provider registered');
  },
};

export default plugin;

function toOpenAIMessage(message: LlmChatMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }
  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(call.arguments ?? {}),
        },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function parseToolCall(raw: {
  id?: string;
  function?: { name?: string; arguments?: string };
}): LlmToolCall | null {
  const name = raw.function?.name;
  if (!name) return null;
  let args: Record<string, unknown> = {};
  const text = raw.function?.arguments;
  if (typeof text === 'string' && text.trim()) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        args = parsed as Record<string, unknown>;
      }
    } catch {
      args = {};
    }
  }
  return {
    id: raw.id || `call_${name}`,
    name,
    arguments: args,
  };
}

function clip(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 300);
}
