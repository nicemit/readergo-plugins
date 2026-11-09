/**
 * Pi agent SDK plugin. Pi runs the loop and the tools.
 * Model turns go through llm-chat. The host does not import Pi.
 */
import { Agent, type AgentMessage } from '@earendil-works/pi-agent-core';
import type { AssistantMessage, TextContent, UserMessage } from '@earendil-works/pi-ai';
import type {
  AgentChatChunk,
  AgentChatRequest,
  AgentActivityCapability,
  AgentSdkCapability,
  TagsCapability,
  ChatStoreCapability,
  EmbeddingsCapability,
  FilesystemCapability,
  LlmChatCapability,
  RemoteCallCapability,
  RuntimePlugin,
  VectorStoreCapability,
} from '@readergo/plugin-contracts';
import {
  AGENT_ACTIVITY_CAPABILITY_ID,
  AGENT_SDK_CAPABILITY_ID,
  CHAT_STORE_CAPABILITY_ID,
  TAGS_CAPABILITY_ID,
  EMBEDDINGS_CAPABILITY_ID,
  FILESYSTEM_CAPABILITY_ID,
  LLM_CHAT_CAPABILITY_ID,
  REMOTE_CALL_CAPABILITY_ID,
  VECTOR_STORE_CAPABILITY_ID,
} from '@readergo/plugin-contracts';
import { createLlmStreamFn, placeholderModel } from './llmStream';
import { createPiTools, systemPrompt } from './tools';

export const PI_AGENT_ID = 'pi';

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.agent.pi',
    name: 'Pi',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description: 'Pi agent SDK. Runs chat tools and calls the selected LLM provider.',
    category: 'ai',
    provides: ['agent-sdk.pi'],
    requires: [
      AGENT_SDK_CAPABILITY_ID,
      LLM_CHAT_CAPABILITY_ID,
      REMOTE_CALL_CAPABILITY_ID,
      CHAT_STORE_CAPABILITY_ID,
      EMBEDDINGS_CAPABILITY_ID,
      VECTOR_STORE_CAPABILITY_ID,
    ],
    permissions: ['ai:use'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const registry = await context.getCapability<AgentSdkCapability>(AGENT_SDK_CAPABILITY_ID);
    if (!registry) throw new Error('agent-sdk capability is not available');
    registry.register({
      id: PI_AGENT_ID,
      name: 'Pi',
      async *run(req, signal) {
        const provider = req.provider;
        if (!provider?.id || !provider.apiKey) {
          throw new Error('No model provider selected');
        }
        const llm = await context.getCapability<LlmChatCapability>(LLM_CHAT_CAPABILITY_ID);
        if (!llm) throw new Error('llm-chat capability is not available');
        const remote = await context.getCapability<RemoteCallCapability>(REMOTE_CALL_CAPABILITY_ID);
        if (!remote) throw new Error('remote-call capability is not available');
        const fs = await context.getCapability<FilesystemCapability>(FILESYSTEM_CAPABILITY_ID);
        const chatStore = await context.getCapability<ChatStoreCapability>(
          CHAT_STORE_CAPABILITY_ID,
        );
        const embeddings = await context.getCapability<EmbeddingsCapability>(
          EMBEDDINGS_CAPABILITY_ID,
        );
        const vectorStore = await context.getCapability<VectorStoreCapability>(
          VECTOR_STORE_CAPABILITY_ID,
        );
        const activity = await context.getCapability<AgentActivityCapability>(
          AGENT_ACTIVITY_CAPABILITY_ID,
        );
        const tags = await context.getCapability<TagsCapability>(TAGS_CAPABILITY_ID);
        const modelId = provider.model?.trim() || 'openai/gpt-4o-mini';
        const runId = `pi_${Date.now().toString(36)}`;
        let index = 0;
        let text = '';
        const agent = new Agent({
          streamFn: createLlmStreamFn({
            llm,
            providerId: provider.id,
            apiKey: provider.apiKey,
            model: modelId,
            maxSteps: req.maxToolSteps,
          }),
          toolExecution: 'sequential',
          initialState: {
            systemPrompt: systemPrompt(req, req.tools ?? []),
            model: placeholderModel(modelId),
            tools: createPiTools({
              req,
              remote,
              fs,
              chatStore,
              embeddings,
              vectorStore,
              activity,
              tags,
            }),
            messages: historyMessages(req, modelId),
          },
        });
        const pending: string[] = [];
        let wake: (() => void) | null = null;
        const notify = () => {
          const current = wake;
          wake = null;
          current?.();
        };
        agent.subscribe((event) => {
          if (
            event.type === 'message_update' &&
            event.assistantMessageEvent.type === 'text_delta'
          ) {
            const delta = event.assistantMessageEvent.delta;
            if (!delta) return;
            text += delta;
            pending.push(delta);
            notify();
          }
        });
        const onAbort = () => agent.abort();
        if (signal.aborted) agent.abort();
        else signal.addEventListener('abort', onAbort, { once: true });
        let promptDone = false;
        const promptTask = agent.prompt(req.message).finally(() => {
          promptDone = true;
          notify();
        });
        try {
          while (!promptDone || pending.length > 0) {
            if (pending.length === 0) {
              await new Promise<void>((resolve) => {
                wake = resolve;
                if (promptDone || pending.length > 0) notify();
              });
              continue;
            }
            const delta = pending.shift() ?? '';
            if (!delta) continue;
            const chunk: AgentChatChunk = {
              conversationId: req.conversationId,
              runId,
              text: delta,
              index,
            };
            index += 1;
            yield chunk;
          }
          await promptTask;
        } finally {
          signal.removeEventListener('abort', onAbort);
        }
        if (signal.aborted) throw new Error('CANCELLED');
        const errorMessage = agent.state.errorMessage;
        if (errorMessage) throw new Error(errorMessage);
        if (!text && index === 0) {
          yield {
            conversationId: req.conversationId,
            runId,
            text: '',
            index,
          };
        }
      },
    });
    context.log.info('Pi agent SDK registered');
  },
};

export default plugin;

function historyMessages(req: AgentChatRequest, modelId: string): AgentMessage[] {
  return (req.history ?? []).map((turn) =>
    turn.role === 'user' ? userMessage(turn.content) : assistantMessage(turn.content, modelId),
  );
}

function userMessage(text: string): UserMessage {
  return { role: 'user', content: text, timestamp: Date.now() };
}

function assistantMessage(text: string, modelId: string): AssistantMessage {
  return {
    role: 'assistant',
    content: [{ type: 'text', text } satisfies TextContent],
    api: 'openai-completions',
    provider: 'openrouter',
    model: modelId,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: 'stop',
    timestamp: Date.now(),
  };
}
