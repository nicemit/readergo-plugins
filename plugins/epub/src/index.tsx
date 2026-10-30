import {
  PluginContext,
  EditorProvider,
  definePlugin,
} from '@readergo/plugin-sdk'
import { BookOpen } from 'lucide-react'
import { EpubDocumentEditor, setEpubPluginContext } from './EpubDocumentEditor'
import { emptyEpubDocument } from './types'

const manifest = {
  id: 'readergo.editor.epub',
  name: 'EPUB Reader',
  version: '1.2.2',
  description:
    'Paginated e-reader with two-page desktop spreads, custom typography, 6 atmospheres, search, bookmarks, and chapter progress',
  category: 'editor' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: [],
}

const epubEditorProvider: EditorProvider = {
  id: 'epub-editor',
  name: 'EPUB Reader',
  componentId: 'epub',
  supportedTypes: ['epub'],
}

export default definePlugin({
  manifest: manifest as never,
  async setup(context: PluginContext) {
    setEpubPluginContext(context)
    context.log.info('EPUB reader plugin activated')
    context.registerCapability('editor-provider', epubEditorProvider)

    context.registerDocumentType({
      type: 'epub',
      label: 'EPUB',
      icon: BookOpen,
      extensions: ['.epub'],
      mimeTypes: ['application/epub+zip'],
      create: () => emptyEpubDocument(),
    })

    context.registerEditor({
      type: 'epub',
      component: EpubDocumentEditor,
      capabilityId: epubEditorProvider.id,
    })

    context.registerCapability('activity-bar-item', {
      id: 'epub-import',
      label: 'Import EPUB',
      noteType: 'epub',
      icon: BookOpen,
      position: 'top',
      order: 7,
    })

    return async () => {
      setEpubPluginContext(null)
      context.log.info('EPUB reader plugin deactivated')
    }
  },
})
