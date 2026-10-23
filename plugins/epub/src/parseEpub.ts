import JSZip from 'jszip'
import type { EpubBook, EpubChapter, EpubTocItem } from './types'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
const MAX_INLINE_IMAGE_BYTES = 200_000

function localName(name: string): string {
  const parts = name.split(':')
  return parts[parts.length - 1]!.toLowerCase()
}

function childrenByName(parent: Element, name: string): Element[] {
  return [...parent.getElementsByTagName('*')].filter((node) => localName(node.tagName) === name)
}

function firstByName(parent: ParentNode, name: string): Element | null {
  const all = parent instanceof Element ? parent.getElementsByTagName('*') : (parent as Document).getElementsByTagName('*')
  for (const node of all) {
    if (localName(node.tagName) === name) return node
  }
  return null
}

function textOf(el: Element | null): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim()
}

function parseXml(source: string): Document {
  return new DOMParser().parseFromString(source, 'application/xml')
}

export function dirname(path: string): string {
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}

export function splitEpubHref(href: string): { path: string; hash: string } {
  const trimmed = href.trim()
  const hashIndex = trimmed.indexOf('#')
  if (hashIndex === -1) {
    return { path: decodeURIComponent(trimmed.split('?')[0] || ''), hash: '' }
  }
  const path = decodeURIComponent(trimmed.slice(0, hashIndex).split('?')[0] || '')
  return { path, hash: decodeURIComponent(trimmed.slice(hashIndex + 1)) }
}

function pathsMatch(itemPath: string, path: string, resolved: string): boolean {
  if (!itemPath) return false
  return (
    itemPath === path ||
    itemPath === resolved ||
    itemPath.endsWith(path) ||
    itemPath.endsWith(resolved) ||
    resolved.endsWith(itemPath)
  )
}

export function findChapterIndex(
  chapters: Array<{ href: string }>,
  href: string,
  fromHref?: string,
): number {
  const { path, hash } = splitEpubHref(href)
  if (/^(https?:|mailto:|javascript:)/i.test(path)) return -1

  const fromDir = fromHref ? dirname(splitEpubHref(fromHref).path) : ''
  const resolved = path ? resolveZipPath(fromDir, path) : splitEpubHref(fromHref || '').path
  const base = (resolved.split('/').pop() || resolved).toLowerCase()

  if (hash) {
    const hashed = chapters.findIndex((item) => {
      const parts = splitEpubHref(item.href)
      return parts.hash === hash && (!path || pathsMatch(parts.path, path, resolved))
    })
    if (hashed >= 0) return hashed
  }

  if (!path && !resolved) return -1

  const exact = chapters.findIndex((item) => {
    const itemPath = splitEpubHref(item.href).path
    return itemPath === path || itemPath === resolved
  })
  if (exact >= 0) return exact

  const suffix = chapters.findIndex((item) => pathsMatch(splitEpubHref(item.href).path, path, resolved))
  if (suffix >= 0) return suffix

  return chapters.findIndex((item) => {
    const itemBase = (splitEpubHref(item.href).path.split('/').pop() || '').toLowerCase()
    return Boolean(itemBase) && itemBase === base
  })
}

