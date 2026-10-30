import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function markdownToHtml(markdown: string): string {
  try {
    let html = marked.parse(markdown) as string
    html = html.replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/g, '<li>$1</li>')
    return html
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return markdown
  }
}

export const htmlToMarkdown = (html: string): string => {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<table[^>]*>(.*?)<\/table>/gi, (match, content) => {
      const rows = content.match(/<tr[^>]*>(.*?)<\/tr>/gi) || []
      const markdownRows = rows.map((row: string) => {
        const cells = row.match(/<(th|td)[^>]*>(.*?)<\/(th|td)>/gi) || []
        const markdownCells = cells.map((cell: string) => {
          return cell.replace(/<[^>]*>/g, '').trim()
        })
        return '| ' + markdownCells.join(' | ') + ' |'
      })
      if (markdownRows.length > 0) {
        const headerCells = rows[0].match(/<(th|td)[^>]*>(.*?)<\/(th|td)>/gi) || []
        const separator = '| ' + headerCells.map(() => '---').join(' | ') + ' |'
        markdownRows.splice(1, 0, separator)
      }
      return '\n' + markdownRows.join('\n') + '\n\n'
    })
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n\n')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export const insertMarkdownContent = (
  editor: { chain: () => { focus: () => { insertContent: (content: string) => { run: () => void } } } } | null,
  markdown: string
) => {
  if (editor) {
    editor.chain().focus().insertContent(markdown).run()
  }
}

export const insertDateTime = (
  editor: { chain: () => { focus: () => { insertContent: (content: string) => { run: () => void } } } } | null
) => {
  if (editor) {
    const now = new Date()
    const dateTime = now.toLocaleString()
    editor.chain().focus().insertContent(dateTime).run()
  }
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
