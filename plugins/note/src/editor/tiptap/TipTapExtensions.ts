import { Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import HardBreak from '@tiptap/extension-hard-break';
import { ImageBlock } from '../extensions/ImageBlock/ImageBlock';
import Blockquote from '@tiptap/extension-blockquote';
import Code from '@tiptap/extension-code';
import { CodeBlock } from '../extensions/CodeBlock/CodeBlock';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Link from '@tiptap/extension-link';
import History from '@tiptap/extension-history';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { createLowlight } from 'lowlight';

// Custom extensions
import { MarkdownPasteExtension } from '../extensions/MarkdownPaste/MarkdownPasteExtension';
import { RichPasteExtension, InlineStyle, StyledDiv, StyledSpan } from '../extensions/RichPaste/RichPasteExtension';
import { CollapsibleHeadings } from '../extensions/CollapsibleHeadings';

export const getTipTapExtensions = (): Extension[] => {
    return [
        Document,
        Paragraph.extend({
            addAttributes() {
                return {
                    ...this.parent?.(),
                    style: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('style'),
                        renderHTML: (attributes) => {
                            if (!attributes.style) return {};
                            return { style: attributes.style };
                        },
                    },
                    class: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('class'),
                        renderHTML: (attributes) => {
                            if (!attributes.class) return {};
                            return { class: attributes.class };
                        },
                    },
                };
            },
        }) as unknown as Extension,
        Text,
        Heading.configure({
            levels: [1, 2, 3, 4, 5, 6],
            HTMLAttributes: { class: 'font-bold' },
        }).extend({
            addAttributes() {
                return {
                    ...this.parent?.(),
                    style: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('style'),
                        renderHTML: (attributes) => {
                            if (!attributes.style) return {};
                            return { style: attributes.style };
                        },
                    },
                    class: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('class'),
                        renderHTML: (attributes) => {
                            if (!attributes.class) return {};
                            return { class: attributes.class };
                        },
                    },
                };
            },
        }) as unknown as Extension,
        BulletList,
        OrderedList,
        ListItem,
        TaskList,
        TaskItem.extend({
            parseHTML() {
                return [
                    {
                        tag: `li[data-type="${this.name}"]`,
                        priority: 60,
                        getAttrs: (node) => {
                            if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
                                const div = node.querySelector(':scope > div') || node.querySelector('div');
                                if (div) {
                                    const paragraphs = div.querySelectorAll(':scope > p');
                                    if (paragraphs.length > 1) {
                                        const firstP = paragraphs[0];
                                        if (!firstP.textContent?.trim() && !firstP.querySelector('img, code, pre')) {
                                            firstP.remove();
                                        }
                                    }
                                }
                            }
                            return {};
                        },
                    },
                    ...(this.parent?.() || []),
                ];
            },
        }).configure({
            nested: true,
            HTMLAttributes: { class: 'task-item', 'data-type': 'taskItem' },
        }),
        Bold,
        Italic,
        Underline,
        Strike,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        FontFamily,
        Highlight.configure({ multicolor: true }),
        HardBreak,
        ImageBlock.configure({
            HTMLAttributes: { class: 'max-w-full h-auto rounded-lg shadow-sm' },
        }),
        Blockquote.extend({
            addAttributes() {
                return {
                    ...this.parent?.(),
                    style: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('style'),
                        renderHTML: (attributes) => {
                            if (!attributes.style) return {};
                            return { style: attributes.style };
                        },
                    },
                    class: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('class'),
                        renderHTML: (attributes) => {
                            if (!attributes.class) return {};
                            return { class: attributes.class };
                        },
                    },
                };
            },
        }) as unknown as Extension,
        Code,
        CodeBlock.configure({ lowlight: createLowlight() }),
        HorizontalRule,
        Link.configure({
            // TipTap only opens <a> clicks when this is true; false left links looking
            // active (blue/underline) while ProseMirror swallowed navigation.
            openOnClick: true,
            HTMLAttributes: {
                class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
                target: '_blank',
                rel: 'noopener noreferrer',
            },
            protocols: ['http', 'https', 'mailto', 'tel'],
        }),
        History,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        MarkdownPasteExtension,
        RichPasteExtension,
        InlineStyle,
        StyledDiv,
        StyledSpan,
        CollapsibleHeadings,
        Placeholder.configure({
            placeholder: ({ node }) => {
                if (node.type.name === 'heading') {
                    return `Heading ${node.attrs.level}`;
                }
                return 'Type / for commands...';
            },
            emptyEditorClass: 'is-editor-empty',
        }),
    ] as Extension[];
};
