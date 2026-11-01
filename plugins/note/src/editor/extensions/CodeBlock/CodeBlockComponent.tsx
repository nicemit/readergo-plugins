import { NodeViewContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import React, { useMemo } from 'react'
import { cn } from '../../markdownUtils'

// Common languages for the selector
const LANGUAGES = [
    { value: 'null', label: 'Plain Text' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'sql', label: 'SQL' },
    { value: 'shell', label: 'Shell' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
]

export const CodeBlockComponent = ({ node, updateAttributes, extension }: NodeViewProps) => {
    const language = useMemo(() => {
        return node.attrs.language || 'null'
    }, [node.attrs.language])

    return (
        <NodeViewWrapper className="relative group my-4 rounded-lg overflow-hidden border border-border bg-muted/30">
            {/* Header / Language Selector */}
            <div
                className="flex items-center justify-between px-3 py-1 bg-muted/50 border-b border-border/50 text-xs text-muted-foreground select-none"
                contentEditable={false} // Important: keep non-editable
            >
                <select
                    contentEditable={false}
                    value={language}
                    onChange={(e) => updateAttributes({ language: e.target.value })}
                    className="bg-transparent border-none outline-none cursor-pointer hover:text-foreground transition-colors appearance-none pr-8 py-0.5"
                    aria-label="Select language"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                            {lang.label}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Could add Copy button here */}
                    <span className="text-[10px] uppercase font-mono">{language === 'null' ? 'text' : language}</span>
                </div>
            </div>

            <pre className="p-4 m-0 overflow-x-auto font-mono text-sm leading-relaxed max-w-full">
                {/* @ts-ignore */}
                <NodeViewContent as="code" className={cn("block whitespace-pre", language && `language-${language}`)} />
            </pre>
        </NodeViewWrapper>
    )
}
