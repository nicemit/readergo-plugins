'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ProcessedParagraph } from './textProcessing'

interface FullTextViewProps {
  paragraphs: ProcessedParagraph[]
  currentWordIndex: number
  isPlaying: boolean
  title: string
}

export function FullTextView({ paragraphs, currentWordIndex, isPlaying, title }: FullTextViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightedWordRef = useRef<HTMLSpanElement>(null)

  // Auto-scroll to highlighted word
  useEffect(() => {
    // Add a small delay to ensure the DOM has updated
    const scrollTimeout = setTimeout(() => {
      if (highlightedWordRef.current && containerRef.current) {
        const wordElement = highlightedWordRef.current
        const container = containerRef.current
        
        // Simple approach: use scrollIntoView with nearest block behavior
        try {
          wordElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          })
        } catch (error) {
          console.error('📜 scrollIntoView failed:', error)
        }
      }
    }, 50) // Small delay to ensure DOM updates

    return () => clearTimeout(scrollTimeout)
  }, [currentWordIndex])

  if (paragraphs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground text-base">No text content available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col border-t bg-background">
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b bg-muted/30">
        <h3 className="text-sm sm:text-base font-medium text-foreground mb-1">
          Full Text View
        </h3>
        <p className="text-xs text-muted-foreground">
          {title} • Following along with word {currentWordIndex + 1}
        </p>
      </div>

      {/* Scrollable Text Content - Fixed Height */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 scroll-smooth"
        style={{ 
          // Set a reasonable maximum height
          maxHeight: 'calc(100vh - 200px)', // Full viewport minus space for header/controls
          minHeight: '400px', // Minimum height for readability
          // Ensure smooth scrolling on mobile
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {paragraphs.map((paragraph, paragraphIndex) => (
          <div key={paragraphIndex} className="text-sm sm:text-base leading-relaxed sm:leading-loose">
            <p className="text-foreground">
              {paragraph.words.map((word) => {
                const isCurrentWord = word.globalIndex === currentWordIndex
                const isPastWord = word.globalIndex < currentWordIndex
                
                return (
                  <span
                    key={`${paragraphIndex}-${word.wordInParagraph}`}
                    ref={isCurrentWord ? highlightedWordRef : undefined}
                    className={`
                      transition-all duration-200 ease-in-out
                      ${isCurrentWord 
                        ? 'bg-yellow-200 dark:bg-yellow-600/40 text-yellow-900 dark:text-yellow-100 font-medium px-1 rounded-sm shadow-sm' 
                        : isPastWord 
                        ? 'text-muted-foreground/70' 
                        : 'text-foreground'
                      }
                    `}
                    style={{
                      // Add slight scale effect for current word
                      transform: isCurrentWord ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {word.text}
                  </span>
                )
              }).reduce((acc, curr, index) => {
                // Add spaces between words
                if (index === 0) return [curr]
                return [...acc, ' ', curr]
              }, [] as ReactNode[])}
            </p>
          </div>
        ))}
      </div>

      {/* Reading Progress Indicator */}
      <div className="px-4 py-2 border-t bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {isPlaying ? '▶ Playing' : '⏸ Paused'}
          </span>
          <span>
            Paragraph {
              paragraphs.findIndex(p => 
                currentWordIndex >= p.startIndex && currentWordIndex <= p.endIndex
              ) + 1
            } of {paragraphs.length}
          </span>
        </div>
      </div>
    </div>
  )
}
