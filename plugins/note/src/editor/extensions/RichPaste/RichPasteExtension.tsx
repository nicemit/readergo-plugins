import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * RichPasteExtension - Preserves rich HTML formatting when pasting
 * 
 * This extension allows pasting content from websites with full formatting:
 * - Font sizes, font families, colors
 * - Background colors, highlights
 * - Images, icons, and other media
 * - All inline styles (font-weight, font-style, text-decoration, etc.)
 * - Block-level formatting (margins, padding)
 */
export const RichPasteExtension = Extension.create({
  name: 'richPaste',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('richPaste'),
        props: {
          // Handle pasted HTML with full formatting preservation
          transformPastedHTML(html) {
            console.log('📋 Pasting HTML:', html.substring(0, 500))
            
            // Create a temporary DOM to process the HTML
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')
            
            // Process all elements to convert class-based styling to inline styles
            const processElement = (element: Element) => {
              if (element instanceof HTMLElement) {
                const computedStyle = window.getComputedStyle(element)
                
                // Extract important styles from computed styles
                const stylesToPreserve = [
                  'font-family',
                  'font-size',
                  'font-weight',
                  'font-style',
                  'color',
                  'background-color',
                  'text-align',
                  'text-decoration',
                  'line-height',
                  'letter-spacing',
                  'padding',
                  'margin',
                  'border',
                  'border-radius',
                ]
                
                let inlineStyle = element.getAttribute('style') || ''
                
                // Add computed styles if not already in inline style
                stylesToPreserve.forEach(prop => {
                  const value = computedStyle.getPropertyValue(prop)
                  if (value && !inlineStyle.includes(prop)) {
                    // Only add if it's not a default value
                    if (
                      (prop === 'color' && value !== 'rgb(0, 0, 0)') ||
                      (prop === 'background-color' && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') ||
                      (prop === 'font-family' && value) ||
                      (prop === 'font-size' && value && value !== '16px') ||
                      (prop === 'font-weight' && value && value !== '400') ||
                      (prop === 'text-align' && value && value !== 'start') ||
                      (!['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'text-align'].includes(prop) && value && value !== 'none' && value !== 'normal')
                    ) {
                      inlineStyle += `${prop}: ${value}; `
                    }
                  }
                })
                
                if (inlineStyle) {
                  element.setAttribute('style', inlineStyle.trim())
                }
              }
              
              // Process children
              Array.from(element.children).forEach(processElement)
            }
            
            // Process the body content
            if (doc.body) {
              processElement(doc.body)
            }
            
            const processedHtml = doc.body.innerHTML
            console.log('✨ Processed HTML:', processedHtml.substring(0, 500))
            
            return processedHtml
          },
          
          // Handle clipboard events
          handlePaste: (view, event, slice) => {
            console.log('📋 Paste event triggered')
            console.log('📋 Clipboard data:', event.clipboardData)
            
            // Log available formats
            if (event.clipboardData) {
              console.log('📋 Available formats:', event.clipboardData.types)
              
              // Try to get HTML first
              const html = event.clipboardData.getData('text/html')
              if (html) {
                console.log('📋 HTML content available:', html.substring(0, 200))
              }
              
              // Also check plain text
              const text = event.clipboardData.getData('text/plain')
              if (text) {
                console.log('📋 Plain text:', text.substring(0, 200))
              }
            }
            
            // Let TipTap handle the paste normally
            return false
          },
        },
      }),
    ]
  },
})

/**
 * Custom mark extension for preserving inline styles
 */
import { Mark, mergeAttributes } from '@tiptap/core'

export const InlineStyle = Mark.create({
  name: 'inlineStyle',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
  
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {}
          }
          return {
            style: attributes.style,
          }
        },
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {}
          }
          return {
            class: attributes.class,
          }
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[style]',
        getAttrs: element => {
          const style = (element as HTMLElement).getAttribute('style')
          return style ? { style } : false
        },
      },
      {
        tag: 'span[class]',
        getAttrs: element => {
          const className = (element as HTMLElement).getAttribute('class')
          return className ? { class: className } : false
        },
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})

/**
 * Custom node extension for preserving div elements with styles
 */
import { Node } from '@tiptap/core'

export const StyledDiv = Node.create({
  name: 'styledDiv',
  
  group: 'block',
  content: 'block+',
  
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {}
          }
          return {
            style: attributes.style,
          }
        },
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {}
          }
          return {
            class: attributes.class,
          }
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div',
        getAttrs: element => {
          const htmlElement = element as HTMLElement
          const style = htmlElement.getAttribute('style')
          const className = htmlElement.getAttribute('class')
          
          // Only parse divs that have styling
          if (style || className) {
            return { style, class: className }
          }
          return false
        },
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

/**
 * Custom node extension for preserving span elements with styles
 */
export const StyledSpan = Node.create({
  name: 'styledSpan',
  
  group: 'inline',
  inline: true,
  content: 'inline*',
  
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {}
          }
          return {
            style: attributes.style,
          }
        },
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) {
            return {}
          }
          return {
            class: attributes.class,
          }
        },
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => {
          const htmlElement = element as HTMLElement
          // Never capture checkbox styler spans inside task item labels
          if (htmlElement.closest?.('label') || htmlElement.parentElement?.tagName === 'LABEL') {
            return false
          }
          const style = htmlElement.getAttribute('style')
          const className = htmlElement.getAttribute('class')

          // Only parse spans that have styling
          if (style || className) {
            return { style, class: className }
          }
          return false
        },
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

