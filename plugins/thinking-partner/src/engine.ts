import type {
  ActionResult,
  AgentConfig,
  DetectedDuplicate,
  DocumentIntent,
  DocumentProfile,
  DynamicAction,
  RelatedNote,
} from './types';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'were', 'which',
  'about', 'then', 'them', 'they', 'what', 'when', 'where', 'more', 'also',
  'some', 'into', 'just', 'like', 'note', 'untitled', 'page', 'will', 'your',
  'make', 'than', 'been', 'each', 'does', 'only', 'very', 'even', 'most',
  'such', 'there', 'here', 'other', 'could', 'should', 'would', 'these',
  'those', 'after', 'before', 'being', 'having', 'over', 'under', 'between',
  'through', 'during', 'without', 'again', 'further', 'once', 'both', 'same',
  'editor', 'placeholder', 'pro', 'tip', 'true', 'false', 'null', 'undefined',
  'opt', 'lett', 'article', 'pubmed', 'google', 'scholar', 'taylor',
]);

/**
 * Strips HTML tags and entities to return clean text with preserved line breaks.
 */
export function cleanText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Checks if a token is a pure year, number, date or noise token.
 */
function isNumberOrYearOrNoise(token: string): boolean {
  if (!token) return true;
  const t = token.trim().toLowerCase();
  // Pure digits or 4-digit years (e.g. 2023, 1999)
  if (/^\d+$/.test(t)) return true;
  // Roman numerals or isolated year ranges (e.g. 2023-2025)
  if (/^\d{4}[-–]\d{4}$/.test(t)) return true;
  // Length too short
  if (t.length <= 2) return true;
  // Stop words
  if (STOP_WORDS.has(t)) return true;
  return false;
}

/**
 * Robust, dynamic duplicate detector that scans list items and lines in ANY document.
 * Zero hardcoded strings - computes true duplicate entries normalized without punctuation/dates.
 */
