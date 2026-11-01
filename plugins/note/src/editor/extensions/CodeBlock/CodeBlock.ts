import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockComponent } from './CodeBlockComponent'
import { createLowlight } from 'lowlight'

// Create a lowlight instance
const lowlight = createLowlight()

// Import languages you want to support for syntax highlighting
// Since we are using 'lowlight', we might need to register languages if not using 'common'
// or just use what's provided by default if importing 'all' (which is heavy).
// 'createLowlight()' usually creates an empty instance or one with 'common' depending on version.
// Let's assume standard usage for now or rely on what was previously there.

export const CodeBlock = CodeBlockLowlight.extend({
    addNodeView() {
        return ReactNodeViewRenderer(CodeBlockComponent)
    },
}).configure({
    lowlight,
    defaultLanguage: 'plaintext',
})