export function resolveZipPath(fromDir: string, href: string): string {
  const [pathPart] = href.split('#')
  const raw = pathPart || href
  const joined = fromDir ? `${fromDir}/${raw}` : raw
  const parts: string[] = []
  for (const part of joined.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function zipFile(zip: JSZip, path: string): JSZip.JSZipObject | null {
  const exact = zip.file(path)
  if (exact) return exact
  const lower = path.toLowerCase()
  const match = Object.keys(zip.files).find((key) => key.toLowerCase() === lower)
  return match ? zip.file(match) : null
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zipFile(zip, path)
  if (!file) throw new Error(`EPUB is missing ${path}`)
  return file.async('string')
}

function sanitizeChapterHtml(
  html: string,
  rewriteSrc: (src: string) => string | null,
): { html: string; text: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.body || doc.documentElement
  for (const node of [...root.querySelectorAll('script, iframe, object, embed, link, meta, style')]) {
    node.remove()
  }
  for (const el of [...root.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || attr.name === 'srcdoc') {
        el.removeAttribute(attr.name)
      }
    }
    if (el.tagName.toLowerCase() === 'a') {
      const href = el.getAttribute('data-epub-href') || el.getAttribute('href') || ''
      if (/^\s*javascript:/i.test(href)) {
        el.removeAttribute('href')
        continue
      }
      if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
        continue
      }
      el.setAttribute('data-epub-href', href)
      el.setAttribute('href', '#')
    }
    if (el.tagName.toLowerCase() === 'img') {
      const src = el.getAttribute('src')
      if (!src || src.startsWith('data:')) continue
      const next = rewriteSrc(src)
      if (next) el.setAttribute('src', next)
      else el.remove()
    }
  }
  const text = (root.textContent || '').replace(/\s+/g, ' ').trim()
  return { html: root.innerHTML, text }
}

function headingLevel(tag: string): number {
  const name = tag.toLowerCase()
  if (name === 'h1') return 1
  if (name === 'h2') return 2
  return 3
}

function isSplitHeading(el: Element): boolean {
  return /^(h1|h2|h3)$/i.test(el.tagName)
}

function nodeHasText(node: Node): boolean {
  return Boolean((node.textContent || '').replace(/\s+/g, ' ').trim())
}

function slugifyHeading(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'section'
  let slug = base
  let n = 2
  while (used.has(slug)) {
    slug = `${base}-${n}`
    n += 1
  }
  used.add(slug)
  return slug
}

function serializeNodes(nodes: Node[]): { html: string; text: string } {
  const scratch = new DOMParser().parseFromString('<div></div>', 'text/html')
  const wrap = (nodes[0]?.ownerDocument || scratch).createElement('div')
  for (const node of nodes) {
    wrap.appendChild(node.cloneNode(true))
  }
  return {
    html: wrap.innerHTML,
    text: (wrap.textContent || '').replace(/\s+/g, ' ').trim(),
  }
}

type HtmlSection = {
  id: string
  href: string
  title: string
  html: string
  text: string
  level: number
}

export function splitHtmlIntoSections(
  html: string,
  fileHref: string,
  options?: { idref?: string; titlesByHref?: Map<string, string> },
): HtmlSection[] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild || doc.body
  const usedIds = new Set(
    [...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean),
  )

  type Bucket = { heading: Element | null; nodes: Node[]; level: number }
  const buckets: Bucket[] = []
  let current: Bucket = { heading: null, nodes: [], level: 1 }

  const takeCurrent = () => {
    if (current.heading || current.nodes.some(nodeHasText)) {
      buckets.push(current)
    }
  }

  const visit = (node: Node) => {
    if (node.nodeType === 1) {
      const el = node as Element
      if (isSplitHeading(el)) {
        takeCurrent()
        current = { heading: el, nodes: [el], level: headingLevel(el.tagName) }
        return
      }
      if (el.querySelector('h1, h2, h3')) {
        for (const child of [...el.childNodes]) visit(child)
        return
      }
    }
    current.nodes.push(node)
  }

  for (const child of [...root.childNodes]) visit(child)
  takeCurrent()

  const usable = buckets.filter((bucket) => serializeNodes(bucket.nodes).text)
  if (usable.length === 0) return []
  if (usable.length === 1) {
    const only = usable[0]!
    const serialized = serializeNodes(only.nodes)
    const title =
      options?.titlesByHref?.get(fileHref) ||
      textOf(only.heading) ||
      'Section'
    return [{
      id: options?.idref || fileHref,
      href: fileHref,
      title,
      html: serialized.html,
      text: serialized.text,
      level: 1,
    }]
  }

  return usable.map((bucket, index) => {
    if (bucket.heading && !bucket.heading.id) {
      bucket.heading.id = slugifyHeading(textOf(bucket.heading), usedIds)
    }
    const hash = bucket.heading?.id || ''
    const href = hash ? `${fileHref}#${hash}` : fileHref
    const serialized = serializeNodes(bucket.nodes)
    const title =
      options?.titlesByHref?.get(href) ||
      (index === 0 ? options?.titlesByHref?.get(fileHref) : undefined) ||
      textOf(bucket.heading) ||
      `Section ${index + 1}`
    return {
      id: `${options?.idref || fileHref}:${hash || String(index)}`,
      href,
      title,
      html: serialized.html,
      text: serialized.text,
      level: bucket.heading ? headingLevel(bucket.heading.tagName) : 1,
    }
  })
}

