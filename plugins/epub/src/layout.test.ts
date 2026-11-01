import { describe, expect, it } from 'vitest'
import {
  alignToSpread,
  computePagedLayout,
  computeScrollMaxWidth,
  countColumns,
} from './layout'

describe('computePagedLayout', () => {
  it('uses a single column on a phone-sized pane', () => {
    const layout = computePagedLayout({
      containerWidth: 390,
      containerHeight: 700,
      margins: 'normal',
      fontSize: 18,
      lineHeight: 'balanced',
      pageLayout: 'auto',
    })
    expect(layout.columnsVisible).toBe(1)
    expect(layout.frameWidth).toBe(layout.columnWidth)
    expect(layout.columnWidth).toBeGreaterThan(240)
    expect(layout.pageHeight).toBeGreaterThan(400)
  })

  it('opens a two-page spread on a desktop pane', () => {
    const layout = computePagedLayout({
      containerWidth: 1600,
      containerHeight: 900,
      margins: 'normal',
      fontSize: 18,
      lineHeight: 'balanced',
      pageLayout: 'auto',
    })
    expect(layout.columnsVisible).toBe(2)
    expect(layout.frameWidth).toBe(layout.columnWidth * 2 + layout.columnGap)
    expect(layout.columnWidth).toBeGreaterThan(400)
    expect(layout.columnWidth).toBeLessThanOrEqual(18 * 40)
  })

  it('fills most of a laptop editor pane instead of capping at 760px', () => {
    const layout = computePagedLayout({
      containerWidth: 1280,
      containerHeight: 800,
      margins: 'normal',
      fontSize: 18,
      lineHeight: 'balanced',
      pageLayout: 'auto',
    })
    expect(layout.frameWidth).toBeGreaterThan(900)
    expect(layout.columnsVisible).toBe(2)
  })

  it('honors single-page mode on a wide screen', () => {
    const layout = computePagedLayout({
      containerWidth: 1800,
      containerHeight: 1000,
      margins: 'normal',
      fontSize: 18,
      lineHeight: 'balanced',
      pageLayout: 'single',
    })
    expect(layout.columnsVisible).toBe(1)
    expect(layout.columnWidth).toBeLessThanOrEqual(18 * 40)
  })

  it('falls back from forced spread when the pane is too narrow', () => {
    const layout = computePagedLayout({
      containerWidth: 420,
      containerHeight: 640,
      margins: 'normal',
      fontSize: 18,
      lineHeight: 'balanced',
      pageLayout: 'spread',
    })
    expect(layout.columnsVisible).toBe(1)
  })
})

describe('countColumns and alignToSpread', () => {
  it('counts overflow CSS columns from scrollWidth', () => {
    const columnWidth = 500
    const gap = 40
    const scrollWidth = 4 * columnWidth + 3 * gap
    expect(countColumns(scrollWidth, columnWidth, gap)).toBe(4)
  })

  it('snaps a column index to the start of its spread', () => {
    expect(alignToSpread(3, 2, 8)).toBe(2)
    expect(alignToSpread(7, 2, 8)).toBe(6)
    expect(alignToSpread(0, 2, 8)).toBe(0)
  })
})

describe('computeScrollMaxWidth', () => {
  it('uses a wider measure on large screens than the old max-w-3xl cap', () => {
    expect(computeScrollMaxWidth(1600, 'normal')).toBeGreaterThan(768)
    expect(computeScrollMaxWidth(1600, 'compact')).toBeGreaterThan(1000)
  })
})
