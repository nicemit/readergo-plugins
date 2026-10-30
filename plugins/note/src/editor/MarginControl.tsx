import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
// audit-ignore: sdk-boundary
import { useDisplayName } from '@/components/providers/I18nProvider'
import { useAutoHideMargins } from '@/hooks/useAutoHideMargins'

interface MarginControlProps {
  onMarginChange: (margin: number) => void
  currentMargin: number
  className?: string
}

const MARGIN_PRESETS = [
  { label: 'Narrow', value: 0.1, description: '10% margins' },
  { label: 'Normal', value: 0.2, description: '20% margins' },
  { label: 'Wide', value: 0.3, description: '30% margins' },
  { label: 'Full', value: 0.4, description: '40% margins' },
  { label: 'Max', value: 0.5, description: '50% margins' },
]

export function MarginControl({ onMarginChange, currentMargin, className = '' }: MarginControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customMargin, setCustomMargin] = useState(currentMargin)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const getDisplayName = useDisplayName()
  const { isVisible, handleMouseEnter, handleMouseLeave, handleMouseMove } = useAutoHideMargins()

  // Calculate popover position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      const popoverWidth = 280 // min-width
      const popoverHeight = 300 // estimated height
      
      let left = buttonRect.left
      let top = buttonRect.top - popoverHeight - 8 // Position above by default
      
      // Ensure popover doesn't go off the right edge
      if (left + popoverWidth > viewportWidth - 16) {
        left = viewportWidth - popoverWidth - 16
      }
      
      // Ensure popover doesn't go off the left edge
      if (left < 16) {
        left = 16
      }
      
      // Ensure popover doesn't go off the top edge
      if (top < 16) {
        top = buttonRect.bottom + 8 // Position below if no space above
      }
      
      // Ensure popover doesn't go off the bottom edge
      if (top + popoverHeight > viewportHeight - 16) {
        top = viewportHeight - popoverHeight - 16
      }
      
      setPopoverStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999,
        maxHeight: '60vh',
        overflowY: 'auto',
      })
    }
  }, [isOpen])

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarginChange = (margin: number) => {
    setCustomMargin(margin)
    onMarginChange(margin)
    setIsOpen(false)
  }

  const handleCustomMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const margin = parseFloat(e.target.value)
    if (!isNaN(margin) && margin >= 0 && margin <= 0.8) {
      setCustomMargin(margin)
      onMarginChange(margin)
    }
  }

  const getCurrentPresetLabel = () => {
    const preset = MARGIN_PRESETS.find(p => Math.abs(p.value - currentMargin) < 0.05)
    return preset ? preset.label : 'Custom'
  }

  return (
    <div className={`relative ${className}`}>
      {/* Margin Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className={`flex items-center justify-center w-8 h-8 rounded-md border transition-all duration-300 ${
          isOpen
            ? 'bg-gray-100 border-gray-300 text-gray-700'
            : isVisible
            ? 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50 opacity-60 hover:opacity-100'
        }`}
        title={`${getDisplayName('margins', 'ui')} - ${getCurrentPresetLabel()}`}
      >
        {/* Margin indicator icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6v12M16 6v12" />
        </svg>
      </button>

      {/* Margin Control Popover */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[280px] max-w-[90vw] sm:max-w-[400px]"
          style={popoverStyle}
        >
          {/* Title */}
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            {getDisplayName('margins', 'ui')}
          </div>

          {/* Preset Margins */}
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preset Margins</div>
            <div className="grid grid-cols-2 gap-2">
              {MARGIN_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleMarginChange(preset.value)}
                  className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                    Math.abs(preset.value - currentMargin) < 0.05
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs opacity-75">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Margin Slider */}
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Custom Margin: {Math.round(currentMargin * 100)}%
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500">0%</span>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={currentMargin}
                onChange={(e) => handleMarginChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-500">80%</span>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview</div>
            <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded border">
              <div 
                className="absolute top-1 bottom-1 bg-blue-200 dark:bg-blue-600 rounded"
                style={{ 
                  left: `${currentMargin * 100}%`, 
                  right: `${currentMargin * 100}%` 
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                Content Area
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => handleMarginChange(0.2)}
            className="w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            Reset to Normal
          </button>
        </div>,
        document.body
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