function tocFromSections(sections: HtmlSection[]): EpubTocItem[] {
  type Frame = { level: number; item: EpubTocItem }
  const roots: EpubTocItem[] = []
  const stack: Frame[] = []

  for (const section of sections) {
    const item: EpubTocItem = { label: section.title, href: section.href }
    while (stack.length > 0 && stack[stack.length - 1]!.level >= section.level) {
      stack.pop()
    }
    const parent = stack[stack.length - 1]
    if (!parent) roots.push(item)
    else {
      parent.item.children = parent.item.children || []
      parent.item.children.push(item)
    }
    stack.push({ level: section.level, item })
  }

  return roots
}

function tocFromNav(navHtml: string, opfDir: string): EpubTocItem[] {
  const doc = new DOMParser().parseFromString(navHtml, 'text/html')
  const nav = doc.querySelector('nav') || doc.body
  if (!nav) return []

  const walk = (list: Element): EpubTocItem[] => {
    const items: EpubTocItem[] = []
    for (const li of list.children) {
      if (li.tagName.toLowerCase() !== 'li') continue
      const anchor = li.querySelector(':scope > a')
      const nested = li.querySelector(':scope > ol, :scope > ul')
      const href = anchor?.getAttribute('href') || ''
      const label = (anchor?.textContent || '').replace(/\s+/g, ' ').trim()
      if (!label) continue
      items.push({
        label,
        href: href ? resolveZipPath(opfDir, href) : '',
        children: nested ? walk(nested) : undefined,
      })
    }
    return items
  }

  const list = nav.querySelector('ol, ul')
  return list ? walk(list) : []
}

function tocFromNcx(ncxXml: string, ncxDir: string): EpubTocItem[] {
  const doc = parseXml(ncxXml)
  const walk = (parent: Element): EpubTocItem[] => {
    const items: EpubTocItem[] = []
    for (const point of [...parent.children].filter((el) => localName(el.tagName) === 'navpoint')) {
      const label = textOf(firstByName(point, 'text'))
      const src = firstByName(point, 'content')?.getAttribute('src') || ''
      if (!label) continue
      items.push({
        label,
        href: src ? resolveZipPath(ncxDir, src) : '',
        children: walk(point),
      })
    }
    return items
  }
  const navMap = firstByName(doc, 'navmap')
  return navMap ? walk(navMap) : []
}

function flattenToc(items: EpubTocItem[]): EpubTocItem[] {
  const out: EpubTocItem[] = []
  const walk = (nodes: EpubTocItem[]) => {
    for (const node of nodes) {
      out.push(node)
      if (node.children) walk(node.children)
    }
  }
  walk(items)
  return out
}

