/**
 * Local embeddings provider. Uses a deterministic hashing embedder so
 * agent memory works offline without downloading model weights.
 * A later plugin can replace this with a transformer model under the
 * same embeddings registry.
 */
import type {
  EmbeddingsCapability,
  EmbeddingsProvider,
  EmbeddingsRequest,
  EmbeddingsResult,
  RuntimePlugin,
} from '@readergo/plugin-contracts';
import { EMBEDDINGS_CAPABILITY_ID } from '@readergo/plugin-contracts';

export const LOCAL_EMBEDDINGS_ID = 'local';
const DIMENSIONS = 384;
const MODEL_NAME = 'local-hash-v1';

function hashEmbed(text: string): number[] {
  const vector = new Array<number>(DIMENSIONS).fill(0);
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
  if (tokens.length === 0) return vector;
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const index = Math.abs(h) % DIMENSIONS;
    const sign = h & 1 ? 1 : -1;
    vector[index] += sign;
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return vector.map((value) => value / norm);
}

function createLocalEmbeddings(): EmbeddingsProvider {
  return {
    id: LOCAL_EMBEDDINGS_ID,
    name: 'Local (offline)',
    async embed(req: EmbeddingsRequest): Promise<EmbeddingsResult> {
      const texts = (req.texts ?? []).map((text) => String(text ?? '').slice(0, 8_000));
      const vectors = texts.map(hashEmbed);
      return {
        vectors,
        dimensions: DIMENSIONS,
        model: req.model?.trim() || MODEL_NAME,
      };
    },
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.embeddings.local',
    name: 'Embeddings (Local)',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description: 'Offline local embeddings for agent memory. No API key.',
    category: 'ai',
    provides: ['embeddings.local'],
    requires: [EMBEDDINGS_CAPABILITY_ID],
    permissions: ['ai:use'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const registry = await context.getCapability<EmbeddingsCapability>(
      EMBEDDINGS_CAPABILITY_ID,
    );
    if (!registry) throw new Error('embeddings capability is not available');
    registry.register(createLocalEmbeddings());
    context.log.info('Local embeddings registered');
  },
};

export default plugin;
