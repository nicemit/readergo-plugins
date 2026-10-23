'use client';

import React, { useCallback, useRef, useState } from 'react';
import { EditorProps, WellKnownPlaces } from '@readergo/plugin-sdk';
import { usePlaceContributions } from '@/hooks/usePlaceContributions';
// audit-ignore: sdk-boundary
import { SelectionMenuHost } from '@/components/editor/SelectionMenuHost';
import {
    publishChatSelection,
    clearChatSelection,
} from '@/plugins/chat-source';

/**
 * Simple Text Editor
 *
 * A barebones text editor using a standard HTML textarea.
 * Used for verifying that the editor provider system allows swapping implementations.
 * Hosts Contribution Places `editor/selection-menu` with text-range + plain-text caps.
 */
export function SimpleTextEditor({
    content,
    onChange,
    onSave,
    className,
    placeholder,
    readOnly,
    currentNote,
}: EditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [selectionMenu, setSelectionMenu] = useState<{
        text: string;
        top: number;
        left: number;
    } | null>(null);

    const selectionContributions = usePlaceContributions({
        place: WellKnownPlaces.EDITOR_SELECTION_MENU,
        surface: {
            editorType: 'simple',
            capabilities: ['text-range', 'plain-text'],
        },
        context: {
            hasSelection: !!selectionMenu && selectionMenu.text.length > 0,
            selectionLength: selectionMenu?.text.length ?? 0,
            readOnly: !!readOnly,
        },
    });

    const updateSelectionMenu = useCallback(() => {
        const el = textareaRef.current;
        if (!el || readOnly) {
            setSelectionMenu(null);
            clearChatSelection();
            return;
        }
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === end) {
            setSelectionMenu(null);
            clearChatSelection();
            return;
        }
        const text = (el.value || '').slice(start, end);
        if (!text.trim()) {
            setSelectionMenu(null);
            clearChatSelection();
            return;
        }
        publishChatSelection({
            text,
            start,
            end,
            documentId: currentNote?.id,
        });
        const rect = el.getBoundingClientRect();
        setSelectionMenu({
            text,
            top: rect.top + 24,
            left: rect.left + Math.min(rect.width * 0.4, 200),
        });
    }, [readOnly, currentNote?.id]);

    return (
        <div className={`flex flex-col h-full w-full p-4 relative ${className || ''}`}>
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                <p className="font-bold">Verification Editor</p>
                <p>This is the SimpleTextEditor plugin. If you see this, the editor bundle system is working!</p>
            </div>
            <textarea
                ref={textareaRef}
                className="w-full h-full p-4 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
                value={content}
                onChange={(e) => onChange?.(e.target.value)}
                onSelect={updateSelectionMenu}
                onKeyUp={updateSelectionMenu}
                onMouseUp={updateSelectionMenu}
                onBlur={() => {
                    window.setTimeout(() => setSelectionMenu(null), 150);
                }}
                onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        onSave?.(content || '');
                        console.log('SimpleTextEditor: Saved!');
                    }
                }}
                placeholder={placeholder ?? 'Start typing... (Ctrl+S to save)'}
                readOnly={readOnly}
            />
            <SelectionMenuHost
                anchor={selectionMenu ? { top: selectionMenu.top, left: selectionMenu.left } : null}
                selectedText={selectionMenu?.text || ''}
                contributions={selectionContributions}
                editorType="simple"
                documentId={currentNote?.id}
                onActionComplete={() => setSelectionMenu(null)}
            />
        </div>
    );
}
