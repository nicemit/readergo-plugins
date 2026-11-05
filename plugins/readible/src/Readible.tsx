'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Settings, RotateCcw } from 'lucide-react'
import { SpeedControls } from './SpeedControls'
import { ProgressBar } from './ProgressBar'
import { 
  processTextForHighlighting, 
  type ProcessedParagraph,
  type ReadibleState,
  DEFAULT_READIBLE_SETTINGS 
} from './textProcessing'
import { FullTextView } from './FullTextView'

export interface ReadiblePrefs {
  wordSpeed: number
  punctuationSpeed: number
  currentWordIndex: number
}

interface ReadibleProps {
  text: string
  title: string
  noteId: string
  initialWordSpeed?: number
  initialPunctuationSpeed?: number
  initialWordIndex?: number
  onPrefsChange?: (prefs: ReadiblePrefs) => void
  onClose?: () => void
}

function controlButton(kind: 'primary' | 'outline', extra = '') {
  const base = 'inline-flex items-center justify-center gap-1 rounded-md text-sm disabled:opacity-40 disabled:pointer-events-none'
  if (kind === 'primary') {
    return `${base} bg-primary text-primary-foreground hover:bg-primary/90 ${extra}`
  }
  return `${base} border border-border bg-background text-foreground hover:bg-muted ${extra}`
}

