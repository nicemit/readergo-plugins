'use client'

import { DEFAULT_READIBLE_SETTINGS } from './textProcessing'

interface SpeedControlsProps {
  wordSpeed: number
  punctuationSpeed: number
  onWordSpeedChange: (speed: number) => void
  onPunctuationSpeedChange: (speed: number) => void
}

export function SpeedControls({
  wordSpeed,
  punctuationSpeed,
  onWordSpeedChange,
  onPunctuationSpeedChange
}: SpeedControlsProps) {
  const formatSpeed = (speed: number) => {
    if (speed < 1000) {
      return `${speed}ms`
    }
    return `${(speed / 1000).toFixed(1)}s`
  }

  const getSpeedLabel = (speed: number) => {
    if (speed <= 200) return 'Very Fast'
    if (speed <= 500) return 'Fast'
    if (speed <= 1000) return 'Normal'
    if (speed <= 2000) return 'Slow'
    return 'Very Slow'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Word Speed Control */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Word Speed
            </label>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {formatSpeed(wordSpeed)} • {getSpeedLabel(wordSpeed)}
            </div>
          </div>
          
          <div className="space-y-2">
            <input
              type="range"
              min={DEFAULT_READIBLE_SETTINGS.minSpeed}
              max={DEFAULT_READIBLE_SETTINGS.maxSpeed}
              step="50"
              value={wordSpeed}
              onChange={(e) => onWordSpeedChange(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very Fast</span>
              <span>Very Slow</span>
            </div>
          </div>
        </div>

        {/* Punctuation Speed Control */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Punctuation Speed
            </label>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {formatSpeed(punctuationSpeed)} • {getSpeedLabel(punctuationSpeed)}
            </div>
          </div>
          
          <div className="space-y-2">
            <input
              type="range"
              min={DEFAULT_READIBLE_SETTINGS.minSpeed}
              max={DEFAULT_READIBLE_SETTINGS.maxSpeed}
              step="50"
              value={punctuationSpeed}
              onChange={(e) => onPunctuationSpeedChange(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very Fast</span>
              <span>Very Slow</span>
            </div>
          </div>
        </div>
      </div>

      {/* Speed Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Speed Presets</label>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            onClick={() => {
              onWordSpeedChange(200)
              onPunctuationSpeedChange(400)
            }}
            className="px-2 sm:px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Very Fast
          </button>
          <button
            onClick={() => {
              onWordSpeedChange(500)
              onPunctuationSpeedChange(1000)
            }}
            className="px-2 sm:px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Normal
          </button>
          <button
            onClick={() => {
              onWordSpeedChange(1000)
              onPunctuationSpeedChange(2000)
            }}
            className="px-2 sm:px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Slow
          </button>
          <button
            onClick={() => {
              onWordSpeedChange(2000)
              onPunctuationSpeedChange(3000)
            }}
            className="px-2 sm:px-3 py-1 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Very Slow
          </button>
        </div>
      </div>
    </div>
  )
}
