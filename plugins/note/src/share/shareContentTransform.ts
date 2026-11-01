import { markdownToHtml, htmlToMarkdown } from '../editor/markdownUtils'

const MARKDOWN_PATTERNS = [
  /^#{1,6}\s+/m,
  /\*\*.*?\*\*/,
  /\*[^*].*?\*[^*]/,
  /`[^`]+`/,
  /```[\s\S]*?```/,
  /\[.+?\]\(.+?\)/,
  /^\s*[-*+]\s+/m,
  /^\s*\d+\.\s+/m,
  /^\>\s+/m,
  /^[-*_]{3,}$/m,
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.trim() === '') return false
  return MARKDOWN_PATTERNS.some((pattern) => pattern.test(text))
}

export function toEditorHtml(value: string): string {
  if (!value || value.trim() === '') return '<p></p>'

  const hasHtmlTags = /<\/?[a-z][\w:-]*(\s[^>]*)?>/i.test(value)
  if (hasHtmlTags) {
    const markdown = htmlToMarkdown(value)
    const html = markdownToHtml(markdown || '')

    if (!html || html.trim() === '' || html.trim() === '<p></p>') {
      return (
        value
          .split('\n\n')
          .filter((para) => para.trim())
          .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
          .join('\n') || '<p></p>'
      )
    }
    return html
  }

  if (looksLikeMarkdown(value)) {
    return markdownToHtml(value)
  }

  return (
    value
      .split('\n\n')
      .filter((para) => para.trim())
      .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
      .join('\n') || '<p></p>'
  )
}