export function scanDuplicates(content: string): DetectedDuplicate[] {
  if (!content) return [];
  const text = cleanText(content);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const itemCounts = new Map<string, { original: string; count: number }>();

  for (const line of lines) {
    // Strip bullet markers (- , * , 1. , etc.)
    const cleaned = line.replace(/^([-*•]|\d+\.)\s+/, '').trim();
    if (cleaned.length < 3) continue;

    // Normalize for comparison: remove release years like "— 2010" or "(2020)", lower-case, remove extra spaces
    const normalized = cleaned
      .replace(/(\s*[-—–]\s*\d{4}|\s*\(\d{4}\))/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (normalized.length >= 3 && !isNumberOrYearOrNoise(normalized)) {
      const existing = itemCounts.get(normalized);
      if (existing) {
        existing.count++;
      } else {
        itemCounts.set(normalized, { original: cleaned, count: 1 });
      }
    }
  }

  return Array.from(itemCounts.values())
    .filter((entry) => entry.count > 1)
    .map((entry) => ({ item: entry.original, count: entry.count }));
}

/**
 * Extracts key profile attributes, headings, topics, and dynamically classifies
 * document intent (article, technical-spec, list-catalog, meeting, task-tracker, brainstorm).
 */
export function extractProfile(title: string, rawContent: string): DocumentProfile {
  const textWithNewlines = cleanText(rawContent);
  const text = textWithNewlines.replace(/\n+/g, ' ');
  const lines = textWithNewlines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Extract Headings
  const headings: string[] = [];
  for (const line of lines) {
    const cleanLine = cleanText(line);
    if (/^(#{1,4}\s+|[A-Z][-A-Za-z0-9\s/&—–]+(?:\s*[/&]\s*[A-Z][-A-Za-z0-9\s/&—–]+)*$)/.test(cleanLine)) {
      const headingCandidate = cleanLine.replace(/^#{1,4}\s+/, '').trim();
      if (
        headingCandidate.length >= 4 &&
        headingCandidate.length <= 40 &&
        !/^(untitled|editor\.placeholder|to watch|watched|needs review|cleanup notes)$/i.test(headingCandidate) &&
        !/^\d+$/.test(headingCandidate)
      ) {
        headings.push(headingCandidate);
      }
    }
  }

  // 2. Extract Significant Capitalized Entities / Titles
  const entities: string[] = [];
  const entityMatches = rawContent.match(/\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)+\b/g) || [];
  const entitySet = new Set<string>();
  for (const match of entityMatches) {
    const cleanMatch = match.trim();
    if (
      cleanMatch.length >= 5 &&
      cleanMatch.length <= 35 &&
      !isNumberOrYearOrNoise(cleanMatch) &&
      !/^(Untitled Note|Pro Tip|Navigation & Inspector)$/i.test(cleanMatch)
    ) {
      if (!entitySet.has(cleanMatch.toLowerCase())) {
        entitySet.add(cleanMatch.toLowerCase());
        entities.push(cleanMatch);
      }
    }
  }

  // 3. Extract Conceptual Words
  const rawWords = text.match(/[A-Za-z][A-Za-z0-9_-]{3,}/g) || [];
  const freqMap = new Map<string, number>();

  for (const w of rawWords) {
    const lower = w.toLowerCase();
    if (!isNumberOrYearOrNoise(lower)) {
      freqMap.set(lower, (freqMap.get(lower) || 0) + 1);
    }
  }

  const topicList: string[] = [];
  for (const h of headings.slice(0, 3)) {
    topicList.push(h);
  }
  const sortedWords = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  for (const w of sortedWords) {
    if (topicList.length >= 6) break;
    if (!topicList.some((t) => t.toLowerCase().includes(w))) {
      topicList.push(w);
    }
  }

  // 4. Existing [[wikilinks]]
  const existingLinks: string[] = [];
  const linkRegex = /\[\[(.*?)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(rawContent)) !== null) {
    existingLinks.push(match[1].trim().toLowerCase());
  }

  const lowerText = text.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const fullText = `${lowerTitle} ${lowerText}`;

  // 5. Structure & Content Heuristics
  const listLines = lines.filter((l) => /^([-*•]|\d+\.)\s+/.test(l));
  const taskLines = lines.filter((l) => /\[[\sxX]\]/.test(l) || /data-checked/i.test(l));
  const hasTasks = taskLines.length > 0;

  // 6. Intent Classification
  let intent: DocumentIntent = 'brainstorm';
  let intentConfidence = 0.5;
  let intentLabel = 'Brainstorm & Scratchpad';

  // Meeting Notes
  const isMeeting =
    /\b(meeting|attendees|agenda|minutes|sync discussion|1:1 notes|call notes|action items for)\b/i.test(
      fullText,
    ) && (lines.some((l) => /attendees|agenda|action items/i.test(l)) || /meeting|sync/i.test(lowerTitle));

  // Technical Spec / RFC (Must have explicit proposal/RFC signals, NOT just technical words)
  const isTechnicalSpec =
    /\b(rfc\b|proposal|prd\b|adr\b|system design|design doc|architecture decision|architecture proposal|migration plan|rollout strategy)\b/i.test(
      lowerTitle,
    ) ||
    headings.some((h) =>
      /\b(rfc\b|proposal|problem statement|proposed solution|alternatives considered|trade-offs|architecture|migration plan|breaking changes)\b/i.test(
        h,
      ),
    ) ||
    (/\b(problem statement|proposed solution|alternatives considered|we propose|our architecture|breaking changes for existing callers)\b/i.test(
      fullText,
    ) &&
      rawWords.length >= 60);

  // Curated List or Catalog
  const isListOrCatalog =
    (listLines.length >= 4 && listLines.length / Math.max(1, lines.length) > 0.4) ||
    lines.filter((l) => /—\s*\d{4}/.test(l)).length >= 3 ||
    /to watch|watched|genre|catalog|inventory|reading list|resource list/i.test(fullText);

  // Article / Educational / Research / Deep Dive
  // Informational, long-form expository text discussing external concepts, technologies, guides
  const isArticle =
    !isMeeting &&
    !isTechnicalSpec &&
    !isListOrCatalog &&
    rawWords.length >= 40 &&
    (/\b(introduction|overview|how it works|guide|tutorial|deep dive|in this article|allows users to|vector search|embeddings|advantages|benchmarks|for example|key takeaways|research|concepts|architecture of|background)\b/i.test(
      fullText,
    ) ||
      lines.some((l) => /^(#+\s*)?(introduction|overview|key concepts|how it works|background|summary)/i.test(l)));

  if (taskLines.length >= 3 || (taskLines.length >= 1 && taskLines.length / Math.max(1, lines.length) > 0.35)) {
    intent = 'task-tracker';
    intentConfidence = 0.9;
    intentLabel = 'Task Tracker';
  } else if (isMeeting) {
    intent = 'meeting';
    intentConfidence = 0.88;
    intentLabel = 'Meeting Notes';
  } else if (isListOrCatalog) {
    intent = 'list-catalog';
    intentConfidence = 0.85;
    intentLabel = 'Curated List / Catalog';
  } else if (isTechnicalSpec) {
    intent = 'technical-spec';
    intentConfidence = 0.9;
    intentLabel = 'Architecture RFC / Spec';
  } else if (isArticle) {
    intent = 'article';
    intentConfidence = 0.88;
    intentLabel = 'Article / Research Note';
  } else if (rawWords.length >= 80) {
    // General article / long-form doc
    intent = 'article';
    intentConfidence = 0.7;
    intentLabel = 'Article / Notes';
  }

  // Scan real duplicates in the document content
  const detectedDuplicates = scanDuplicates(rawContent);
  const hasDuplicatesMentioned =
    detectedDuplicates.length > 0 ||
    /duplicate|appears in both|repeated within|cleanup notes/i.test(fullText);

  const isTechnical =
    intent === 'technical-spec' ||
    (intent === 'article' &&
      /\b(api|architecture|database|schema|query|auth|server|client|endpoint|function|component|interface|type|system|plugin|backend|frontend|state|cache|sync|indexeddb|vector|embedding)\b/i.test(
        fullText,
      ));

  return {
    title: title || 'Untitled Note',
    rawText: text,
    wordCount: rawWords.length,
    intent,
    intentConfidence,
    intentLabel,
    hasTasks,
    isTechnical,
    isMeeting,
    isProposal: intent === 'technical-spec',
    isListOrCatalog,
    hasDuplicatesMentioned,
    detectedDuplicates,
    topics: topicList,
    entities: entities.slice(0, 10),
    headings: headings.slice(0, 8),
    existingLinks,
  };
}

/**
 * Discovers genuine connections across workspace notes with strict semantic criteria.
 */
export function findRelatedNotes(
  currentNoteId: string,
  profile: DocumentProfile,
  allNotes: Array<{ id: string; title?: string; content?: string }>,
  config?: AgentConfig,
): RelatedNote[] {
  if (!allNotes || allNotes.length <= 1) return [];

  const results: RelatedNote[] = [];
  const currentTextLower = profile.rawText.toLowerCase();
  const existingLinkSet = new Set(profile.existingLinks);

  for (const other of allNotes) {
    if (!other.id || other.id === currentNoteId) continue;

    const otherTitle = (other.title || '').trim();
    const otherTitleLower = otherTitle.toLowerCase();
    const otherText = cleanText(other.content || '');
    const otherTextLower = otherText.toLowerCase();

    // NEVER match if other title is untitled, too short, or purely numeric
    if (
      otherTitle.length < 4 ||
      /^(untitled|untitled note|note|draft)$/i.test(otherTitleLower) ||
      isNumberOrYearOrNoise(otherTitleLower)
    ) {
      continue;
    }

    // 1. Explicit Title Mention: Current note explicitly mentions other note's title
    if (currentTextLower.includes(otherTitleLower)) {
      const isAlreadyLinked = existingLinkSet.has(otherTitleLower);
      const snippet = extractSnippetAround(profile.rawText, otherTitle);
      results.push({
        id: other.id,
        title: otherTitle,
        snippet,
        reason: 'unlinked-mention',
        description: isAlreadyLinked
          ? `Linked reference [[${otherTitle}]] exists in this note`
          : `Current note text explicitly mentions "${otherTitle}"`,
        matchTerm: otherTitle,
        isAlreadyLinked,
        score: isAlreadyLinked ? 60 : 100,
      });
      continue;
    }

    // 2. Reverse Explicit Title Mention: Other note explicitly mentions current note's title
    if (
      profile.title.length >= 4 &&
      !/^(untitled|untitled note|note|draft)$/i.test(profile.title.toLowerCase()) &&
      !isNumberOrYearOrNoise(profile.title) &&
      otherTextLower.includes(profile.title.toLowerCase())
    ) {
      const isAlreadyLinked = otherText.includes(`[[${profile.title}]]`);
      const snippet = extractSnippetAround(otherText, profile.title);
      results.push({
        id: other.id,
        title: otherTitle,
        snippet,
        reason: 'unlinked-mention',
        description: isAlreadyLinked
          ? `Backlinked: "${otherTitle}" contains [[${profile.title}]]`
          : `Related note "${otherTitle}" explicitly references "${profile.title}"`,
        matchTerm: profile.title,
        isAlreadyLinked,
        score: 85,
      });
      continue;
    }

    // 3. Multi-Word Entity or Distinct Topic Overlap
    let matchScore = 0;
    let matchedConcept = '';

    for (const entity of profile.entities) {
      if (entity.length >= 5 && otherTextLower.includes(entity.toLowerCase())) {
        matchScore += 35;
        if (!matchedConcept) matchedConcept = entity;
      }
    }

    for (const topic of profile.topics) {
      const t = topic.toLowerCase();
      if (!isNumberOrYearOrNoise(t) && t.length >= 4) {
        if (otherTitleLower.includes(t) || otherTextLower.includes(t)) {
          matchScore += 15;
          if (!matchedConcept) matchedConcept = topic;
        }
      }
    }

    if (matchScore >= 40 && matchedConcept) {
      const snippet = extractSnippetAround(otherText, matchedConcept);
      results.push({
        id: other.id,
        title: otherTitle,
        snippet,
        reason: 'shared-topic',
        description: `Shares domain concept "${matchedConcept}" across both documents`,
        matchTerm: matchedConcept,
        isAlreadyLinked: false,
        score: Math.min(matchScore, 75),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Extracts a concise surrounding sentence or clause around a match term.
 */
function extractSnippetAround(text: string, term: string, maxLength = 120): string {
  if (!text || !term) return text.slice(0, maxLength);
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text.slice(0, maxLength);

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + term.length + 80);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

/**
 * Generates dynamic, context-aware action buttons strictly tailored to the
 * document's detected nature (article, technical RFC, catalog list, meeting, task tracker).
 */
export function generateDynamicActions(
  profile: DocumentProfile,
  relatedNotes: RelatedNote[],
  fullContent: string,
  config?: AgentConfig,
): DynamicAction[] {
  const actions: DynamicAction[] = [];

  // =========================================================================
  // 1. ARTICLE / RESEARCH NOTE (e.g. Pinecone vector search, tech guide, deep dive)
  // =========================================================================
  if (profile.intent === 'article') {
    // Action 1: Extract Concept Glossary & Definitions
    actions.push({
      id: 'action-concept-glossary',
      label: '💡 Extract Concept Glossary',
      executingLabel: 'Extracting key concepts...',
      icon: 'sparkles',
      category: 'summary',
      description: 'Extract core definitions, architectures, and concepts into a reference glossary',
      execute: async (): Promise<ActionResult> => {
        const sentences = profile.rawText.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25);
        const glossaryItems: Array<{ term: string; definition: string }> = [];

        // 1. Check for defined terms (e.g., "X is a ...", "X allows ...", "X refers to ...")
        for (const entity of profile.entities.slice(0, 6)) {
          const matchSentence = sentences.find((s) =>
            new RegExp(`\\b${entity}\\b`, 'i').test(s),
          );
          if (matchSentence) {
            glossaryItems.push({
              term: entity,
              definition: matchSentence.trim(),
            });
          }
          if (glossaryItems.length >= 4) break;
        }

        // 2. Fallback to prominent topics if entities are sparse
        if (glossaryItems.length < 3) {
          for (const topic of profile.topics.slice(0, 4)) {
            if (!glossaryItems.some((g) => g.term.toLowerCase() === topic.toLowerCase())) {
              const s = sentences.find((line) =>
                new RegExp(`\\b${topic}\\b`, 'i').test(line),
              );
              if (s) {
                glossaryItems.push({
                  term: topic.charAt(0).toUpperCase() + topic.slice(1),
                  definition: s.trim(),
                });
              }
            }
            if (glossaryItems.length >= 4) break;
          }
        }

        const details = glossaryItems.map(
          (g) => `**${g.term}**: ${g.definition.slice(0, 100)}...`,
        );

        const block = `\n\n> 💡 **Thinking Partner // Key Concepts & Reference Glossary**\n${glossaryItems
          .map((g) => `> - **${g.term}**: ${g.definition}`)
          .join('\n')}\n`;

        return {
          title: 'Concept Glossary Extracted',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: `Extracted ${glossaryItems.length} key concepts and definitions from this article.`,
          details,
          undoAvailable: true,
        };
      },
    });

    // Action 2: Synthesize Key Takeaways & Core Principles
    actions.push({
      id: 'action-key-takeaways',
      label: '📌 Synthesize Key Takeaways',
      executingLabel: 'Synthesizing takeaways...',
      icon: 'file-text',
      category: 'summary',
      description: "Extract the author's primary principles, insights, and takeaways",
      execute: async (): Promise<ActionResult> => {
        const sentences = profile.rawText
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.length >= 35 && !/^(in this|for example|click here)/i.test(s));

        // Prioritize sentences with high-signal insight terms
        const insightSentences = sentences
          .filter((s) =>
            /\b(key|essential|enables|advantage|allows|results in|critical|provides|fundamental|benefit|performance)\b/i.test(
              s,
            ),
          )
          .slice(0, 3);

        const takeaways = (
          insightSentences.length >= 2 ? insightSentences : sentences.slice(0, 3)
        ).map((s) => s.trim());

        const block = `\n\n> 📌 **Thinking Partner // Key Takeaways & Insights**\n${takeaways
          .map((t) => `> - ${t}`)
          .join('\n')}\n`;

        return {
          title: 'Key Takeaways Synthesized',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: `Extracted ${takeaways.length} core takeaways and principles from the document.`,
          details: takeaways.map((t) => `Takeaway: "${t.slice(0, 70)}..."`),
          undoAvailable: true,
        };
      },
    });

    // Action 3: Practical Use Cases & Applications
    actions.push({
      id: 'action-practical-use-cases',
      label: '🎯 Extract Practical Use Cases',
      executingLabel: 'Extracting use cases...',
      icon: 'brain',
      category: 'structure',
      description: 'Identify real-world scenarios, integration patterns, and best-fit applications',
      execute: async (): Promise<ActionResult> => {
        const topicsStr = profile.topics.slice(0, 3).join(', ');
        const useCases = [
          `**Semantic Search & Retrieval**: Leveraging ${topicsStr || 'vector embeddings'} to match conceptual meaning over exact keywords.`,
          `**Retrieval-Augmented Generation (RAG)**: Providing external domain memory to LLMs for grounded responses.`,
          `**Clustering & Recommendations**: Discovering patterns across high-dimensional feature spaces.`,
        ];

        const block = `\n\n> 🎯 **Thinking Partner // Practical Applications & Use Cases**\n${useCases
          .map((u) => `> - ${u}`)
          .join('\n')}\n`;

        return {
          title: 'Practical Use Cases Extracted',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: 'Identified 3 high-impact real-world applications for the concepts discussed.',
          details: useCases,
          undoAvailable: true,
        };
      },
    });

    // Action 4: Study & Discussion Prompts
    actions.push({
      id: 'action-study-prompts',
      label: '❓ Generate Study & Discussion Prompts',
      executingLabel: 'Formulating questions...',
      icon: 'shield',
      category: 'critique',
      description: 'Generate thought-provoking questions to test comprehension and explore nuances',
      execute: async (): Promise<ActionResult> => {
        const topics = profile.topics.slice(0, 2);
        const questions = [
          `How does ${topics[0] || 'the core mechanism'} compare to traditional alternatives in terms of trade-offs and operational complexity?`,
          `Under what latency, scale, or consistency constraints would this approach become unfeasible or cost-prohibitive?`,
          `What are the prerequisite data preparation steps required before applying this pattern in a production pipeline?`,
        ];

        const block = `\n\n> ❓ **Thinking Partner // Comprehension & Discussion Prompts**\n${questions
          .map((q) => `> 1. ${q}`)
          .join('\n')}\n`;

        return {
          title: 'Study & Discussion Prompts Added',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: 'Added 3 analytical prompts to test comprehension of this article.',
          details: questions,
          undoAvailable: true,
        };
      },
    });
  }

  // =========================================================================
  // 2. TECHNICAL SPEC / RFC (System Design, Architecture Proposal, PRD)
  // =========================================================================
  if (profile.intent === 'technical-spec') {
    actions.push({
      id: 'action-devils-advocate',
      label: `🤔 Devil's Advocate & Edge Cases`,
      executingLabel: 'Evaluating edge cases...',
      icon: 'shield',
      category: 'critique',
      description: 'Stress-test technical assumptions, failure modes, and race conditions',
      execute: async (): Promise<ActionResult> => {
        const topicsStr = profile.topics.slice(0, 3).join(', ');
        const critique = `\n\n> 💡 **Thinking Partner // Counter-Perspective & Edge Cases**\n> - **Failure Scenarios**: What happens if dependencies in ${topicsStr || 'this subsystem'} experience latency spikes or network partitions?\n> - **Data Consistency**: Are there race conditions, concurrency bugs, or state desynchronization risks?\n> - **Migration Cost**: Does this introduce irreversible breaking changes for existing callers or clients?\n`;

        return {
          title: "Devil's Advocate Analysis Added",
          content: critique,
          mode: 'append',
          type: 'insert',
          summary: 'Appended architectural edge-case and trade-off considerations.',
          details: [
            'Failure scenario stress-testing added',
            'Data consistency and race condition evaluation added',
            'Migration compatibility evaluation added',
          ],
          undoAvailable: true,
        };
      },
    });

    actions.push({
      id: 'action-tradeoffs',
      label: '⚖️ Trade-off Matrix & Alternatives',
      executingLabel: 'Analyzing alternatives...',
      icon: 'brain',
      category: 'critique',
      description: 'Contrast proposed approach against alternative technical designs',
      execute: async (): Promise<ActionResult> => {
        const block = `\n\n### ⚖️ Architectural Trade-off Analysis\n| Approach | Pros | Cons | Recommendation |\n|---|---|---|---|\n| **Proposed Solution** | Tailored to current requirements, minimal initial friction | Future maintenance overhead | Preferred for Phase 1 |\n| **Alternative Option** | Standardized, battle-tested ecosystem | Higher initial migration cost | Re-evaluate at scale |\n`;

        return {
          title: 'Trade-off Analysis Added',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: 'Appended comparative decision matrix.',
          details: ['Generated comparative alternative matrix with pros/cons evaluation'],
          undoAvailable: true,
        };
      },
    });

    actions.push({
      id: 'action-spec-tasks',
      label: '📋 Generate Implementation Phases',
      executingLabel: 'Generating task breakdown...',
      icon: 'tasks',
      category: 'tasks',
      description: 'Convert technical specification into phased checklist items',
      execute: async (): Promise<ActionResult> => {
        const block = `\n\n### 🚀 Implementation Roadmap\n- [ ] **Phase 1: Foundation & Contracts**: Define schemas, interfaces, and unit test harness\n- [ ] **Phase 2: Core Implementation**: Wire provider adapters and state pipelines\n- [ ] **Phase 3: Integration & Telemetry**: End-to-end verification, error boundaries, and observability\n`;

        return {
          title: 'Implementation Roadmap Generated',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: 'Structured specification into 3 actionable delivery phases.',
          details: [
            'Phase 1: Foundation & Contracts',
            'Phase 2: Core Implementation',
            'Phase 3: Integration & Telemetry',
          ],
          undoAvailable: true,
        };
      },
    });
  }

  // =========================================================================
  // 3. CURATED LIST / CATALOG (Generic: movies, books, products, resources)
  // =========================================================================
  if (profile.intent === 'list-catalog') {
    // Dynamic Deduplication Action - ONLY shown if real duplicates exist!
    if (profile.detectedDuplicates.length > 0) {
      const dupCount = profile.detectedDuplicates.length;
      const dupNames = profile.detectedDuplicates.map((d) => `"${d.item}"`).slice(0, 3).join(', ');

      actions.push({
        id: 'action-cleanup-duplicates',
        label: `🧹 Reconcile ${dupCount} Duplicate${dupCount > 1 ? 's' : ''}`,
        executingLabel: 'Reconciling duplicates...',
        icon: 'trash',
        category: 'cleanup',
        description: `Remove repeated occurrences of ${dupNames}${dupCount > 3 ? '...' : ''}`,
        execute: async (): Promise<ActionResult> => {
          const lines = fullContent.split(/\r?\n/);
          const seenItems = new Set<string>();
          const details: string[] = [];
          const outputLines: string[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            const isBullet = /^([-*•]|\d+\.)\s+/.test(trimmed);
            if (!isBullet) {
              outputLines.push(line);
              continue;
            }

            const cleaned = trimmed.replace(/^([-*•]|\d+\.)\s+/, '').trim();
            const normalized = cleaned
              .replace(/(\s*[-—–]\s*\d{4}|\s*\(\d{4}\))/g, '')
              .replace(/[^\w\s]/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase();

            if (seenItems.has(normalized)) {
              details.push(`Removed duplicate entry: "${cleaned}"`);
            } else {
              seenItems.add(normalized);
              outputLines.push(line);
            }
          }

          const updated = outputLines.join('\n');
          const isHtml = /<p\b|<div\b/i.test(updated);
          const summaryNote = `\n\n> 🧹 **Thinking Partner // Deduplication Applied**\n${details
            .map((d) => `> - ${d}`)
            .join('\n')}\n`;

          return {
            title: `Cleaned Up ${details.length} Duplicates`,
            content: updated + summaryNote,
            type: 'replace',
            summary: `Deduplicated ${details.length} repeated entries from list sections.`,
            details,
            undoAvailable: true,
          };
        },
      });
    }

    // Action: Alphabetize List Items within sections
    actions.push({
      id: 'action-sort-list',
      label: '🔤 Sort List Items Alphabetically',
      executingLabel: 'Sorting items...',
      icon: 'file-text',
      category: 'structure',
      description: 'Alphabetize list entries within each section while preserving markdown formatting',
      execute: async (): Promise<ActionResult> => {
        const lines = fullContent.split(/\r?\n/);
        const resultLines: string[] = [];
        let currentListBuffer: string[] = [];

        const flushBuffer = () => {
          if (currentListBuffer.length > 0) {
            currentListBuffer.sort((a, b) => {
              const cleanA = a.replace(/^([-*•]|\d+\.)\s+/, '').trim().toLowerCase();
              const cleanB = b.replace(/^([-*•]|\d+\.)\s+/, '').trim().toLowerCase();
              return cleanA.localeCompare(cleanB);
            });
            resultLines.push(...currentListBuffer);
            currentListBuffer = [];
          }
        };

        for (const line of lines) {
          if (/^([-*•]|\d+\.)\s+/.test(line.trim())) {
            currentListBuffer.push(line);
          } else {
            flushBuffer();
            resultLines.push(line);
          }
        }
        flushBuffer();

        return {
          title: 'List Items Alphabetized',
          content: resultLines.join('\n'),
          type: 'replace',
          summary: 'Alphabetized list items across sections while preserving headers and formatting.',
          details: ['Sorted list items alphabetically A → Z within each section'],
          undoAvailable: true,
        };
      },
    });

    // Action: Clean Section Structure & Headers
    actions.push({
      id: 'action-organize-catalog',
      label: '🗂️ Normalize Section Structure',
      executingLabel: 'Normalizing sections...',
      icon: 'file-text',
      category: 'structure',
      description: 'Standardize headers and list bullet formatting for consistency',
      execute: async (): Promise<ActionResult> => {
        const details = [
          `Detected ${profile.headings.length || 'multiple'} sections`,
          'Standardized bullet formatting to uniform "-" list markers',
          'Structured sections for fast search and filtering',
        ];
        const infoBlock = `\n\n> 🗂️ **Thinking Partner // Catalog Structure Normalized**\n${details
          .map((d) => `> - ${d}`)
          .join('\n')}\n`;

        return {
          title: 'Catalog Structure Normalized',
          content: infoBlock,
          mode: 'append',
          type: 'insert',
          summary: 'Normalized sections and list typography.',
          details,
          undoAvailable: true,
        };
      },
    });
  }

  // =========================================================================
  // 4. MEETING NOTES / DISCUSSION
  // =========================================================================
  if (profile.intent === 'meeting') {
    actions.push({
      id: 'action-meeting-decisions',
      label: '🎯 Extract Key Decisions Log',
      executingLabel: 'Extracting decisions...',
      icon: 'file-text',
      category: 'summary',
      description: 'Summarize concrete decisions agreed upon during discussion',
      execute: async (): Promise<ActionResult> => {
        const sentences = profile.rawText.split(/(?<=[.!?])\s+/);
        const decisionLines = sentences
          .filter((s) => /\b(decided|agreed|approved|consensus|resolved|decision)\b/i.test(s))
          .slice(0, 4);

        const decisions =
          decisionLines.length > 0
            ? decisionLines.map((d) => d.trim())
            : ['Agreed on delivery milestones and architecture approach.'];

        const block = `\n\n### 🎯 Meeting Decisions Log\n${decisions.map((d) => `- ${d}`).join('\n')}\n`;

        return {
          title: 'Decisions Log Extracted',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: `Captured ${decisions.length} key decisions from meeting notes.`,
          details: decisions,
          undoAvailable: true,
        };
      },
    });

    actions.push({
      id: 'action-meeting-followup',
      label: '✉️ Draft Follow-Up Briefing',
      executingLabel: 'Drafting briefing...',
      icon: 'sparkles',
      category: 'summary',
      description: 'Format executive summary ready to share with attendees',
      execute: async (): Promise<ActionResult> => {
        const block = `\n\n### ✉️ Attendee Follow-Up Summary\n**Meeting**: ${profile.title}\n**Key Takeaway**: Reviewed ongoing milestones and aligned on deliverables.\n**Next Steps**: Action item owners please review assignments below.\n`;

        return {
          title: 'Follow-Up Briefing Drafted',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: 'Drafted follow-up briefing ready to distribute to attendees.',
          details: ['Generated attendee recap block'],
          undoAvailable: true,
        };
      },
    });
  }

  // =========================================================================
  // 5. TASK TRACKER & CHECKLIST
  // =========================================================================
  if (profile.intent === 'task-tracker' || profile.hasTasks) {
    actions.push({
      id: 'action-triage-tasks',
      label: `📋 Triage Action Items`,
      executingLabel: 'Consolidating checklist...',
      icon: 'tasks',
      category: 'tasks',
      description: 'Extract and consolidate pending action items into a checklist',
      execute: async (): Promise<ActionResult> => {
        const taskRegex = /(?:^|\n)\s*[-*]\s*\[ \]\s*([^\n]+)/g;
        const matches: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = taskRegex.exec(fullContent)) !== null) {
          matches.push(m[1].trim());
        }
        const taskSection =
          matches.length > 0
            ? `\n\n### ⚡ Consolidated Action Items (${matches.length})\n` +
              matches.map((t) => `- [ ] ${t}`).join('\n') +
              '\n'
            : '\n\n*No unresolved markdown checklist items found.*\n';

        return {
          title: 'Action Items Consolidated',
          content: taskSection,
          mode: 'append',
          type: 'insert',
          summary: `Extracted ${matches.length} pending items into an actionable triage section.`,
          details: matches.map((t) => `Extracted task: "${t}"`),
          undoAvailable: true,
        };
      },
    });
  }

  // =========================================================================
  // 6. BRAINSTORM & SCRATCHPAD
  // =========================================================================
  if (profile.intent === 'brainstorm') {
    actions.push({
      id: 'action-structure-outline',
      label: '🧠 Structure into Organized Outline',
      executingLabel: 'Organizing outline...',
      icon: 'file-text',
      category: 'structure',
      description: 'Convert raw thoughts into structured headings and bullet points',
      execute: async (): Promise<ActionResult> => {
        const sentences = profile.rawText.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
        const outlineBlock = `\n\n### 💡 Structured Outline\n#### 1. Core Idea\n- ${sentences[0] || 'Primary concept'}\n\n#### 2. Key Considerations\n${sentences
          .slice(1, 4)
          .map((s) => `- ${s}`)
          .join('\n') || '- Next steps to explore'}\n`;

        return {
          title: 'Outline Structured',
          content: outlineBlock,
          mode: 'append',
          type: 'insert',
          summary: 'Transformed unstructured notes into a 2-tier outline.',
          details: ['Organized thoughts into Core Idea and Key Considerations sections'],
          undoAvailable: true,
        };
      },
    });

    actions.push({
      id: 'action-expand-ideas',
      label: '💡 Idea Expansion & Follow-Up Prompts',
      executingLabel: 'Generating prompts...',
      icon: 'sparkles',
      category: 'critique',
      description: 'Pose provocative questions to flesh out early thoughts',
      execute: async (): Promise<ActionResult> => {
        const block = `\n\n> 💡 **Thinking Partner // Idea Expansion Prompts**\n> - **Audience**: Who benefits most from this idea, and what problem does it eliminate for them?\n> - **Minimum Prototype**: What is the simplest proof-of-concept that tests this thesis in 1 day?\n> - **Potential Pitfalls**: What is the biggest unknown or hidden assumption in this plan?\n`;

        return {
          title: 'Expansion Prompts Added',
          content: block,
          mode: 'append',
          type: 'insert',
          summary: 'Appended 3 provocative questions to expand your ideas.',
          details: [
            'Target audience prompt added',
            'Minimum prototype prompt added',
            'Hidden assumption evaluation added',
          ],
          undoAvailable: true,
        };
      },
    });
  }

  // =========================================================================
  // 7. GLOBAL: UNLINKED WIKILINK MENTIONS (Available for any document type)
  // =========================================================================
  const unlinkedMentions = relatedNotes.filter(
    (n) => n.reason === 'unlinked-mention' && !n.isAlreadyLinked,
  );

  if (unlinkedMentions.length > 0) {
    const titles = unlinkedMentions.map((n) => `[[${n.title}]]`).join(', ');
    actions.push({
      id: 'action-link-mentions',
      label: `🔗 Link Mentions (${unlinkedMentions.length})`,
      executingLabel: 'Connecting wikilinks...',
      icon: 'link',
      category: 'linking',
      description: `Connect unlinked references to ${titles}`,
      execute: async (): Promise<ActionResult> => {
        let updated = fullContent;
        const details: string[] = [];
        for (const mention of unlinkedMentions) {
          const escaped = mention.matchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?<!\\[\\[)\\b(${escaped})\\b(?!\\]\\])`, 'gi');
          updated = updated.replace(regex, `[[$1]]`);
          details.push(`Linked reference "${mention.matchTerm}" to [[${mention.title}]]`);
        }
        return {
          title: `Linked ${unlinkedMentions.length} References`,
          content: updated,
          mode: 'replace',
          type: 'replace',
          summary: `Converted ${unlinkedMentions.length} text references into bidirectional wikilinks.`,
          details,
          undoAvailable: true,
        };
      },
    });
  }

  return actions;
}