async function inlineImages(
  zip: JSZip,
  chapterDir: string,
  html: string,
): Promise<string> {
  const { html: sanitized } = sanitizeChapterHtml(html, (src) => `[[${src}]]`)
  const matches = [...sanitized.matchAll(/\[\[([^\]]+)\]\]/g)]
  let next = sanitized
  for (const match of matches) {
    const src = match[1] || ''
    const path = resolveZipPath(chapterDir, src)
    const file = zipFile(zip, path)
    const placeholder = `[[${src}]]`
    if (!file) {
      next = next.replaceAll(placeholder, '')
      continue
    }
    const bytes = await file.async('uint8array')
    if (bytes.byteLength > MAX_INLINE_IMAGE_BYTES) {
      next = next.replaceAll(placeholder, '')
      continue
    }
    const ext = path.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
            : ext === 'svg' ? 'image/svg+xml'
              : 'image/jpeg'
    if (!IMAGE_TYPES.has(mime) && ext !== 'jpg' && ext !== 'jpeg') {
      next = next.replaceAll(placeholder, '')
      continue
    }
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const dataUrl = `data:${mime};base64,${btoa(binary)}`
    next = next.replaceAll(placeholder, dataUrl)
  }
  return next
}

export async function parseEpub(bytes: ArrayBuffer): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(bytes)
  const containerXml = await readZipText(zip, 'META-INF/container.xml')
  const container = parseXml(containerXml)
  const rootfile = firstByName(container, 'rootfile')
  const opfPath = rootfile?.getAttribute('full-path')
  if (!opfPath) throw new Error('EPUB container does not name a package file')

  const opfDir = dirname(opfPath)
  const opfXml = await readZipText(zip, opfPath)
  const opf = parseXml(opfXml)
  const metadata = firstByName(opf, 'metadata')
  const title = textOf(metadata ? firstByName(metadata, 'title') : null) || 'Untitled EPUB'
  const creator = textOf(metadata ? firstByName(metadata, 'creator') : null) || undefined

  const manifest = new Map<string, { href: string; mediaType: string; properties: string }>()
  for (const item of childrenByName(opf.documentElement, 'item')) {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (!id || !href) continue
    manifest.set(id, {
      href: resolveZipPath(opfDir, href),
      mediaType: item.getAttribute('media-type') || '',
      properties: item.getAttribute('properties') || '',
    })
  }

  let toc: EpubTocItem[] = []
  const navItem = [...manifest.values()].find((item) => item.properties.split(/\s+/).includes('nav'))
  const ncxItem = [...manifest.values()].find((item) => item.mediaType === 'application/x-dtbncx+xml')
  if (navItem) {
    toc = tocFromNav(await readZipText(zip, navItem.href), dirname(navItem.href))
  } else if (ncxItem) {
    toc = tocFromNcx(await readZipText(zip, ncxItem.href), dirname(ncxItem.href))
  }

  const spine = firstByName(opf, 'spine')
  const refs = spine ? [...spine.getElementsByTagName('*')].filter((el) => localName(el.tagName) === 'itemref') : []
  const titlesByHref = new Map(flattenToc(toc).map((item) => [item.href, item.label]))
  for (const item of flattenToc(toc)) {
    const path = item.href.split('#')[0]
    if (path && !titlesByHref.has(path)) titlesByHref.set(path, item.label)
  }

  const chapters: EpubChapter[] = []
  for (const ref of refs) {
    const idref = ref.getAttribute('idref')
    if (!idref) continue
    const item = manifest.get(idref)
    if (!item || !/html|xml/i.test(item.mediaType)) continue
    const raw = await readZipText(zip, item.href)
    const chapterDir = dirname(item.href)
    const withImages = await inlineImages(zip, chapterDir, raw)
    const { html } = sanitizeChapterHtml(withImages, () => null)
    const sections = splitHtmlIntoSections(html, item.href, { idref, titlesByHref })
    if (sections.length === 0) continue
    chapters.push(...sections)
  }

  if (chapters.length === 0) {
    throw new Error('EPUB has no readable chapters')
  }

  toc = tocFromSections(chapters)

  return { title, creator, chapters, toc }
}

export function searchableText(book: EpubBook): string {
  return book.chapters.map((chapter) => `# ${chapter.title}\n${chapter.text}`).join('\n\n')
}
