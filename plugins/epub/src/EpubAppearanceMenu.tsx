'use client'

import React from 'react'
import {
  AlignLeft,
  AlignJustify,
  Minus,
  Plus,
  RotateCcw,
  Check,
  X,
  Type,
} from 'lucide-react'
import {
  EpubSettings,
  EpubThemeId,
  EpubFontFamily,
  EpubLineHeight,
  EpubContentWidth,
  EpubTextAlign,
  EpubMargins,
  EpubReadingMode,
  EPUB_THEMES,
  DEFAULT_EPUB_SETTINGS,
} from './types'

interface EpubAppearanceMenuProps {
  settings: EpubSettings
  onChange: (settings: EpubSettings) => void
  onClose: () => void
}

export function EpubAppearanceMenu({
  settings,
  onChange,
  onClose,
}: EpubAppearanceMenuProps) {
  const currentTheme = EPUB_THEMES[settings.theme] || EPUB_THEMES.paper

  const update = (patch: Partial<EpubSettings>) => {
    onChange({ ...settings, ...patch })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl border backdrop-blur-xl p-5 space-y-5 animate-in fade-in slide-in-from-top-4 duration-200"
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentTheme.border }}>
          <div className="flex items-center gap-2 font-medium text-sm">
            <Type className="w-4 h-4 opacity-75" />
            <span>Reading Appearance</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(DEFAULT_EPUB_SETTINGS)}
              title="Reset to defaults"
              className="p-1.5 rounded-lg hover:opacity-75 transition-opacity"
              style={{ color: currentTheme.muted }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:opacity-75 transition-opacity"
              style={{ color: currentTheme.muted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. Theme Palette Swatches */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: currentTheme.muted }}>
            Color Atmosphere
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(EPUB_THEMES) as EpubThemeId[]).map((themeId) => {
              const theme = EPUB_THEMES[themeId]
              const isSelected = settings.theme === themeId
              return (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => update({ theme: themeId })}
                  className="group relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs font-medium"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: isSelected ? theme.accent : theme.border,
                    color: theme.text,
                    boxShadow: isSelected ? `0 0 0 2px ${theme.accent}33` : 'none',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    {theme.name}
                    {isSelected && <Check className="w-3 h-3" style={{ color: theme.accent }} />}
                  </span>
                  <span className="text-[10px] mt-0.5 opacity-60">
                    {theme.isDark ? 'Dark' : 'Light'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Font Family */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: currentTheme.muted }}>
            Typeface
          </label>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl border" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}88` }}>
            {(
              [
                { id: 'serif', label: 'Serif', font: 'Charter, Georgia, serif' },
                { id: 'sans', label: 'Sans', font: 'Inter, system-ui, sans-serif' },
                { id: 'mono', label: 'Mono', font: 'monospace' },
                { id: 'dyslexic', label: 'OpenDys', font: 'sans-serif' },
              ] as const
            ).map((f) => {
              const isSelected = settings.fontFamily === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => update({ fontFamily: f.id as EpubFontFamily })}
                  className="py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center"
                  style={{
                    fontFamily: f.font,
                    backgroundColor: isSelected ? currentTheme.border : 'transparent',
                    color: isSelected ? currentTheme.text : currentTheme.muted,
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. Font Size Stepper */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: currentTheme.muted }}>
              Text Size
            </label>
            <span className="text-xs font-mono font-medium">{settings.fontSize}px</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => update({ fontSize: Math.max(13, settings.fontSize - 1) })}
              disabled={settings.fontSize <= 13}
              className="p-2 rounded-xl border flex items-center justify-center hover:opacity-80 disabled:opacity-40 transition-all"
              style={{ borderColor: currentTheme.border }}
              title="Decrease font size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="13"
              max="28"
              step="1"
              value={settings.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="flex-1 accent-emerald-600 h-1.5 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => update({ fontSize: Math.min(28, settings.fontSize + 1) })}
              disabled={settings.fontSize >= 28}
              className="p-2 rounded-xl border flex items-center justify-center hover:opacity-80 disabled:opacity-40 transition-all"
              style={{ borderColor: currentTheme.border }}
              title="Increase font size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4. Line Spacing & Margins */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: currentTheme.muted }}>
              Line Spacing
            </label>
            <div className="flex rounded-xl border p-1" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}88` }}>
              {(
                [
                  { id: 'compact', label: '1.4' },
                  { id: 'balanced', label: '1.7' },
                  { id: 'relaxed', label: '2.1' },
                ] as const
              ).map((lh) => {
                const isSelected = settings.lineHeight === lh.id
                return (
                  <button
                    key={lh.id}
                    type="button"
                    onClick={() => update({ lineHeight: lh.id as EpubLineHeight })}
                    className="flex-1 py-1 rounded-lg text-xs font-medium transition-all text-center"
                    style={{
                      backgroundColor: isSelected ? currentTheme.border : 'transparent',
                      color: isSelected ? currentTheme.text : currentTheme.muted,
                    }}
                  >
                    {lh.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: currentTheme.muted }}>
              Margins
            </label>
            <div className="flex rounded-xl border p-1" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}88` }}>
              {(
                [
                  { id: 'compact', label: 'Narrow', title: 'Narrow margins (full-width text)' },
                  { id: 'normal', label: 'Normal', title: 'Balanced margins' },
                  { id: 'wide', label: 'Wide', title: 'Wide margins (focused text)' },
                ] as const
              ).map((m) => {
                const isSelected = (settings.margins || 'normal') === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => update({ margins: m.id as EpubMargins })}
                    className="flex-1 py-1 rounded-lg text-xs font-medium transition-all text-center"
                    style={{
                      backgroundColor: isSelected ? currentTheme.border : 'transparent',
                      color: isSelected ? currentTheme.text : currentTheme.muted,
                    }}
                    title={m.title}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 5. Reading Flow (Paged / Kindle vs Continuous Scroll) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: currentTheme.muted }}>
            Reading Flow
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}88` }}>
            <button
              type="button"
              onClick={() => update({ readingMode: 'paginated' })}
              className="py-1.5 px-3 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: (settings.readingMode || 'paginated') === 'paginated' ? currentTheme.border : 'transparent',
                color: (settings.readingMode || 'paginated') === 'paginated' ? currentTheme.text : currentTheme.muted,
              }}
            >
              <span>Paged (Kindle)</span>
            </button>
            <button
              type="button"
              onClick={() => update({ readingMode: 'scroll' })}
              className="py-1.5 px-3 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: settings.readingMode === 'scroll' ? currentTheme.border : 'transparent',
                color: settings.readingMode === 'scroll' ? currentTheme.text : currentTheme.muted,
              }}
            >
              <span>Continuous Scroll</span>
            </button>
          </div>
        </div>

        {/* 5. Alignment & Indentation */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: currentTheme.border, backgroundColor: `${currentTheme.bg}88` }}>
            <button
              type="button"
              onClick={() => update({ textAlign: 'left' })}
              className="p-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: settings.textAlign === 'left' ? currentTheme.border : 'transparent',
                color: settings.textAlign === 'left' ? currentTheme.text : currentTheme.muted,
              }}
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => update({ textAlign: 'justify' })}
              className="p-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: settings.textAlign === 'justify' ? currentTheme.border : 'transparent',
                color: settings.textAlign === 'justify' ? currentTheme.text : currentTheme.muted,
              }}
              title="Justify Text"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none">
            <input
              type="checkbox"
              checked={settings.indentParagraphs}
              onChange={(e) => update({ indentParagraphs: e.target.checked })}
              className="rounded accent-emerald-600 cursor-pointer"
            />
            <span>Book Indent</span>
          </label>
        </div>
      </div>
    </div>
  )
}