export function Readible({ 
  text, 
  title, 
  noteId,
  initialWordSpeed = DEFAULT_READIBLE_SETTINGS.wordSpeed,
  initialPunctuationSpeed = DEFAULT_READIBLE_SETTINGS.punctuationSpeed,
  initialWordIndex = 0,
  onPrefsChange,
  onClose,
}: ReadibleProps) {
  const [state, setState] = useState<ReadibleState>({
    words: [],
    currentWordIndex: 0,
    isPlaying: false,
    wordSpeed: initialWordSpeed,
    punctuationSpeed: initialPunctuationSpeed,
    progress: 0,
    totalWords: 0
  })

  const [showSettings, setShowSettings] = useState(false)
  const [paragraphs, setParagraphs] = useState<ProcessedParagraph[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Process text when the note (or restored place) changes
  useEffect(() => {
    const { words, paragraphs: processedParagraphs } = processTextForHighlighting(text)
    const maxIndex = Math.max(0, words.length - 1)
    const startIndex = Math.min(Math.max(0, initialWordIndex), maxIndex)
    
    setState(prev => ({
      ...prev,
      words,
      totalWords: words.length,
      currentWordIndex: startIndex,
      progress: words.length > 0 ? (startIndex / words.length) * 100 : 0,
      isPlaying: false,
      wordSpeed: initialWordSpeed,
      punctuationSpeed: initialPunctuationSpeed,
    }))

    setParagraphs(processedParagraphs)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [text, noteId, initialWordIndex, initialWordSpeed, initialPunctuationSpeed])

  useEffect(() => {
    onPrefsChange?.({
      wordSpeed: state.wordSpeed,
      punctuationSpeed: state.punctuationSpeed,
      currentWordIndex: state.currentWordIndex,
    })
  }, [onPrefsChange, state.wordSpeed, state.punctuationSpeed, state.currentWordIndex])

  // Update progress when current word changes
  useEffect(() => {
    const progress = state.totalWords > 0 ? (state.currentWordIndex / state.totalWords) * 100 : 0
    setState(prev => ({ ...prev, progress }))
  }, [state.currentWordIndex, state.totalWords])

  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      // Pause
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setState(prev => ({ ...prev, isPlaying: false }))
    } else {
      // Play
      if (state.currentWordIndex >= state.totalWords - 1) {
        // If at the end, restart from beginning
        setState(prev => ({ ...prev, currentWordIndex: 0 }))
      }
      
      const playNextWord = () => {
        setState(prev => {
          if (prev.currentWordIndex >= prev.totalWords - 1) {
            // Reached the end, stop playing
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            return { ...prev, isPlaying: false }
          }

          const nextIndex = prev.currentWordIndex + 1
          const currentWord = prev.words[prev.currentWordIndex]
          const delay = currentWord?.isPunctuation ? prev.punctuationSpeed : prev.wordSpeed

          // Set timeout for next word
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          intervalRef.current = setTimeout(playNextWord, delay)

          return { ...prev, currentWordIndex: nextIndex }
        })
      }

      // Start playing
      setState(prev => ({ ...prev, isPlaying: true }))
      const currentWord = state.words[state.currentWordIndex]
      const delay = currentWord?.isPunctuation ? state.punctuationSpeed : state.wordSpeed
      intervalRef.current = setTimeout(playNextWord, delay)
    }
  }, [state.isPlaying, state.currentWordIndex, state.totalWords, state.words, state.wordSpeed, state.punctuationSpeed])

  // Handle next word
  const goToNextWord = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      currentWordIndex: Math.min(prev.currentWordIndex + 1, prev.totalWords - 1),
      isPlaying: false
    }))
  }, [])

  // Handle previous word
  const goToPreviousWord = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      currentWordIndex: Math.max(prev.currentWordIndex - 1, 0),
      isPlaying: false
    }))
  }, [])

  // Handle restart
  const restart = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      currentWordIndex: 0,
      isPlaying: false
    }))
  }, [])

  // Handle speed changes
  const handleWordSpeedChange = useCallback((speed: number) => {
    setState(prev => ({ ...prev, wordSpeed: speed }))
  }, [])

  const handlePunctuationSpeedChange = useCallback((speed: number) => {
    setState(prev => ({ ...prev, punctuationSpeed: speed }))
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement
      ) {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          event.stopPropagation()
          togglePlayPause()
          break
        case 'ArrowRight':
          event.preventDefault()
          event.stopPropagation()
          goToNextWord()
          break
        case 'ArrowLeft':
          event.preventDefault()
          event.stopPropagation()
          goToPreviousWord()
          break
        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            event.stopPropagation()
            restart()
          }
          break
        case 'Escape':
          event.preventDefault()
          event.stopPropagation()
          if (showSettings) {
            setShowSettings(false)
          } else {
            onClose?.()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress, true)
    return () => window.removeEventListener('keydown', handleKeyPress, true)
  }, [togglePlayPause, goToNextWord, goToPreviousWord, restart, showSettings, onClose])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const currentWord = state.words[state.currentWordIndex]
  const isAtEnd = state.currentWordIndex >= state.totalWords - 1
  const isAtStart = state.currentWordIndex === 0

  if (state.words.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground text-base">No text content available for Readible.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Progress Bar */}
      <div className="flex-shrink-0">
        <ProgressBar 
          progress={state.progress}
          currentWord={state.currentWordIndex + 1}
          totalWords={state.totalWords}
        />
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Desktop Only: Left Side - Full Text */}
        <div className="hidden lg:flex lg:flex-1 border-r">
          <FullTextView 
            paragraphs={paragraphs}
            currentWordIndex={state.currentWordIndex}
            isPlaying={state.isPlaying}
            title={title}
          />
        </div>

        {/* Always Visible: Right Side - Word Player & Controls */}
        <div className="w-full lg:w-96 xl:w-[28rem] flex flex-col bg-background">
          {/* Word Player Section */}
          <div className="flex flex-col items-center justify-center p-4 lg:p-6 min-h-[300px] lg:min-h-[400px]">
            <div className="text-center w-full max-w-md">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-lg xl:text-xl font-medium text-muted-foreground mb-2 px-2">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Word {state.currentWordIndex + 1} of {state.totalWords}
                </p>
              </div>
              
              <div className="min-h-[120px] lg:min-h-[160px] xl:min-h-[200px] flex items-center justify-center px-4">
                {currentWord && (
                  <div className="text-3xl lg:text-4xl xl:text-5xl font-light text-foreground transition-all duration-300 ease-in-out break-words text-center">
                    {currentWord.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="p-3 lg:p-4">
              {/* Navigation Controls */}
              <div className="flex items-center justify-center gap-2 lg:gap-3 mb-3 lg:mb-4">
                <button
                  type="button"
                  onClick={restart}
                  disabled={isAtStart}
                  className={controlButton('outline', 'px-2 py-1 text-xs')}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden xl:inline">Restart</span>
                </button>
                
                <button
                  type="button"
                  onClick={goToPreviousWord}
                  disabled={isAtStart}
                  className={controlButton('outline', 'p-2')}
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className={controlButton('primary', 'px-6 lg:px-8 py-2 lg:py-3')}
                >
                  {state.isPlaying ? (
                    <Pause className="w-5 h-5 lg:w-6 lg:h-6" />
                  ) : (
                    <Play className="w-5 h-5 lg:w-6 lg:h-6" />
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={goToNextWord}
                  disabled={isAtEnd}
                  className={controlButton('outline', 'p-2')}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={controlButton('outline', 'px-2 py-1 text-xs')}
                >
                  <Settings className="w-3 h-3" />
                  <span className="hidden xl:inline">Settings</span>
                </button>
              </div>

              {/* Speed Controls */}
              {showSettings && (
                <div className="border-t pt-3 lg:pt-4">
                  <SpeedControls
                    wordSpeed={state.wordSpeed}
                    punctuationSpeed={state.punctuationSpeed}
                    onWordSpeedChange={handleWordSpeedChange}
                    onPunctuationSpeedChange={handlePunctuationSpeedChange}
                  />
                </div>
              )}

              {/* Keyboard Shortcuts Help */}
              <div className="text-center mt-3 lg:mt-4">
                <p className="text-xs text-muted-foreground hidden lg:block">
                  <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Space</kbd> Play/Pause • 
                  <kbd className="px-1 py-0.5 text-xs bg-muted rounded ml-1">←</kbd> Previous • 
                  <kbd className="px-1 py-0.5 text-xs bg-muted rounded ml-1">→</kbd> Next • 
                  <kbd className="px-1 py-0.5 text-xs bg-muted rounded ml-1">Ctrl+R</kbd> Restart
                </p>
                <p className="text-xs text-muted-foreground lg:hidden">
                  <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Space</kbd> Play • 
                  <kbd className="px-1 py-0.5 text-xs bg-muted rounded ml-1">←→</kbd> Navigate
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Full Text View */}
          <div className="lg:hidden border-t">
            <FullTextView 
              paragraphs={paragraphs}
              currentWordIndex={state.currentWordIndex}
              isPlaying={state.isPlaying}
              title={title}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
