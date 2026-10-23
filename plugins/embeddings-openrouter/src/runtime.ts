/**
 * OpenRouter embeddings provider. Uses the OpenAI-compatible embeddings API.
 */
import type {
  EmbeddingsCapability,
  EmbeddingsProvider,
  EmbeddingsRequest,
  EmbeddingsResult,
  RuntimePlugin,
} from '@readergo/plugin-contracts';
import { EMBEDDINGS_CAPABILITY_ID } from '@readergo/plugin-contracts';

export const OPENROUTER_EMBEDDINGS_ID = 'openrouter';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/embeddings';
const DEFAULT_MODEL = 'openai/text-embedding-3-small';

function createOpenRouterEmbeddings(): EmbeddingsProvider {
  return {
    id: OPENROUTER_EMBEDDINGS_ID,
    name: 'OpenRouter',
    async embed(req: EmbeddingsRequest, signal?: AbortSignal): Promise<EmbeddingsResult> {
      const apiKey = req.apiKey?.trim();
      if (!apiKey) {
        throw new Error('OpenRouter embeddings need an API key');
      }
      const model = req.model?.trim() || DEFAULT_MODEL;
      const texts = (req.texts ?? []).map((text) => String(text ?? '').slice(0, 8_000));
      if (texts.length === 0) {
        return { vectors: [], dimensions: 0, model };
      }
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Title': 'ReaderGo',
        },
        body: JSON.stringify({ model, input: texts }),
        signal,
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(
          `OpenRouter embeddings failed (${response.status}): ${errText.slice(0, 400)}`,
        );
      }
      const json = (await response.json()) as {
        data?: Array<{ embedding?: number[]; index?: number }>;
        error?: { message?: string };
      };
      if (json.error?.message) {
        throw new Error(`OpenRouter embeddings failed: ${json.error.message}`);
      }
      const sorted = [...(json.data ?? [])].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      );
      const vectors = sorted.map((item) =>
        Array.isArray(item.embedding) ? item.embedding.map(Number) : [],
      );
      const dimensions = vectors[0]?.length ?? 0;
      return { vectors, dimensions, model };
    },
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.embeddings.openrouter',
    name: 'Embeddings (OpenRouter)',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description: 'OpenRouter embeddings API provider for agent memory.',
    category: 'ai',
    provides: ['embeddings.openrouter'],
    requires: [EMBEDDINGS_CAPABILITY_ID],
    permissions: ['ai:use', 'network:request'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const registry = await context.getCapability<EmbeddingsCapability>(
      EMBEDDINGS_CAPABILITY_ID,
    );
    if (!registry) throw new Error('embeddings capability is not available');
    registry.register(createOpenRouterEmbeddings());
    context.log.info('OpenRouter embeddings registered');
  },
};

export default plugin;
