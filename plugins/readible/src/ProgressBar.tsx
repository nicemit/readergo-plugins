'use client'

interface ProgressBarProps {
  progress: number
  currentWord: number
  totalWords: number
}

export function ProgressBar({ progress, currentWord, totalWords }: ProgressBarProps) {
  return (
    <div className="px-2 sm:px-4 py-2 bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-muted-foreground">
          Progress
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {currentWord} / {totalWords} words
        </span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>0%</span>
        <span>{Math.round(progress)}%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
