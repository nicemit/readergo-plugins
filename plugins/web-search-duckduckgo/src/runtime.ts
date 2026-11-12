/**
 * DuckDuckGo HTML search provider. Free, no API key.
 */
import type {
  RuntimePlugin,
  WebSearchCapability,
  WebSearchHit,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
} from '@readergo/plugin-contracts';
import { WEB_SEARCH_CAPABILITY_ID } from '@readergo/plugin-contracts';

export const DUCKDUCKGO_WEB_SEARCH_ID = 'duckduckgo';
const SEARCH_URL = 'https://html.duckduckgo.com/html/';
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;
const USER_AGENT =
  'Mozilla/5.0 (compatible; ReaderGo/0.1; +https://github.com/readergo)';

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, ' '));
}

function unwrapDuckRedirect(href: string): string {
  try {
    const url = new URL(href, SEARCH_URL);
    if (url.hostname.endsWith('duckduckgo.com') && url.pathname === '/l/') {
      const uddg = url.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);
    }
    return url.toString();
  } catch {
    return href;
  }
}

function parseResults(html: string, limit: number): WebSearchHit[] {
  const results: WebSearchHit[] = [];
  const blockRe =
    /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*result|<\/div>\s*<\/div>\s*<\/form>|$)/gi;
  const linkRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
  const snippetRe =
    /<(?:a|td)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td)>/i;

  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null && results.length < limit) {
    const block = match[1] ?? '';
    const link = linkRe.exec(block);
    if (!link) continue;
    const href = unwrapDuckRedirect(decodeHtml(link[1] ?? ''));
    const title = stripTags(link[2] ?? '');
    if (!href || !title || !/^https?:\/\//i.test(href)) continue;
    if (href.includes('duckduckgo.com')) continue;
    const snippetMatch = snippetRe.exec(block);
    const snippet = snippetMatch ? stripTags(snippetMatch[1] ?? '') : '';
    results.push({ title, url: href, snippet });
  }

  if (results.length > 0) return results;

  // Fallback: scan all result__a anchors when block regex misses layout changes.
  const anchorRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = anchorRe.exec(html)) !== null && results.length < limit) {
    const href = unwrapDuckRedirect(decodeHtml(match[1] ?? ''));
    const title = stripTags(match[2] ?? '');
    if (!href || !title || !/^https?:\/\//i.test(href)) continue;
    if (href.includes('duckduckgo.com')) continue;
    results.push({ title, url: href, snippet: '' });
  }
  return results;
}

function createDuckDuckGoSearch(): WebSearchProvider {
  return {
    id: DUCKDUCKGO_WEB_SEARCH_ID,
    name: 'DuckDuckGo',
    async search(req: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
      const query = String(req.query ?? '').trim();
      if (!query) {
        return { providerId: DUCKDUCKGO_WEB_SEARCH_ID, results: [] };
      }
      const limit = Math.min(
        Math.max(1, typeof req.limit === 'number' ? req.limit : DEFAULT_LIMIT),
        MAX_LIMIT,
      );
      const body = new URLSearchParams({ q: query });
      const response = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: body.toString(),
        signal,
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error(
          `DuckDuckGo search failed (${response.status}): ${response.statusText}`,
        );
      }
      const html = await response.text();
      if (/anomaly|captcha|bot.?check/i.test(html) && !/result__a/i.test(html)) {
        throw new Error('DuckDuckGo blocked the search request (bot check)');
      }
      const results = parseResults(html, limit);
      if (results.length === 0) {
        throw new Error('DuckDuckGo returned no parseable results');
      }
      return { providerId: DUCKDUCKGO_WEB_SEARCH_ID, results };
    },
  };
}

const plugin: RuntimePlugin = {
  manifest: {
    id: 'readergo.web-search.duckduckgo',
    name: 'Web Search (DuckDuckGo)',
    version: '0.1.0',
    sdkVersion: '0.1.0',
    description: 'Free DuckDuckGo web search for agents. No API key.',
    category: 'ai',
    provides: ['web-search.duckduckgo'],
    requires: [WEB_SEARCH_CAPABILITY_ID],
    permissions: ['ai:use', 'network:request'],
    trust: 'trusted',
    source: 'external',
  },
  async activate(context) {
    const registry = await context.getCapability<WebSearchCapability>(
      WEB_SEARCH_CAPABILITY_ID,
    );
    if (!registry) throw new Error('web-search capability is not available');
    registry.register(createDuckDuckGoSearch());
    context.log.info('DuckDuckGo web search registered');
  },
};

export default plugin;
