export type HeadingItem = {
  id: string
  text: string
  level: number
}

export type DocumentStats = {
  words: number
  characters: number
  headings: HeadingItem[]
  readingMinutes: number
}

const WORDS_PER_MINUTE = 220

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function parseHeadings(html: string): HeadingItem[] {
  if (!html || typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const nodes = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
  return Array.from(nodes).map((element, index) => ({
    id: element.getAttribute('data-heading-id') || `heading-${index}`,
    text: (element.textContent || '').trim() || `Heading ${index + 1}`,
    level: Number.parseInt(element.tagName.charAt(1), 10) || 1,
  }))
}

export function summarizeDocument(html: string): DocumentStats {
  const text = stripHtml(html || '')
  const words = countWords(text)
  return {
    words,
    characters: text.length,
    headings: parseHeadings(html || ''),
    readingMinutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
  }
}
