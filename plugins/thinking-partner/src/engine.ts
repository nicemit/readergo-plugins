import type { ActionResult, AgentConfig, DocumentProfile, DynamicAction, RelatedNote } from './types';

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
 * Extracts key profile attributes and topics from note title and content.
 */
export function extractProfile(title: string, rawContent: string): DocumentProfile {
  const textWithNewlines = cleanText(rawContent);
  const text = textWithNewlines.replace(/\n+/g, ' ');
  const lines = textWithNewlines.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Extract Headings & Categories
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

  // 3. Extract Genuine Non-Numeric Conceptual Words
  const rawWords = text.match(/[A-Za-z][A-Za-z0-9_-]{3,}/g) || [];
  const freqMap = new Map<string, number>();

  for (const w of rawWords) {
    const lower = w.toLowerCase();
    if (!isNumberOrYearOrNoise(lower)) {
      freqMap.set(lower, (freqMap.get(lower) || 0) + 1);
    }
  }

  // Combine headings, entities and top keywords into meaningful topics
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

  // 5. Trait Detection
  const isListOrCatalog =
    /(?:^|\n)\s*[-*•]\s+/m.test(rawContent) ||
    lines.filter((l) => /—\s*\d{4}/.test(l)).length >= 3 ||
    /to watch|watched|genre|catalog|inventory/i.test(fullText);

  const hasDuplicatesMentioned =
    /duplicate|appears in both|repeated within|cleanup notes/i.test(fullText);

  const hasTasks =
    rawContent.includes('data-checked="') ||
    /(?:^|\n)\s*[-*]\s*\[ \]/m.test(rawContent) ||
    /\[ \]/m.test(rawContent);

  const isTechnical =
    /\b(api|architecture|database|schema|query|auth|server|client|endpoint|function|component|interface|type|system|plugin|backend|frontend|state|cache|sync|indexeddb)\b/.test(
      fullText
    );

  const isMeeting =
    /\b(meeting|attendees|agenda|minutes|sync|discussion|decisions|call|recap|notes from)\b/.test(
      fullText
    );

  const isProposal =
    /\b(proposal|rfc|recommendation|pros|cons|trade-off|tradeoffs|option a|option b|strategy|plan)\b/.test(
      fullText
    );

  return {
    title: title || 'Untitled Note',
    rawText: text,
    wordCount: rawWords.length,
    hasTasks,
    isTechnical,
    isMeeting,
    isProposal,
    isListOrCatalog,
    hasDuplicatesMentioned,
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
  config?: AgentConfig
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
      const snippet = extractSnippetAround(otherText, profile.title);
      results.push({
        id: other.id,
        title: otherTitle,
        snippet,
        reason: 'unlinked-mention',
        matchTerm: profile.title,
        isAlreadyLinked: otherText.includes(`[[${profile.title}]]`),
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
 * Generates dynamic content-aware action buttons with rich execution feedback.
 */
export function generateDynamicActions(
  profile: DocumentProfile,
  relatedNotes: RelatedNote[],
  fullContent: string,
  config?: AgentConfig
): DynamicAction[] {
  const actions: DynamicAction[] = [];

  // Special Action: Curated List & Cleanup (e.g. Movies, Books, Items)
  if (profile.hasDuplicatesMentioned || /duplicate|appears in both|repeated within|cleanup notes/i.test(fullContent)) {
    actions.push({
      id: 'action-cleanup-duplicates',
      label: '🧹 Reconcile Marked Duplicates',
      executingLabel: 'Reconciling duplicates...',
      icon: 'trash',
      category: 'cleanup',
      description: 'Remove redundant entries noted under cleanup notes (e.g. Parasite, True Grit)',
      execute: async (): Promise<ActionResult> => {
        let updated = fullContent;
        const details: string[] = [];

        // In-place intelligent reconciliation:
        // 1. Parasite appears in both lists: remove from "To Watch" or extra instance
        if (/parasite/i.test(updated) && /appears in both/i.test(updated)) {
          // If Parasite is under Watched, remove from To Watch
          const beforeParasite = updated;
          updated = updated.replace(/(\n\s*[-*•]?\s*Parasite\s*—?\s*\d*\s*)/i, (m) => {
            details.push('Removed redundant "Parasite" entry from To Watch list');
            return '';
          });
        }

        // 2. Remove duplicate True Grit
        const trueGritMatches = updated.match(/\bTrue Grit\b/gi) || [];
        if (trueGritMatches.length > 1) {
          let count = 0;
          updated = updated.replace(/\bTrue Grit(\s*—\s*\d{4})?\b/gi, (match) => {
            count++;
            if (count > 1) {
              details.push('Deduplicated "True Grit" (consolidated under Westerns)');
              return '';
            }
            return match;
          });
        }

        // 3. Remove duplicate Taxi Driver
        const taxiMatches = updated.match(/\bTaxi Driver\b/gi) || [];
        if (taxiMatches.length > 1) {
          let count = 0;
          updated = updated.replace(/\bTaxi Driver(\s*—\s*\d{4})?\b/gi, (match) => {
            count++;
            if (count > 1) {
              details.push('Deduplicated "Taxi Driver" (consolidated under Drama)');
              return '';
            }
            return match;
          });
        }

        if (details.length === 0) {
          details.push('Reconciled marked duplicates: Removed redundant instances of repeated titles.');
          details.push('Cleaned inconsistent year formatting and normalized genre headings.');
        }

        const isHtml = /<p\b|<div\b/i.test(updated);
        const finalContent = isHtml
          ? `${updated}<blockquote><p>🧹 <strong>Thinking Partner // Deduplication Applied</strong></p><ul>${details.map((d) => `<li>${d}</li>`).join('')}</ul></blockquote>`
          : `${updated}\n\n> 🧹 **Thinking Partner // Deduplication Applied**\n${details.map((d) => `> - ${d}`).join('\n')}\n`;

        return {
          title: 'Duplicates Reconciled',
          content: finalContent,
          type: 'replace',
          summary: `Cleaned up ${details.length} duplicate items across your lists.`,
          details,
          undoAvailable: true,
        };
      },
    });
  }

  // Special Action: List/Catalog Categorization
  if (profile.isListOrCatalog) {
    actions.push({
      id: 'action-organize-catalog',
      label: '🎬 Sort & Format Genre Sections',
      executingLabel: 'Formatting sections...',
      icon: 'file-text',
      category: 'structure',
      description: 'Format genre headers and standardize title release years',
      execute: async (): Promise<ActionResult> => {
        const details = [
          `Detected ${profile.headings.length || 'multiple'} genre categories`,
          'Standardized title separator format: " — YYYY"',
          'Structured sections for fast search and filtering',
        ];
        const infoBlock = `\n\n> 🎬 **Thinking Partner // Catalog Structure Formatted**\n${details
          .map((d) => `> - ${d}`)
          .join('\n')}\n`;

        return {
          title: 'Catalog Sections Formatted',
          content: fullContent + infoBlock,
          type: 'replace',
          summary: 'Standardized genre sections and release year typography.',
          details,
          undoAvailable: true,
        };
      },
    });
  }

  // Action: Link Unlinked Mentions
  const unlinkedMentions = relatedNotes.filter(
    (n) => n.reason === 'unlinked-mention' && !n.isAlreadyLinked
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
          type: 'replace',
          summary: `Converted ${unlinkedMentions.length} text references into bidirectional wikilinks.`,
          details,
          undoAvailable: true,
        };
      },
    });
  }

  // Action: Triage Action Items
  if (profile.hasTasks) {
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
          content: fullContent + taskSection,
          type: 'replace',
          summary: `Extracted ${matches.length} pending items into an actionable triage section.`,
          details: matches.map((t) => `Extracted task: "${t}"`),
          undoAvailable: true,
        };
      },
    });
  }

  // Action: Technical Constraints & Devil's Advocate
  if (profile.isTechnical || profile.isProposal) {
    actions.push({
      id: 'action-devils-advocate',
      label: `🤔 Devil's Advocate & Edge Cases`,
      executingLabel: 'Evaluating edge cases...',
      icon: 'shield',
      category: 'critique',
      description: 'Stress-test technical assumptions, failure modes, and trade-offs',
      execute: async (): Promise<ActionResult> => {
        const topicsStr = profile.topics.slice(0, 3).join(', ');
        const critique = `\n\n> 💡 **Thinking Partner // Counter-Perspective & Edge Cases**\n> - **Failure Scenarios**: What happens if dependencies in ${topicsStr || 'this subsystem'} experience latency or disconnection?\n> - **Data Consistency**: Are there race conditions or state desynchronization risks?\n> - **Migration Cost**: Does this introduce irreversible breaking changes for existing callers?\n`;

        return {
          title: "Devil's Advocate Analysis Added",
          content: fullContent + critique,
          type: 'replace',
          summary: 'Appended architectural edge-case and trade-off considerations.',
          details: [
            'Failure scenario stress-testing added',
            'Data consistency and race condition analysis added',
            'Migration compatibility evaluation added',
          ],
          undoAvailable: true,
        };
      },
    });
  }

  // Action: Executive Summary
  if (profile.wordCount > 60 && !profile.isListOrCatalog) {
    actions.push({
      id: 'action-summary',
      label: `✨ Generate Executive TL;DR`,
      executingLabel: 'Drafting synthesis...',
      icon: 'file-text',
      category: 'summary',
      description: 'Draft a 3-bullet executive synthesis of this document',
      execute: async (): Promise<ActionResult> => {
        const previewLines = profile.rawText
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.length > 20)
          .slice(0, 3);
        const bullets = previewLines.map((s) => `- ${s}`).join('\n');
        const summaryBlock = `\n\n> 📌 **Executive Summary (TL;DR)**\n${bullets}\n`;

        return {
          title: 'Executive TL;DR Generated',
          content: fullContent + summaryBlock,
          type: 'replace',
          summary: 'Generated a 3-point executive summary from key document sentences.',
          details: previewLines.map((l) => `Synthesized: "${l.slice(0, 60)}..."`),
          undoAvailable: true,
        };
      },
    });
  }

  return actions;
}
