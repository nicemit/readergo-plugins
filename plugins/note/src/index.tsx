/**
 * Rich note editor plugin (TipTap). Document → DocumentEditor → Plugin UI.
 */

'use client';

import { PluginContext, EditorProvider, PluginManifest, definePlugin } from '@readergo/plugin-sdk';
import { FileText } from 'lucide-react';
import { NoteDocumentEditor } from './NoteDocumentEditor';
import { toEditorHtml } from './share/shareContentTransform';
import { isLikelyUrl, resolveShareUrl, stripUrlFromText } from './share/shareUrlUtils';

type ShareDraft = {
  title?: string
  text?: string
  url?: string
  fileContent?: string
}

type SharePrepareResult = {
  title: string
  editorHtml: string
  metadata: {
    primarySource: 'fileContent' | 'text' | 'url' | 'empty'
    preserved: ShareDraft
  }
  warnings: string[]
}

function buildTitleFromText(text: string): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return 'Shared Note'
  return firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
    .slice(0, 100) || 'Shared Note'
}

function prepareShareDraft(draft: ShareDraft): SharePrepareResult {
  const title = (draft.title || '').trim()
  let text = (draft.text || '').trim()
  const url = resolveShareUrl(draft.url, draft.text, draft.title)
  const fileContent = (draft.fileContent || '').trim()
  const warnings: string[] = []

  if (url) {
    text = stripUrlFromText(text, url)
  }

  let primarySource: SharePrepareResult['metadata']['primarySource'] = 'empty'
  let mainContent = ''

  if (fileContent) {
    primarySource = 'fileContent'
    mainContent = fileContent
  } else if (text && !isLikelyUrl(text)) {
    primarySource = 'text'
    mainContent = text
  } else if (url) {
    primarySource = 'url'
    mainContent = url
    warnings.push('Only URL was provided, using it as content.')
  } else {
    warnings.push('No share content was provided.')
  }

  const contextBlocks: string[] = []
  if (text && primarySource !== 'text') {
    contextBlocks.push(`Shared text:\n${text}`)
  }
  if (fileContent && primarySource !== 'fileContent') {
    contextBlocks.push(`Shared file content:\n${fileContent}`)
  }

  if (url) {
    contextBlocks.push(`Source: ${url}`)
  }

  const merged = [mainContent, ...contextBlocks].filter(Boolean).join('\n\n---\n\n')
  const editorHtml = toEditorHtml(merged)

  return {
    title: title || buildTitleFromText(mainContent || text || url),
    editorHtml,
    metadata: {
      primarySource,
      preserved: {
        title: draft.title,
        text: draft.text,
        url: draft.url,
        fileContent: draft.fileContent,
      },
    },
    warnings,
  }
}

const manifest = {
  id: 'readergo.editor.note',
  name: 'Note Editor',
  category: 'editor',
  version: '1.0.0',
  description: 'Rich text note editor (TipTap)',
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: [],
};

const noteEditorProvider: EditorProvider = {
  id: 'note-editor',
  name: 'Note Editor',
  description: 'Rich text editor',
  componentId: 'note-editor',
  supportedTypes: ['note', 'article', 'journal'],
};

export default definePlugin({
  manifest: manifest as PluginManifest,
  async setup(context: PluginContext) {
    context.log.info('Note editor plugin activated');

    context.registerCapability('editor-provider', noteEditorProvider);

    context.registerDocumentType({
      type: 'note',
      label: 'Note',
      icon: FileText,
      extensions: ['.md', '.markdown'],
      mimeTypes: ['text/markdown', 'text/x-markdown'],
      create: () => ({ content: '' }),
    });

    noteEditorProvider.supportedTypes?.forEach((type) => {
      context.registerEditor({
        type,
        component: NoteDocumentEditor,
        capabilityId: noteEditorProvider.id,
      });
    });

    context.registerCapability('activity-bar-item', {
      id: 'note-new',
      icon: FileText,
      label: 'New Note',
      order: 1,
      position: 'top',
      noteType: 'note',
    });

    await context.registerCommand({
      id: 'readergo.note.normalizeForEditor',
      title: 'Normalize Content For Note Editor',
      description: 'Transforms arbitrary text/html/markdown into editor-safe HTML',
      handler: async (payload?: { content?: string }) => {
        return toEditorHtml(payload?.content || '')
      },
    })

    await context.registerCommand({
      id: 'readergo.share.prepare',
      title: 'Prepare Shared Draft For Editor',
      description: 'Builds deterministic editor-ready content from a share draft',
      handler: async (payload?: { draft?: ShareDraft }) => {
        return prepareShareDraft(payload?.draft || {})
      },
    })

    return async () => {
      context.log.info('Note editor plugin deactivated');
    };
  },
});
