/**
 * Ollama Insight Provider Plugin
 * 
 * Provides AI-powered insights using Ollama providers (local and cloud).
 * Wraps the existing LLMProvider system and exposes it as an InsightProvider capability.
 */

'use client';

import { Plugin } from '@readergo/plugin-sdk';
import { PluginContext } from '@readergo/plugin-sdk';
import { InsightProvider, Note, InsightOptions, NoteGraph } from '@readergo/plugin-sdk';

const manifest = {
  id: 'readergo.ai.ollama',
  name: 'Ollama AI Insights',
  version: '1.0.0',
  description: 'Provides AI-powered insights using Ollama (local or cloud)',
  provides: ['insight-provider', 'center-pane'],
  permissions: ['ai:use' as const],
};

class OllamaInsightProviderAdapter implements InsightProvider {
  id = 'ollama-insights';
  name = 'Ollama AI Insights';

  constructor(private context: PluginContext) { }

  private async getLLMProvider(): Promise<any> {
    const providerManager = await this.context.getCapability<any>('llm-provider-manager');
    if (!providerManager) {
      throw new Error('LLM Provider Manager capability not available on Host.');
    }
    const provider = await providerManager.getProvider();
    if (!provider) {
      throw new Error('No AI provider available. Please configure Ollama.');
    }
    return provider;
  }

  async summarize(note: Note, options?: InsightOptions): Promise<string> {
    const provider = await this.getLLMProvider();
    return await provider.generateSummary(note.content);
  }

  async extractKeyPoints(note: Note, options?: InsightOptions): Promise<string[]> {
    const provider = await this.getLLMProvider();
    return await provider.extractKeyPoints(note.content, options);
  }

  async extractTags(note: Note, options?: InsightOptions): Promise<string[]> {
    const provider = await this.getLLMProvider();
    return await provider.extractTags(note.content, options);
  }

  async findRelated(note: Note, limit: number = 5): Promise<Note[]> {
    return [];
  }

  async buildGraph(notes: Note[]): Promise<NoteGraph> {
    const tagLinkService = await this.context.getCapability<any>('tag-link-service');
    if (!tagLinkService) {
      throw new Error('tag-link-service missing');
    }

    const insights = await Promise.all(
      notes.map(async (note) => {
        const tags = await this.extractTags(note);
        return {
          noteId: note.id,
          noteTitle: note.title,
          summary: '',
          keyPoints: [],
          tags,
          processingTime: 0,
          providerId: this.id,
          cachedAt: new Date(),
          noteUpdatedAt: note.updatedAt,
        };
      })
    );

    const graph = tagLinkService.buildGraph(insights);

    return {
      nodes: graph.nodes.map((node: any) => ({
        id: node.id,
        title: node.title,
        tags: node.tags || [],
      })),
      edges: graph.edges.map((edge: any) => ({
        source: edge.sourceNoteId,
        target: edge.targetNoteId,
        strength: edge.strength,
        sharedTags: edge.sharedTags,
      })),
    };
  }
}

export const OllamaInsightProviderPlugin: Plugin = {
  manifest,
  async activate(context: PluginContext) {
    try {
      context.log.info('Ollama Insight Provider plugin activating...');

      if (!context.hasPermission('ai:use')) {
        context.log.warn('Plugin does not have ai:use permission, but continuing...');
      }

      const ollamaInsightProvider = new OllamaInsightProviderAdapter(context);

      // In-plugin cache for insights
      const insightCache = new Map<string, any>();

      // Register the insight provider capability
      context.registerCapability('insight-provider', ollamaInsightProvider);
      context.log.info('✅ Registered insight-provider capability');

      // Register the AI generation command
      await context.registerCommand({
        id: 'readergo.ai.generateInsights',
        title: 'Generate AI Insights',
        handler: async (payload: { notes: Note[] }) => {
          const { notes } = payload;
          if (!notes || notes.length === 0) return { insights: [], graph: null };

          const results = [];
          
          for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
            
            // Check cache
            const cached = insightCache.get(note.id);
            if (cached && new Date(cached.noteUpdatedAt).getTime() === new Date(note.updatedAt).getTime()) {
              results.push(cached);
              continue;
            }

            // Emit progress event for UI
            context.emit('readergo.ai.progress', { 
              current: i + 1, 
              total: notes.length, 
              message: `Processing "${note.title}"...` 
            });

            const startTime = Date.now();
            const summary = await ollamaInsightProvider.summarize(note);
            const keyPoints = await ollamaInsightProvider.extractKeyPoints(note);
            const tags = await ollamaInsightProvider.extractTags(note);
            const processingTime = Date.now() - startTime;

            const insight = {
              noteId: note.id,
              noteTitle: note.title,
              summary,
              keyPoints,
              tags,
              processingTime,
              providerId: ollamaInsightProvider.id,
              cachedAt: new Date(),
              noteUpdatedAt: note.updatedAt,
            };

            insightCache.set(note.id, insight);
            results.push(insight);
          }

          // Build graph
          context.emit('readergo.ai.progress', { 
            current: notes.length, 
            total: notes.length, 
            message: 'Building connection graph...' 
          });
          const noteGraph = await ollamaInsightProvider.buildGraph(notes);

          return {
            insights: results,
            graph: noteGraph
          };
        }
      });

      // Register the center pane content ExtensionDescriptor (No React)
      await context.registerExtension({
        id: 'ai-insights-dashboard',
        type: 'center.pane',
        title: 'AI Insights',
        renderStrategy: 'host',
        schema: { target: 'AIInsightsPanel' },
        order: 1
      });
      context.log.info('✅ Registered center-pane-content extension');

      context.log.info('Ollama Insight Provider plugin activated successfully');
    } catch (error) {
      context.log.error('Failed to activate Ollama Insight Provider plugin:', error);
      throw error;
    }
  },
  deactivate(context: PluginContext) {
    context.log.info('Ollama Insight Provider plugin deactivated');
  },
};
