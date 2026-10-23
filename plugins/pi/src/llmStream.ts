import type {
  AgentToolSpec,
  LlmChatCapability,
  LlmChatMessage,
  LlmToolCall,
} from '@readergo/plugin-contracts';
import type { StreamFn } from '@earendil-works/pi-agent-core';
import {
  createAssistantMessageEventStream,
  getCurrentSystemPrompt,
  getCurrentTools,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Model,
  type TextContent,
  type ToolCall,
  type TranscriptContext,
} from '@earendil-works/pi-ai';

const STEP_LIMIT = 10;

const EMPTY_USAGE: AssistantMessage['usage'] = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export function placeholderModel(id: string): Model<'openai-completions'> {
  return {
    id,
    name: id,
    api: 'openai-completions',
    provider: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    reasoning: false,
    contextWindow: 128_000,
    maxTokens: 8_192,
  };
}

/**
 * Pi owns the loop. Each model turn goes through llm-chat.
 */
export function createLlmStreamFn(input: {
  llm: LlmChatCapability;
  providerId: string;
  apiKey: string;
  model?: string;
}): StreamFn {
  let steps = 0;
  return (_model, context, options) => {
    const stream = createAssistantMessageEventStream();
    const signal = options?.signal ?? new AbortController().signal;
    void answer(stream, context, signal, input, () => {
      steps += 1;
      return steps;
    }).catch(() => {
      // answer() records the failure on the stream
    });
    return stream;
  };
}

async function answer(
  stream: AssistantMessageEventStream,
  context: TranscriptContext,
  signal: AbortSignal,
  input: {
    llm: LlmChatCapability;
    providerId: string;
    apiKey: string;
    model?: string;
  },
  nextStep: () => number,
): Promise<void> {
  const output = blankMessage(input.model || 'openrouter');
  try {
    if (signal.aborted) throw new Error('CANCELLED');
    const step = nextStep();
    if (step > STEP_LIMIT) {
      emitText(stream, output, 'Tool step limit reached before a final answer.');
      return;
    }
    const tools = toolSpecs(getCurrentTools(context.messages));
    const turn = await input.llm.complete(
      {
        providerId: input.providerId,
        apiKey: input.apiKey,
        model: input.model,
        messages: toLlmMessages(context),
        tools,
      },
      signal,
    );
    const calls = turn.toolCalls ?? [];
    stream.push({ type: 'start', partial: output });
    if (calls.length > 0) {
      calls.forEach((call, index) => {
        const toolCall: ToolCall = {
          type: 'toolCall',
          id: call.id,
          name: call.name,
          arguments: jsonObject(call.arguments),
        };
        output.content.push(toolCall);
        stream.push({
          type: 'toolcall_end',
          contentIndex: index,
          toolCall,
          partial: output,
        });
      });
      output.stopReason = 'toolUse';
      stream.push({ type: 'done', reason: 'toolUse', message: output });
      stream.end();
      return;
    }
    emitText(stream, output, turn.text ?? '', true);
  } catch (err) {
    output.stopReason = signal.aborted ? 'aborted' : 'error';
    output.errorMessage = err instanceof Error ? err.message : 'Model call failed';
    stream.push({ type: 'error', reason: output.stopReason, error: output });
    stream.end();
  }
}

function emitText(
  stream: AssistantMessageEventStream,
  output: AssistantMessage,
  text: string,
  alreadyStarted = false,
): void {
  const block: TextContent = { type: 'text', text };
  output.content = [block];
  output.stopReason = 'stop';
  if (!alreadyStarted) stream.push({ type: 'start', partial: output });
  stream.push({ type: 'text_start', contentIndex: 0, partial: output });
  stream.push({ type: 'text_delta', contentIndex: 0, delta: text, partial: output });
  stream.push({ type: 'text_end', contentIndex: 0, content: text, partial: output });
  stream.push({ type: 'done', reason: 'stop', message: output });
  stream.end();
}

function blankMessage(modelId: string): AssistantMessage {
  return {
    role: 'assistant',
    content: [],
    api: 'openai-completions',
    provider: 'openrouter',
    model: modelId,
    usage: { ...EMPTY_USAGE, cost: { ...EMPTY_USAGE.cost } },
    stopReason: 'pending',
    timestamp: Date.now(),
  };
}

function toLlmMessages(context: TranscriptContext): LlmChatMessage[] {
  const messages: LlmChatMessage[] = [];
  const system = getCurrentSystemPrompt(context.messages);
  if (system.trim()) messages.push({ role: 'system', content: system });
  for (const message of context.messages) {
    if (message.role === 'system') continue;
    if (message.role === 'user') {
      messages.push({ role: 'user', content: textOf(message.content) });
      continue;
    }
    if (message.role === 'assistant') {
      const text = message.content
        .filter((block): block is TextContent => block.type === 'text')
        .map((block) => block.text)
        .join('');
      const toolCalls = message.content
        .filter((block): block is ToolCall => block.type === 'toolCall')
        .map(toLlmToolCall);
      messages.push({
        role: 'assistant',
        content: text,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
      continue;
    }
    if (message.role === 'toolResult') {
      messages.push({
        role: 'tool',
        content: textOf(message.content),
        toolCallId: message.toolCallId,
      });
    }
  }
  return messages;
}

function toLlmToolCall(call: ToolCall): LlmToolCall {
  return {
    id: call.id,
    name: call.name,
    arguments: { ...call.arguments },
  };
}

function toolSpecs(tools: Array<{ name: string; description: string; parameters: unknown }>): AgentToolSpec[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: plainSchema(tool.parameters),
  }));
}

function plainSchema(schema: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(JSON.stringify(schema)) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return { type: 'object', properties: {} };
}

function textOf(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === 'string') return content;
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}

function jsonObject(value: Record<string, unknown>): ToolCall['arguments'] {
  const out: ToolCall['arguments'] = {};
  for (const [key, item] of Object.entries(value)) {
    if (isJson(item)) out[key] = item;
  }
  return out;
}

function isJson(value: unknown): value is ToolCall['arguments'][string] {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJson);
  }
  return false;
}
