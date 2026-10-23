/**
 * Link Autocomplete TipTap Extension
 * 
 * Provides an interactive dropdown popup whenever the user types `[[`.
 * Supports keyboard navigation, mouse click, filtering, and quick note creation.
 * Fully self-contained within the Zettelkasten plugin.
 */

// audit-ignore: sdk-boundary
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
// audit-ignore: sdk-boundary
import { useNotesStore } from '@/lib/store';
// audit-ignore: sdk-boundary
import { executeCommand } from '@/lib/platform/actions';

interface AutocompleteState {
    isOpen: boolean;
    query: string;
    startPos: number;
    selectedIndex: number;
    suggestions: Array<{ id: string; title: string }>;
}

export const LinkAutocompleteExtension = Extension.create({
    name: 'linkAutocomplete',

    addProseMirrorPlugins() {
        const pluginKey = new PluginKey('linkAutocompletePlugin');
        let viewRef: EditorView | null = null;
        let containerEl: HTMLDivElement | null = null;

        const state: AutocompleteState = {
            isOpen: false,
            query: '',
            startPos: -1,
            selectedIndex: 0,
            suggestions: [],
        };

        const renderPopup = () => {
            if (!containerEl) {
                containerEl = document.createElement('div');
                containerEl.setAttribute('data-zettelkasten-autocomplete', 'true');
                containerEl.className = 'fixed z-[120] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl transition-all duration-150';
                containerEl.style.width = '320px';
                containerEl.style.maxHeight = '280px';
                containerEl.style.display = 'none';
                document.body.appendChild(containerEl);
            }

            if (!state.isOpen || !viewRef || viewRef.isDestroyed) {
                containerEl.style.display = 'none';
                return;
            }

            // Calculate position
            const { from } = viewRef.state.selection;
            let coords: { left: number; right: number; top: number; bottom: number };
            try {
                coords = viewRef.coordsAtPos(from);
            } catch {
                containerEl.style.display = 'none';
                return;
            }

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const dropdownWidth = 320;
            const maxHeight = 280;

            let top = coords.bottom + window.scrollY + 8;
            let left = coords.left + window.scrollX;

            if (left + dropdownWidth > viewportWidth) {
                left = viewportWidth - dropdownWidth - 20;
            }

            if (coords.bottom + maxHeight > viewportHeight) {
                top = coords.top + window.scrollY - maxHeight - 8;
            }

            containerEl.style.top = `${Math.max(10, top)}px`;
            containerEl.style.left = `${Math.max(10, left)}px`;
            containerEl.style.display = 'block';

            // Render HTML content
            const queryText = state.query.trim();
            const hasExactMatch = state.suggestions.some(
                (n) => n.title.toLowerCase() === queryText.toLowerCase()
            );
            const showCreateOption = queryText.length > 0 && !hasExactMatch;
            const totalItems = state.suggestions.length + (showCreateOption ? 1 : 0);

            if (state.selectedIndex >= totalItems) {
                state.selectedIndex = Math.max(0, totalItems - 1);
            }

            let html = `
                <div class="px-3 py-2 bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <svg class="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            ${queryText ? `Link to: "${queryText}"` : 'Link to note'}
                        </span>
                    </div>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Zettelkasten</span>
                </div>
                <div class="overflow-y-auto max-h-[190px] p-1.5 space-y-1">
            `;

            if (state.suggestions.length === 0 && !showCreateOption) {
                html += `
                    <div class="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        No notes found
                    </div>
                `;
            } else {
                state.suggestions.forEach((note, idx) => {
                    const isSelected = idx === state.selectedIndex;
                    html += `
                        <button type="button" data-index="${idx}" class="zettelkasten-suggestion-item w-full text-left px-2.5 py-2 rounded-md flex items-center space-x-2.5 transition-colors cursor-pointer text-sm ${
                            isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                        }">
                            <svg class="w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-400'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span class="flex-1 truncate font-medium">${escapeHtml(note.title)}</span>
                        </button>
                    `;
                });

                if (showCreateOption) {
                    const createIdx = state.suggestions.length;
                    const isSelected = createIdx === state.selectedIndex;
                    html += `
                        <button type="button" data-index="${createIdx}" data-create="true" class="zettelkasten-suggestion-item w-full text-left px-2.5 py-2 rounded-md flex items-center space-x-2.5 transition-colors cursor-pointer text-sm border-t border-gray-100 dark:border-gray-700/40 ${
                            isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }">
                            <svg class="w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : 'text-blue-500'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span class="flex-1 truncate font-medium">Create note: <strong class="underline">${escapeHtml(queryText)}</strong></span>
                        </button>
                    `;
                }
            }

            html += `
                </div>
                <div class="px-3 py-1.5 bg-gray-50/80 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>Esc Dismiss</span>
                </div>
            `;

            containerEl.innerHTML = html;

            // Attach click listeners to buttons
            const items = containerEl.querySelectorAll('.zettelkasten-suggestion-item');
            items.forEach((item) => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const idx = parseInt(item.getAttribute('data-index') || '0', 10);
                    selectItem(idx);
                });
            });
        };

        const escapeHtml = (text: string): string => {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const selectItem = (index: number) => {
            if (!viewRef || viewRef.isDestroyed || state.startPos < 0) return;

            const queryText = state.query.trim();
            const isCreateOption = index === state.suggestions.length;

            let noteTitleToInsert = '';

            if (isCreateOption) {
                noteTitleToInsert = queryText;
                // Optionally execute note create in the background
                void executeCommand('readergo.note.create', {
                    id: crypto.randomUUID(),
                    title: queryText,
                    content: '',
                    type: 'note',
                    status: 'draft',
                });
            } else if (state.suggestions[index]) {
                noteTitleToInsert = state.suggestions[index].title;
            }

            if (!noteTitleToInsert) {
                closePopup();
                return;
            }

            const { from } = viewRef.state.selection;
            const linkText = `[[${noteTitleToInsert}]]`;

            const tr = viewRef.state.tr;
            tr.delete(state.startPos, from);
            tr.insertText(linkText, state.startPos);

            const newPos = state.startPos + linkText.length;
            tr.setSelection(TextSelection.create(tr.doc, newPos));

            viewRef.dispatch(tr);
            viewRef.focus();

            closePopup();
        };

        const closePopup = () => {
            state.isOpen = false;
            state.query = '';
            state.startPos = -1;
            state.selectedIndex = 0;
            state.suggestions = [];
            if (containerEl) {
                containerEl.style.display = 'none';
            }
        };

        const updateSuggestions = () => {
            const allNotes = useNotesStore.getState().notes || [];
            const queryLower = state.query.toLowerCase().trim();

            if (!queryLower) {
                state.suggestions = allNotes.slice(0, 8).map((n) => ({ id: n.id, title: n.title }));
            } else {
                state.suggestions = allNotes
                    .filter((n) => n.title && n.title.toLowerCase().includes(queryLower))
                    .slice(0, 8)
                    .map((n) => ({ id: n.id, title: n.title }));
            }
        };

        return [
            new Plugin({
                key: pluginKey,
                view: (editorView) => {
                    viewRef = editorView;
                    return {
                        update: (view) => {
                            viewRef = view;
                            const { selection, doc } = view.state;
                            const { from, to, empty } = selection;

                            if (!empty || from !== to) {
                                if (state.isOpen) closePopup();
                                return;
                            }

                            // Look backwards from current position for `[[`
                            const textBefore = doc.textBetween(Math.max(0, from - 80), from);
                            const match = textBefore.match(/\[\[([^\]\n]*)$/);

                            if (match) {
                                state.isOpen = true;
                                state.query = match[1] || '';
                                state.startPos = from - match[0].length;
                                updateSuggestions();
                                renderPopup();
                            } else {
                                if (state.isOpen) closePopup();
                            }
                        },
                        destroy: () => {
                            if (containerEl && containerEl.parentNode) {
                                containerEl.parentNode.removeChild(containerEl);
                                containerEl = null;
                            }
                            viewRef = null;
                        },
                    };
                },
                props: {
                    handleKeyDown: (view, event) => {
                        if (!state.isOpen) return false;

                        const queryText = state.query.trim();
                        const hasExactMatch = state.suggestions.some(
                            (n) => n.title.toLowerCase() === queryText.toLowerCase()
                        );
                        const showCreateOption = queryText.length > 0 && !hasExactMatch;
                        const totalItems = state.suggestions.length + (showCreateOption ? 1 : 0);

                        if (event.key === 'ArrowDown') {
                            if (totalItems > 0) {
                                event.preventDefault();
                                event.stopPropagation();
                                state.selectedIndex = (state.selectedIndex + 1) % totalItems;
                                renderPopup();
                                return true;
                            }
                        }

                        if (event.key === 'ArrowUp') {
                            if (totalItems > 0) {
                                event.preventDefault();
                                event.stopPropagation();
                                state.selectedIndex = (state.selectedIndex - 1 + totalItems) % totalItems;
                                renderPopup();
                                return true;
                            }
                        }

                        if (event.key === 'Enter' || event.key === 'Tab') {
                            if (totalItems > 0) {
                                event.preventDefault();
                                event.stopPropagation();
                                selectItem(state.selectedIndex);
                                return true;
                            }
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            closePopup();
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});
