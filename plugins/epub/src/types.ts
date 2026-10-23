export type EpubTocItem = {
  label: string
  href: string
  children?: EpubTocItem[]
}

export type EpubChapter = {
  id: string
  href: string
  title: string
  html: string
  text: string
  /** 1 is a chapter, 2+ is a nested section inside that file. */
  level: number
}

export type EpubBook = {
  title: string
  creator?: string
  chapters: EpubChapter[]
  toc: EpubTocItem[]
}

export type EpubLocation = {
  chapterIndex: number
  href?: string
}

export type EpubDocumentData = {
  book?: EpubBook
  location?: EpubLocation
}

export function emptyEpubDocument() {
  return {
    type: 'epub',
    content: '',
    data: { location: { chapterIndex: 0 } } satisfies EpubDocumentData,
  }
}
