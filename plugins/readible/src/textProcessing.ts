/**
 * Text processing utilities for Readible
 */

/**
 * Convert HTML content to plain text suitable for word-by-word display
 * Removes HTML tags, converts entities, and preserves natural text flow
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Remove script and style elements
  const scripts = tempDiv.querySelectorAll('script, style')
  scripts.forEach(el => el.remove())

  // Get text content and clean it up
  let text = tempDiv.textContent || tempDiv.innerText || ''

  // Clean up the text
  text = text
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Replace multiple newlines with single newline
    .replace(/\n\s*\n/g, '\n')
    // Trim whitespace
    .trim()

  return text
}

/**
 * Split text into words with punctuation detection
 */
export function splitTextIntoWords(text: string): Word[] {
  if (!text) return []

  // Split by whitespace and filter out empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0)

  return words.map((word, index) => ({
    text: word,
    isPunctuation: isPunctuationWord(word),
    hasEndPunctuation: hasEndPunctuation(word),
    originalWord: word,
    index
  }))
}

/**
 * Process HTML text into paragraph structure with indexed words for highlighting
 */
export function processTextForHighlighting(html: string): {
  words: Word[]
  paragraphs: ProcessedParagraph[]
  plainText: string
} {
  if (!html) return { words: [], paragraphs: [], plainText: '' }

  // Create a temporary DOM element to parse HTML and preserve paragraph structure
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Remove script and style elements
  const scripts = tempDiv.querySelectorAll('script, style')
  scripts.forEach(el => el.remove())

  // Get all paragraph-like elements (p, div, h1-h6, li, etc.)
  const paragraphElements = tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote')
  
  let globalWordIndex = 0
  const paragraphs: ProcessedParagraph[] = []
  const allWords: Word[] = []

  // If no paragraph elements found, treat the entire text as one paragraph
  if (paragraphElements.length === 0) {
    const plainText = tempDiv.textContent || tempDiv.innerText || ''
    const cleanText = plainText.replace(/\s+/g, ' ').trim()
    
    if (cleanText) {
      const words = cleanText.split(/\s+/).filter(word => word.length > 0)
      const paragraphWords: IndexedWord[] = []
      
      words.forEach((word, wordIndex) => {
        const wordObj: Word = {
          text: word,
          isPunctuation: isPunctuationWord(word),
          hasEndPunctuation: hasEndPunctuation(word),
          originalWord: word,
          index: globalWordIndex
        }
        
        const indexedWord: IndexedWord = {
          ...wordObj,
          globalIndex: globalWordIndex,
          paragraphIndex: 0,
          wordInParagraph: wordIndex
        }
        
        allWords.push(wordObj)
        paragraphWords.push(indexedWord)
        globalWordIndex++
      })
      
      paragraphs.push({
        text: cleanText,
        words: paragraphWords,
        startIndex: 0,
        endIndex: globalWordIndex - 1
      })
    }
  } else {
    // Process each paragraph element
    paragraphElements.forEach((element, paragraphIndex) => {
      const paragraphText = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
      
      if (paragraphText) {
        const words = paragraphText.split(/\s+/).filter(word => word.length > 0)
        const paragraphWords: IndexedWord[] = []
        const startIndex = globalWordIndex
        
        words.forEach((word, wordIndex) => {
          const wordObj: Word = {
            text: word,
            isPunctuation: isPunctuationWord(word),
            hasEndPunctuation: hasEndPunctuation(word),
            originalWord: word,
            index: globalWordIndex
          }
          
          const indexedWord: IndexedWord = {
            ...wordObj,
            globalIndex: globalWordIndex,
            paragraphIndex,
            wordInParagraph: wordIndex
          }
          
          allWords.push(wordObj)
          paragraphWords.push(indexedWord)
          globalWordIndex++
        })
        
        paragraphs.push({
          text: paragraphText,
          words: paragraphWords,
          startIndex,
          endIndex: globalWordIndex - 1
        })
      }
    })
  }

  // Create plain text version for fallback
  const plainText = allWords.map(word => word.text).join(' ')

  return {
    words: allWords,
    paragraphs,
    plainText
  }
}

/**
 * Check if a word is primarily punctuation
 */
function isPunctuationWord(word: string): boolean {
  // Remove word characters and check if mostly punctuation remains
  const punctuationOnly = word.replace(/\w/g, '')
  return punctuationOnly.length > word.length * 0.5
}

/**
 * Check if a word ends with punctuation
 */
function hasEndPunctuation(word: string): boolean {
  return /[.!?;:,]$/.test(word)
}

/**
 * Calculate reading time based on word count
 */
export function calculateReadingTime(wordCount: number, wordsPerMinute: number = 200): number {
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Get word count from text
 */
export function getWordCount(text: string): number {
  if (!text) return 0
  const words = text.trim().split(/\s+/).filter(word => word.length > 0)
  return words.length
}

/**
 * Interface for processed words
 */
export interface Word {
  text: string
  isPunctuation: boolean
  hasEndPunctuation: boolean
  originalWord: string
  index: number
}

/**
 * Interface for paragraph structure with indexed words
 */
export interface ProcessedParagraph {
  text: string
  words: IndexedWord[]
  startIndex: number
  endIndex: number
}

/**
 * Interface for words with global index and position info
 */
export interface IndexedWord {
  text: string
  isPunctuation: boolean
  hasEndPunctuation: boolean
  originalWord: string
  globalIndex: number
  paragraphIndex: number
  wordInParagraph: number
}

/**
 * Interface for Readible state
 */
export interface ReadibleState {
  words: Word[]
  currentWordIndex: number
  isPlaying: boolean
  wordSpeed: number
  punctuationSpeed: number
  wordFontSize: number
  progress: number
  totalWords: number
}

/**
 * Default Readible settings
 */
export const DEFAULT_READIBLE_SETTINGS = {
  wordSpeed: 500, // milliseconds
  punctuationSpeed: 1000, // milliseconds
  minSpeed: 50,
  maxSpeed: 3000,
  wordFontSize: 96,
  minWordFontSize: 32,
  maxWordFontSize: 160,
} as const

export function clampWordFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_READIBLE_SETTINGS.wordFontSize
  const rounded = Math.round(value)
  return Math.min(
    DEFAULT_READIBLE_SETTINGS.maxWordFontSize,
    Math.max(DEFAULT_READIBLE_SETTINGS.minWordFontSize, rounded),
  )
}
