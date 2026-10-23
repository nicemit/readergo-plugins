/**
 * Internal Link TipTap Mark Extension
 * 
 * Provides [[Note Title]] and [[Note Title|Display Alias]] syntax for internal note linking.
 * Part of the Zettelkasten plugin.
 */

// audit-ignore: sdk-boundary
import { Mark, mergeAttributes, markInputRule, markPasteRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions';

export interface InternalLinkOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        internalLink: {
            /**
             * Set an internal link mark
             */
            setInternalLink: (attributes: { noteTitle: string; displayText?: string }) => ReturnType;
            /**
             * Toggle an internal link mark
             */
            toggleInternalLink: (attributes: { noteTitle: string; displayText?: string }) => ReturnType;
            /**
             * Unset an internal link mark
             */
            unsetInternalLink: () => ReturnType;
        };
    }
}

/**
 * Link pattern: [[Note Title]] or [[Note Title|Display Alias]]
 */
export const LINK_RE = /\[\[([^\]|][^\]]*?)(?:\|([^\]]*?))?\]\]/g;

export const InternalLinkExtension = Mark.create<InternalLinkOptions>({
    name: 'internalLink',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            noteTitle: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-note-title'),
                renderHTML: (attributes) => {
                    if (!attributes.noteTitle) return {};
                    return { 'data-note-title': attributes.noteTitle };
                },
            },
            displayText: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-display-text'),
                renderHTML: (attributes) => {
                    if (!attributes.displayText) return {};
                    return { 'data-display-text': attributes.displayText };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-type="internal-link"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                this.options.HTMLAttributes,
                {
                    'data-type': 'internal-link',
                    class: 'internal-link cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline decoration-blue-400/70 decoration-1 underline-offset-2 hover:decoration-2 transition-all',
                },
                HTMLAttributes
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setInternalLink:
                (attributes) =>
                ({ commands }) => {
                    return commands.setMark(this.name, attributes);
                },
            toggleInternalLink:
                (attributes) =>
                ({ commands }) => {
                    return commands.toggleMark(this.name, attributes);
                },
            unsetInternalLink:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
        };
    },

    addInputRules() {
        return [
            markInputRule({
                find: /\[\[([^\]|][^\]]*?)(?:\|([^\]]*?))?\]\]$/,
                type: this.type,
                getAttributes: (match) => {
                    const noteTitle = match[1].trim();
                    const displayText = match[2] !== undefined ? match[2].trim() : noteTitle;
                    return { noteTitle, displayText };
                },
            }),
        ];
    },

    addPasteRules() {
        return [
            markPasteRule({
                find: LINK_RE,
                type: this.type,
                getAttributes: (match) => {
                    const noteTitle = match[1].trim();
                    const displayText = match[2] !== undefined ? match[2].trim() : noteTitle;
                    return { noteTitle, displayText };
                },
            }),
        ];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('internalLinkClickHandler'),
                props: {
                    handleClick: (view, pos, event) => {
                        const { state } = view;
                        const $pos = state.doc.resolve(pos);

                        // Find the internalLink mark at current position
                        const internalLinkMark = state.doc.rangeHasMark(pos, pos + 1, this.type)
                            ? $pos.marks().find((m) => m.type.name === this.name)
                            : null;

                        let noteTitle = internalLinkMark?.attrs?.noteTitle;

                        if (!noteTitle) {
                            const target = event.target as HTMLElement | null;
                            const linkElement = target?.closest('span[data-type="internal-link"]');
                            if (linkElement) {
                                noteTitle = linkElement.getAttribute('data-note-title');
                            }
                        }

                        if (noteTitle) {
                            event.preventDefault();
                            event.stopPropagation();

                            // Use executeCommand to trigger note navigation through architecture
                            void executeCommand('readergo.zettelkasten.openOrCreate', {
                                title: noteTitle,
                            });
                            return true;
                        }

                        return false;
                    },
                },
            }),
            new Plugin({
                key: new PluginKey('internalLinkParser'),
                appendTransaction: (transactions, oldState, newState) => {
                    if (!transactions.some((tr) => tr.docChanged)) {
                        return null;
                    }

                    const tr = newState.tr;
                    let modified = false;
                    const markType = newState.schema.marks[this.name];

                    if (!markType) return null;

                    const docSize = newState.doc.content.size;

                    newState.doc.descendants((node, pos) => {
                        if (node.isText) {
                            const text = node.text || '';
                            let match;
                            const re = new RegExp(LINK_RE.source, 'g');

                            while ((match = re.exec(text)) !== null) {
                                const noteTitle = match[1].trim();
                                const displayText = match[2] !== undefined ? match[2].trim() : noteTitle;
                                const from = pos + match.index;
                                const to = from + match[0].length;

                                if (from >= 0 && to <= docSize) {
                                    const hasMark = newState.doc.rangeHasMark(from, to, markType);
                                    if (!hasMark) {
                                        tr.addMark(from, to, markType.create({ noteTitle, displayText }));
                                        modified = true;
                                    }
                                }
                            }
                        }
                    });

                    return modified ? tr : null;
                },
            }),
        ];
    },
});
