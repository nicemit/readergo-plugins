import {
  PluginContext,
  EditorProvider,
  definePlugin,
} from '@readergo/plugin-sdk'
import { FileText, BookImage } from 'lucide-react'
import { PagedDocumentEditor, setPagedPluginContext } from './PagedDocumentEditor'
import { emptyPagedDocument } from './types'

const manifest = {
  id: 'readergo.editor.paged',
  name: 'PDF and Comic Reader',
  version: '1.0.1',
  description:
    'Paged reader for PDF documents and CBZ comic archives (zip of page images), with fit modes, keyboard navigation, and saved place.',
  category: 'editor' as const,
  provides: ['editor-provider', 'activity-bar-item'],
  permissions: [],
}

const pagedEditorProvider: EditorProvider = {
  id: 'paged-editor',
  name: 'PDF and Comic Reader',
  componentId: 'paged',
  supportedTypes: ['pdf', 'cbz'],
}

export default definePlugin({
  manifest: manifest as never,
  async setup(context: PluginContext) {
    setPagedPluginContext(context)
    context.log.info('PDF and Comic reader activated')
    context.registerCapability('editor-provider', pagedEditorProvider)

    context.registerDocumentType({
      type: 'pdf',
      label: 'PDF',
      icon: FileText,
      extensions: ['.pdf'],
      mimeTypes: ['application/pdf'],
      create: () => emptyPagedDocument('pdf'),
    })

    context.registerDocumentType({
      type: 'cbz',
      label: 'Comic (CBZ)',
      icon: BookImage,
      extensions: ['.cbz'],
      mimeTypes: ['application/vnd.comicbook+zip', 'application/x-cbz'],
      create: () => emptyPagedDocument('cbz'),
    })

    context.registerEditor({
      type: 'pdf',
      component: PagedDocumentEditor,
      capabilityId: pagedEditorProvider.id,
    })

    context.registerEditor({
      type: 'cbz',
      component: PagedDocumentEditor,
      capabilityId: pagedEditorProvider.id,
    })

    context.registerCapability('activity-bar-item', {
      id: 'pdf-import',
      label: 'Import PDF',
      noteType: 'pdf',
      icon: FileText,
      position: 'top',
      order: 8,
    })

    context.registerCapability('activity-bar-item', {
      id: 'cbz-import',
      label: 'Import Comic',
      noteType: 'cbz',
      icon: BookImage,
      position: 'top',
      order: 9,
    })

    return async () => {
      setPagedPluginContext(null)
      context.log.info('PDF and Comic reader deactivated')
    }
  },
})
