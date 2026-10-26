import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import type { PluginContext } from '@readergo/plugin-sdk';
import {
  Brain,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Check,
  ChevronRight,
  Settings2,
  Sliders,
  X,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Undo2,
} from 'lucide-react';
import { extractProfile, findRelatedNotes, generateDynamicActions } from './engine';
import { DEFAULT_AGENT_CONFIG } from './types';
import type { ActionResult, AgentConfig, DocumentProfile, DynamicAction, RelatedNote } from './types';

interface ActionExecutionState {
  actionId: string;
  result: ActionResult;
  previousContent: string;
  timestamp: string;
}

interface ThinkingPartnerPanelProps {
  noteId: string | null;
  context: PluginContext;
  onNavigateToNote?: (noteId: string) => void;
  onCreateNote?: (title: string) => void;
}

export function ThinkingPartnerPanel({
  noteId,
  context,
  onNavigateToNote,
  onCreateNote,
}: ThinkingPartnerPanelProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<DocumentProfile | null>(null);
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [actions, setActions] = useState<DynamicAction[]>([]);
  const [activeNoteTitle, setActiveNoteTitle] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [isRefreshing, startTransition] = useTransition();

  // Immediate UI Feedback states
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<ActionExecutionState | null>(null);
  const [undoToast, setUndoToast] = useState<string | null>(null);

  // Agent Prompt & Instructions Configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
  const [systemPromptDraft, setSystemPromptDraft] = useState(DEFAULT_AGENT_CONFIG.systemPrompt);
  const [criteriaDraft, setCriteriaDraft] = useState(DEFAULT_AGENT_CONFIG.connectionCriteria);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Load persisted config from plugin storage
  useEffect(() => {
    async function loadConfig() {
      try {
        if (context.storage?.get) {
          const saved = await context.storage.get<AgentConfig>('thinking_partner_config');
          if (saved) {
            setAgentConfig(saved);
            setSystemPromptDraft(saved.systemPrompt);
            setCriteriaDraft(saved.connectionCriteria);
          }
        }
      } catch (err) {
        context.log.warn('Could not load thinking_partner_config:', err);
      }
    }
    loadConfig();
  }, [context]);

  const saveConfig = async () => {
    const updated: AgentConfig = {
      ...agentConfig,
      systemPrompt: systemPromptDraft,
      connectionCriteria: criteriaDraft,
    };
    setAgentConfig(updated);
    try {
      if (context.storage?.set) {
        await context.storage.set('thinking_partner_config', updated);
      }
      setConfigSavedToast(true);
      setTimeout(() => setConfigSavedToast(false), 2000);
      setShowConfig(false);
      startTransition(() => {
        analyzeCurrentDocument(updated);
      });
    } catch (err) {
      context.log.error('Failed to save config:', err);
    }
  };

  const resetConfigToDefault = () => {
    setSystemPromptDraft(DEFAULT_AGENT_CONFIG.systemPrompt);
    setCriteriaDraft(DEFAULT_AGENT_CONFIG.connectionCriteria);
  };

  const analyzeCurrentDocument = useCallback(
    async (cfg: AgentConfig = agentConfig) => {
      if (!noteId) {
        setProfile(null);
        setRelatedNotes([]);
        setActions([]);
        return;
      }

      try {
        setLoading(true);
        const storage = await context.getCapability<any>('document-storage');
        if (!storage) return;

        const currentDoc = await storage.get(noteId);
        if (!currentDoc) return;

        setActiveNoteTitle(currentDoc.title || 'Untitled Note');
        setCurrentContent(currentDoc.content || '');

        const docProfile = extractProfile(currentDoc.title || '', currentDoc.content || '');
        setProfile(docProfile);

        const allSummaries = (await storage.list()) || [];
        const hydratedNotes = await Promise.all(
          allSummaries.slice(0, 40).map(async (doc: any) => {
            if (doc.id === noteId) return null;
            try {
              return await storage.get(doc.id);
            } catch {
              return doc;
            }
          })
        );

        const validOtherNotes = hydratedNotes.filter(Boolean);
        const discovered = findRelatedNotes(noteId, docProfile, validOtherNotes, cfg);
        setRelatedNotes(discovered);

        const dynamicActions = generateDynamicActions(
          docProfile,
          discovered,
          currentDoc.content || '',
          cfg
        );
        setActions(dynamicActions);
      } catch (err) {
        context.log.error('Failed to analyze note in Thinking Partner:', err);
      } finally {
        setLoading(false);
      }
    },
    [noteId, context, agentConfig]
  );

  useEffect(() => {
    analyzeCurrentDocument();
  }, [analyzeCurrentDocument]);

  // Subscribe to storage mutations
  useEffect(() => {
    let subId: string | null = null;
    let cancelled = false;

    if (context && typeof context.subscribe === 'function') {
      void context.subscribe('note:updated', (payload: any) => {
        if (cancelled) return;
        if (payload?.id === noteId || !payload?.id) {
          startTransition(() => {
            analyzeCurrentDocument();
          });
        }
      }).then((id: string) => {
        if (cancelled) {
          if (typeof context.unsubscribe === 'function') {
            void context.unsubscribe(id);
          }
        } else {
          subId = id;
        }
      });
    }

    return () => {
      cancelled = true;
      if (subId && typeof context.unsubscribe === 'function') {
        void context.unsubscribe(subId);
      }
    };
  }, [noteId, context, analyzeCurrentDocument]);

  const handleInsertLink = async (related: RelatedNote) => {
    if (!noteId || linkingNoteId) return;
    try {
      setLinkingNoteId(related.id);

      const linkBlock = `Related: [[${related.title}]]`;

      // Use document update tool through canonical command
      await context.executeCommand('readergo.document.update', {
        id: noteId,
        content: linkBlock,
        mode: 'append',
      });

      setCurrentContent((prev) => `${prev}\n\n${linkBlock}`);

      const toast = await context.getCapability<any>('toast-service');
      if (toast?.success) {
        toast.success(`Linked [[${related.title}]] into note`);
      }

      setLastActionResult({
        actionId: `link-${related.id}`,
        result: {
          title: `Linked [[${related.title}]]`,
          content: linkBlock,
          mode: 'append',
          type: 'insert',
          summary: `Added bidirectional reference to [[${related.title}]]`,
          details: [`Injected "Related: [[${related.title}]]" at current position`],
          undoAvailable: true,
        },
        previousContent: currentContent,
        timestamp: 'Just now',
      });
    } catch (err) {
      context.log.error('Failed to insert link:', err);
    } finally {
      setTimeout(() => setLinkingNoteId(null), 400);
    }
  };

  const handleExecuteAction = async (action: DynamicAction) => {
    if (!noteId || executingActionId) return;
    const previousSnapshot = currentContent;

    try {
      setExecutingActionId(action.id);

      // Brief delay to give user tangible visual reaction
      await new Promise((r) => setTimeout(r, 200));

      const result = await action.execute();
      const mode = result.mode || (result.type === 'replace' ? 'replace' : 'append');

      // Use document update tool through canonical command
      await context.executeCommand('readergo.document.update', {
        id: noteId,
        content: result.content,
        mode,
      });

      if (mode === 'append') {
        setCurrentContent((prev) => `${prev}\n\n${result.content}`);
      } else {
        setCurrentContent(result.content);
      }

      // Save execution state for inline feedback & undo
      setLastActionResult({
        actionId: action.id,
        result,
        previousContent: previousSnapshot,
        timestamp: 'Just now',
      });

      const toast = await context.getCapability<any>('toast-service');
      if (toast?.success) {
        toast.success(result.title, result.summary);
      }

      analyzeCurrentDocument();
    } catch (err) {
      context.log.error('Failed to execute action:', err);
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleUndo = async () => {
    if (!noteId || !lastActionResult) return;
    try {
      // Revert using document update tool with mode replace
      await context.executeCommand('readergo.document.update', {
        id: noteId,
        content: lastActionResult.previousContent,
        mode: 'replace',
      });

      setCurrentContent(lastActionResult.previousContent);
      setLastActionResult(null);
      setUndoToast('Reverted changes successfully');
      setTimeout(() => setUndoToast(null), 3000);

      const toast = await context.getCapability<any>('toast-service');
      if (toast?.info) {
        toast.info('Reverted changes');
      }

      analyzeCurrentDocument();
    } catch (err) {
      context.log.error('Failed to undo action:', err);
    }
  };

  if (!noteId) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-xs text-muted-foreground text-center">
        <Brain className="w-5 h-5 mx-auto mb-2 text-primary/60 opacity-60" />
        <p className="font-medium text-foreground">Thinking Partner</p>
        <p className="mt-1">Open any document to discover connections and smart actions.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-border/40 bg-card/50 p-3.5 backdrop-blur-md shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/30">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground tracking-tight">
          <Brain className="w-4 h-4 text-primary" />
          <span>Thinking Partner</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            title="Configure Agent Prompts & Instructions"
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              showConfig
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => startTransition(() => analyzeCurrentDocument())}
            title="Re-analyze document"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Configuration & Editable Prompts View */}
      {showConfig && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-muted/40 p-3 text-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-1 border-b border-border/30">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span>Agent Configuration & Prompts</span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
              System Prompt & Mission:
            </span>
            <textarea
              value={systemPromptDraft}
              onChange={(e) => setSystemPromptDraft(e.target.value)}
              rows={3}
              className="w-full text-[11px] font-sans p-2 rounded border border-border/60 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="Define the agent's core instructions..."
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
              Connection Matching Criteria:
            </span>
            <textarea
              value={criteriaDraft}
              onChange={(e) => setCriteriaDraft(e.target.value)}
              rows={2}
              className="w-full text-[11px] font-sans p-2 rounded border border-border/60 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="Define rules for surfacing connected notes..."
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={resetConfigToDefault}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={saveConfig}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground font-medium text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      )}

      {/* Config Saved Feedback */}
      {configSavedToast && (
        <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Check className="w-3.5 h-3.5" />
          <span>Instructions updated & re-applied</span>
        </div>
      )}

      {/* Undo Feedback Toast */}
      {undoToast && (
        <div className="flex items-center gap-1.5 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium animate-fadeIn">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{undoToast}</span>
        </div>
      )}

      {/* Document Intent & Classification Badge */}
      {profile && (
        <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-medium text-foreground/90">{profile.intentLabel}</span>
            <span className="text-[10px] text-muted-foreground/60">({profile.wordCount} words)</span>
          </div>
          {profile.detectedDuplicates.length > 0 && (
            <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              {profile.detectedDuplicates.length} dupe{profile.detectedDuplicates.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Discovered Topic & Entity Tags (Zero Pure Numbers) */}
      {profile && profile.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.topics.map((topic) => (
            <span
              key={topic}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
            >
              #{topic}
            </span>
          ))}
        </div>
      )}

      {/* INLINE ACTION RESULT & DIFF CARD (Immediate Reaction with Undo) */}
      {lastActionResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2 text-xs animate-fadeIn backdrop-blur-sm">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{lastActionResult.result.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastActionResult(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {lastActionResult.result.summary && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {lastActionResult.result.summary}
            </p>
          )}

          {lastActionResult.result.details && lastActionResult.result.details.length > 0 && (
            <div className="space-y-1 bg-black/30 p-2 rounded-lg border border-border/20 text-[10px] font-mono">
              {lastActionResult.result.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-1 text-emerald-300/90">
                  <span className="text-emerald-500">•</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground/60">{lastActionResult.timestamp}</span>
            {lastActionResult.result.undoAvailable && (
              <button
                type="button"
                data-testid="undo-changes-btn"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-foreground border border-border/40 text-[10px] font-medium transition-colors cursor-pointer"
              >
                <Undo2 className="w-3 h-3 text-amber-400" />
                <span>Undo Changes</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Context-Aware Smart Actions with Visual Loading State */}
      {actions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Contextual Actions</span>
          </div>
          <div className="space-y-1.5">
            {actions.map((act) => {
              const isExecutingThis = executingActionId === act.id;
              const isExecutingAny = executingActionId !== null;

              return (
                <button
                  key={act.id}
                  type="button"
                  data-action-id={act.id}
                  disabled={isExecutingAny}
                  onClick={() => handleExecuteAction(act)}
                  className={`w-full text-left group flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isExecutingThis
                      ? 'bg-primary/20 border-primary text-primary shadow-sm'
                      : isExecutingAny
                      ? 'bg-card/40 border-border/20 opacity-40 cursor-not-allowed'
                      : 'bg-card/80 border-border/40 hover:border-primary/40 hover:bg-muted/40 hover:shadow-sm'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {isExecutingThis && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
                      <span>{isExecutingThis ? act.executingLabel || 'Applying...' : act.label}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {act.description}
                    </div>
                  </div>
                  {!isExecutingThis && (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-all flex-shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Related Notes & Knowledge Connections */}
      <div className="space-y-2 pt-1 border-t border-border/30">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            <LinkIcon className="w-3 h-3 text-primary" />
            <span>Connected Notes ({relatedNotes.length})</span>
          </span>
        </div>

        {relatedNotes.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 italic py-1">
            No related notes discovered yet. Mention other topics to discover connections.
          </p>
        ) : (
          <div className="space-y-2">
            {relatedNotes.map((rel) => {
              const isLinkingThis = linkingNoteId === rel.id;
              const isLinked = rel.isAlreadyLinked;

              return (
                <div
                  key={rel.id}
                  className="group rounded-lg border border-border/40 bg-card/60 p-2.5 hover:border-primary/30 hover:bg-card/90 transition-all space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {rel.title}
                        </span>
                        {isLinked && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border/40">
                            Linked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                            isLinked
                              ? 'bg-muted text-muted-foreground border-border/30'
                              : rel.reason === 'unlinked-mention'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {isLinked
                            ? `🔗 Linked: "${rel.matchTerm}"`
                            : rel.reason === 'unlinked-mention'
                            ? `💡 Mention: "${rel.matchTerm}"`
                            : `⚡ Shared Topic: "${rel.matchTerm}"`}
                        </span>
                      </div>
                      {rel.description && (
                        <p className="text-[10px] text-muted-foreground/90 mt-1 leading-relaxed">
                          {rel.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onNavigateToNote && (
                        <button
                          type="button"
                          onClick={() => onNavigateToNote(rel.id)}
                          title="Open this related note"
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleInsertLink(rel)}
                        disabled={isLinked || isLinkingThis}
                        title={isLinked ? 'Already linked' : 'Insert [[Link]] into current note'}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                          isLinked
                            ? 'bg-muted text-muted-foreground opacity-60 cursor-default'
                            : isLinkingThis
                            ? 'bg-primary/30 text-primary border border-primary'
                            : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20'
                        }`}
                      >
                        {isLinkingThis ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Linking...</span>
                          </>
                        ) : isLinked ? (
                          <>
                            <Check className="w-2.5 h-2.5" />
                            <span>Linked</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-2.5 h-2.5" />
                            <span>Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {rel.snippet && (
                    <p className="text-[10px] text-muted-foreground/80 line-clamp-2 italic bg-muted/20 p-1.5 rounded border border-border/20 mt-1">
                      "{rel.snippet}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
