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

export type EpubThemeId = 'paper' | 'sepia' | 'parchment' | 'slate' | 'midnight' | 'eink'

export type EpubFontFamily = 'serif' | 'sans' | 'mono' | 'dyslexic'

export type EpubLineHeight = 'compact' | 'balanced' | 'relaxed'

export type EpubContentWidth = 'narrow' | 'medium' | 'wide' | 'full'

export type EpubTextAlign = 'left' | 'justify'

export type EpubMargins = 'compact' | 'normal' | 'wide'

export type EpubReadingMode = 'paginated' | 'scroll'

export type EpubPageLayout = 'auto' | 'single' | 'spread'

export type EpubSettings = {
  theme: EpubThemeId
  fontFamily: EpubFontFamily
  fontSize: number // 13 - 32
  lineHeight: EpubLineHeight
  contentWidth: EpubContentWidth
  textAlign: EpubTextAlign
  indentParagraphs: boolean
  margins: EpubMargins
  readingMode: EpubReadingMode
  pageLayout: EpubPageLayout
}

export type EpubBookmark = {
  id: string
  chapterIndex: number
  chapterTitle: string
  href?: string
  snippet?: string
  createdAt: number
}

export const DEFAULT_EPUB_SETTINGS: EpubSettings = {
  theme: 'paper',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 'balanced',
  contentWidth: 'medium',
  textAlign: 'left',
  indentParagraphs: false,
  margins: 'normal',
  readingMode: 'paginated',
  pageLayout: 'auto',
}

export type ThemeStyle = {
  id: EpubThemeId
  name: string
  bg: string
  text: string
  muted: string
  border: string
  headerBg: string
  cardBg: string
  accent: string
  isDark: boolean
}

export const EPUB_THEMES: Record<EpubThemeId, ThemeStyle> = {
  paper: {
    id: 'paper',
    name: 'Paper',
    bg: '#FAF9F5',
    text: '#1C1917',
    muted: '#78716C',
    border: '#E7E5E4',
    headerBg: 'rgba(250, 249, 245, 0.94)',
    cardBg: '#FFFFFF',
    accent: '#059669',
    isDark: false,
  },
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    bg: '#F6EEDA',
    text: '#3D3024',
    muted: '#786854',
    border: '#E4D5BC',
    headerBg: 'rgba(246, 238, 218, 0.95)',
    cardBg: '#FCF7EC',
    accent: '#B45309',
    isDark: false,
  },
  parchment: {
    id: 'parchment',
    name: 'Parchment',
    bg: '#EBE6DC',
    text: '#2C2723',
    muted: '#706962',
    border: '#D6CEC2',
    headerBg: 'rgba(235, 230, 220, 0.95)',
    cardBg: '#F3EFE9',
    accent: '#3F6253',
    isDark: false,
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    bg: '#1E232B',
    text: '#DCE1E8',
    muted: '#8B95A5',
    border: '#2E3642',
    headerBg: 'rgba(30, 35, 43, 0.95)',
    cardBg: '#262C36',
    accent: '#60A5FA',
    isDark: true,
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    bg: '#09090B',
    text: '#ECECF1',
    muted: '#71717A',
    border: '#27272A',
    headerBg: 'rgba(9, 9, 11, 0.94)',
    cardBg: '#18181B',
    accent: '#10B981',
    isDark: true,
  },
  eink: {
    id: 'eink',
    name: 'E-Ink',
    bg: '#FFFFFF',
    text: '#000000',
    muted: '#555555',
    border: '#000000',
    headerBg: '#FFFFFF',
    cardBg: '#FFFFFF',
    accent: '#000000',
    isDark: false,
  },
}

export function emptyEpubDocument() {
  return {
    type: 'epub',
    content: '',
    data: { location: { chapterIndex: 0 } } satisfies EpubDocumentData,
  }
}
