import type { EpubLineHeight, EpubMargins, EpubPageLayout } from './types'

export const EPUB_LINE_HEIGHT: Record<EpubLineHeight, number> = {
  compact: 1.45,
  balanced: 1.75,
  relaxed: 2.1,
}

export type PagedLayoutInput = {
  containerWidth: number
  containerHeight: number
  margins: EpubMargins
  fontSize: number
  lineHeight: EpubLineHeight
  pageLayout: EpubPageLayout
}

export type PagedLayout = {
  columnWidth: number
  columnGap: number
  columnsVisible: 1 | 2
  frameWidth: number
  pageHeight: number
  padX: number
  padY: number
  paperPadX: number
  paperPadY: number
  lineHeight: number
}

export function computePagedLayout(input: PagedLayoutInput): PagedLayout {
  const width = Math.max(0, input.containerWidth)
  const height = Math.max(0, input.containerHeight)
  const fontSize = input.fontSize
  const lh = EPUB_LINE_HEIGHT[input.lineHeight] ?? EPUB_LINE_HEIGHT.balanced
  const compact = input.margins === 'compact'
  const wide = input.margins === 'wide'
  const narrowViewport = width < 640

  const padX = narrowViewport
    ? compact
      ? 8
      : wide
        ? 16
        : 10
    : compact
      ? Math.max(14, Math.round(width * 0.025))
      : wide
        ? Math.max(36, Math.round(width * 0.07))
        : Math.max(20, Math.round(width * 0.035))

  const padY = narrowViewport
    ? compact
      ? 8
      : wide
        ? 14
        : 10
    : compact
      ? 12
      : wide
        ? 24
        : 16

  const paperPadX = narrowViewport ? 16 : compact ? 22 : wide ? 36 : 28
  const paperPadY = narrowViewport ? 12 : compact ? 16 : wide ? 24 : 20
  const innerW = Math.max(240, width - 2 * padX - 2 * paperPadX)
  const rawH = Math.max(160, height - 2 * padY - 2 * paperPadY)

  const minCol = Math.round(fontSize * 18)
  const comfortableCol = Math.round(fontSize * 24)
  const maxCol = Math.round(fontSize * (compact ? 44 : wide ? 34 : 40))
  const gap = narrowViewport ? 20 : compact ? 32 : wide ? 56 : 44

  let columnsVisible: 1 | 2 = 1
  if (input.pageLayout === 'single') {
    columnsVisible = 1
  } else if (input.pageLayout === 'spread') {
    columnsVisible = innerW >= minCol * 2 + gap ? 2 : 1
  } else if (innerW >= comfortableCol * 2 + gap) {
    columnsVisible = 2
  }

  let columnWidth: number
  if (columnsVisible === 2) {
    columnWidth = Math.floor((innerW - gap) / 2)
    columnWidth = Math.min(maxCol, Math.max(minCol, columnWidth))
  } else {
    columnWidth = Math.min(innerW, maxCol)
    columnWidth = Math.max(Math.min(innerW, minCol), columnWidth)
  }

  const frameWidth = columnsVisible * columnWidth + (columnsVisible - 1) * gap
  const snappedLines = Math.max(4, Math.floor(rawH / (fontSize * lh)))
  const pageHeight = Math.round(snappedLines * fontSize * lh)

  return {
    columnWidth,
    columnGap: gap,
    columnsVisible,
    frameWidth,
    pageHeight,
    padX,
    padY,
    paperPadX,
    paperPadY,
    lineHeight: lh,
  }
}

export function computeScrollMaxWidth(containerWidth: number, margins: EpubMargins): number {
  const width = Math.max(320, containerWidth)
  if (margins === 'compact') return Math.min(Math.round(width * 0.96), 1120)
  if (margins === 'wide') return Math.min(Math.round(width * 0.58), 720)
  return Math.min(Math.round(width * 0.76), 880)
}

export function countColumns(
  scrollWidth: number,
  columnWidth: number,
  columnGap: number,
): number {
  const step = columnWidth + columnGap
  if (step <= 0) return 1
  return Math.max(1, Math.round((scrollWidth + columnGap) / step))
}

export function alignToSpread(
  columnIndex: number,
  columnsVisible: number,
  totalColumns: number,
): number {
  const visible = Math.max(1, columnsVisible)
  const maxStart = Math.max(0, totalColumns - visible)
  const aligned = Math.floor(Math.max(0, columnIndex) / visible) * visible
  return Math.max(0, Math.min(maxStart, aligned))
}

export function columnStep(columnWidth: number, columnGap: number): number {
  return Math.max(1, columnWidth + columnGap)
}
