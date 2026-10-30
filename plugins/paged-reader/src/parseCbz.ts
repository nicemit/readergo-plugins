import JSZip from 'jszip'
import type { CbzPage } from './types'

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

export async function parseCbz(bytes: ArrayBuffer): Promise<CbzPage[]> {
  const zip = await JSZip.loadAsync(bytes)
  const names = Object.keys(zip.files)
    .filter((name) => !zip.files[name]?.dir && IMAGE_EXT.test(name) && !name.startsWith('__MACOSX/'))
    .sort(naturalCompare)

  const pages: CbzPage[] = []
  for (const name of names) {
    const file = zip.files[name]
    if (!file) continue
    const blob = await file.async('blob')
    const type = blob.type || guessImageType(name)
    const url = URL.createObjectURL(type ? new Blob([blob], { type }) : blob)
    pages.push({ name: name.split('/').pop() || name, url })
  }
  return pages
}

function guessImageType(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  return 'image/jpeg'
}

export function revokeCbzPages(pages: CbzPage[]): void {
  for (const page of pages) {
    URL.revokeObjectURL(page.url)
  }
}
