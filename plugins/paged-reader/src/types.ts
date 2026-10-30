export type PagedKind = 'pdf' | 'cbz'

export type PagedFit = 'width' | 'page'

export type PagedLocation = {
  page: number
}

export type PagedDocumentData = {
  location?: PagedLocation
}

export type CbzPage = {
  name: string
  url: string
}

export function emptyPagedDocument(kind: PagedKind) {
  return {
    type: kind,
    content: '',
    data: { location: { page: 0 } } satisfies PagedDocumentData,
  }
}

export function isPdfFileName(name: string): boolean {
  return /\.pdf$/i.test(name)
}

export function isCbzFileName(name: string): boolean {
  return /\.cbz$/i.test(name)
}

export function hasPdfSignature(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 5) return false
  const header = new Uint8Array(bytes, 0, 5)
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  )
}

export function hasZipSignature(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false
  const header = new Uint8Array(bytes, 0, 4)
  return header[0] === 0x50 && header[1] === 0x4b
}
