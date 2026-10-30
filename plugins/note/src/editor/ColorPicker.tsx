import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Editor } from '@tiptap/react'

interface ColorPickerProps {
  editor: Editor
  title?: string
  className?: string
}

const PRESET_COLORS = [
  '#000000', // Black
  '#374151', // Gray 700
  '#6B7280', // Gray 500
  '#9CA3AF', // Gray 400
  '#EF4444', // Red 500
  '#F97316', // Orange 500
  '#EAB308', // Yellow 500
  '#22C55E', // Green 500
  '#06B6D4', // Cyan 500
  '#3B82F6', // Blue 500
  '#8B5CF6', // Violet 500
  '#EC4899', // Pink 500
  '#F59E0B', // Amber 500
  '#10B981', // Emerald 500
  '#14B8A6', // Teal 500
  '#6366F1', // Indigo 500
  '#A855F7', // Purple 500
  '#F43F5E', // Rose 500
]

export function ColorPicker({ editor, title = 'Text Color', className = '' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')
  const [popoverPosition, setPopoverPosition] = useState<'top' | 'bottom'>('top')
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Get current text color
  const currentColor = editor.getAttributes('textStyle').color || '#000000'

  // Calculate popover position based on available space
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Check available space above and below the button
      const spaceAbove = buttonRect.top
      const spaceBelow = viewportHeight - buttonRect.bottom
      
      // Be more conservative - only position above if there's significantly more space above
      // and at least 300px of space (popover is about 250px tall)
      const shouldPositionAbove = spaceAbove > spaceBelow + 100 && spaceAbove > 300
      
      setPopoverPosition(shouldPositionAbove ? 'top' : 'bottom')
      
      // Calculate exact position for the popover
      const popoverWidth = 200 // min-width
      const popoverHeight = 250 // estimated height
      
      let left = buttonRect.left
      let top = shouldPositionAbove 
        ? buttonRect.top - popoverHeight - 8 // 8px gap
        : buttonRect.bottom + 8 // 8px gap
      
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
        top = 16
        setPopoverPosition('bottom') // Force bottom if no space above
      }
      
      // Ensure popover doesn't go off the bottom edge
      if (top + popoverHeight > viewportHeight - 16) {
        top = viewportHeight - popoverHeight - 16
        setPopoverPosition('top') // Force top if no space below
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

  const setTextColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
    setIsOpen(false)
  }

  const removeColor = () => {
    editor.chain().focus().unsetColor().run()
    setIsOpen(false)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setCustomColor(color)
    setTextColor(color)
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Color Button */}
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center h-9 w-9 rounded-lg transition-colors ${
          isOpen ? 'bg-primary/15 text-primary' : 'text-foreground/70 hover:bg-foreground/10'
        }`}
        title={title}
        aria-label={title}
      >
        {/* Color indicator */}
        <div
          className="w-4 h-4 rounded border border-border"
          style={{ backgroundColor: currentColor }}
        />
      </button>

      {/* Color Picker Popover */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="rg-menu-surface p-3 min-w-[200px] max-w-[90vw] sm:max-w-[400px]"
          style={popoverStyle}
        >
          {/* Preset Colors */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preset Colors</div>
            <div className="grid grid-cols-9 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                    currentColor === color
                      ? 'border-gray-400 ring-2 ring-blue-500 ring-opacity-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Custom Color</div>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                title="Choose custom color"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#000000"
                className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Remove Color Button */}
          <button
            onClick={removeColor}
            className="w-full px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            Remove Color
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
