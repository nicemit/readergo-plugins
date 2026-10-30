import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageBlockView } from './ImageBlockView'

export interface ImageBlockOptions {
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        imageBlock: {
            setImageBlock: (attributes: { src: string; alt?: string; title?: string, width?: string, align?: 'left' | 'center' | 'right' }) => ReturnType
            setImageBlockAlign: (align: 'left' | 'center' | 'right') => ReturnType
            setImageBlockWidth: (width: string) => ReturnType
        }
    }
}

export const ImageBlock = Node.create<ImageBlockOptions>({
    name: 'imageBlock',

    group: 'block',

    draggable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        }
    },

    addAttributes() {
        return {
            src: {
                default: null,
            },
            alt: {
                default: null,
            },
            title: {
                default: null,
            },
            width: {
                default: '100%',
                renderHTML: attributes => {
                    return {
                        width: attributes.width,
                        style: `width: ${attributes.width}`
                    }
                }
            },
            align: {
                default: 'center',
                renderHTML: attributes => {
                    return {
                        'data-align': attributes.align,
                        style: `text-align: ${attributes.align}`
                    }
                }
            }
        }
    },

    parseHTML() {
        return [
            {
                tag: 'img[src]',
                getAttrs: (node) => {
                    const element = node as HTMLElement;
                    return {
                        src: element.getAttribute('src'),
                        alt: element.getAttribute('alt'),
                        title: element.getAttribute('title'),
                        width: element.style.width || element.getAttribute('width'),
                        align: element.getAttribute('data-align') || element.style.textAlign || 'center'
                    }
                }
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
    },

    addCommands() {
        return {
            setImageBlock:
                (attrs) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: 'imageBlock',
                            attrs: { src: attrs.src, alt: attrs.alt, title: attrs.title, width: attrs.width, align: attrs.align },
                        })
                    },
            setImageBlockAlign:
                (align) =>
                    ({ commands }) => {
                        return commands.updateAttributes('imageBlock', { align })
                    },
            setImageBlockWidth:
                (width) =>
                    ({ commands }) => {
                        return commands.updateAttributes('imageBlock', { width })
                    }
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageBlockView)
    },
})
