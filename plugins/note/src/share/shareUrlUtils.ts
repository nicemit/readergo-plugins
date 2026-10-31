const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s<>"')\]]+/i

export function isLikelyUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractFirstUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (isLikelyUrl(trimmed)) {
    return trimmed
  }

  const match = trimmed.match(URL_IN_TEXT_PATTERN)
  return match?.[0] ?? null
}

export function resolveShareUrl(...candidates: Array<string | undefined | null>): string {
  for (const candidate of candidates) {
    const value = (candidate || '').trim()
    if (!value) continue
    if (isLikelyUrl(value)) return value
    const extracted = extractFirstUrl(value)
    if (extracted) return extracted
  }
  return ''
}

export function stripUrlFromText(text: string, url: string): string {
  const trimmedText = text.trim()
  const trimmedUrl = url.trim()
  if (!trimmedText || !trimmedUrl) return trimmedText

  if (trimmedText === trimmedUrl) return ''

  return trimmedText
    .replace(trimmedUrl, '')
    .replace(URL_IN_TEXT_PATTERN, '')
    .trim()
}
