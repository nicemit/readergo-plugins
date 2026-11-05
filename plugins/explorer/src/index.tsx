import type { LeftExplorer, Plugin, PluginContext, PluginManifest } from '@readergo/plugin-sdk'
import { Folder } from 'lucide-react'
import { FolderTree } from './FolderTree'

const manifest: PluginManifest = {
  id: 'readergo.features.explorer',
  name: 'Explorer',
  version: '1.0.0',
  description: 'Folder tree for the documents workspace. Other plugins can register a replacement left explorer.',
  category: 'feature',
  provides: ['left-explorer'],
  requires: [],
  permissions: ['note:read', 'note:write'],
  trust: 'trusted',
  source: 'external',
  runtime: 'local',
}

export const ExplorerPlugin: Plugin = {
  manifest,

  async activate(context: PluginContext): Promise<void> {
    const explorer: LeftExplorer = {
      id: 'readergo.features.explorer',
      name: 'Folders',
      icon: Folder,
      order: 0,
      render: (props) => (
        <FolderTree
          folders={props.folders}
          notes={props.notes}
          selectedNoteId={props.selectedNoteId}
          onNoteSelect={props.onNavigateToNote}
          onCreateNote={(folderId) => props.onCreateNote?.(folderId)}
          onDuplicateNote={props.onDuplicateNote}
          onMoveNote={props.onMoveNote}
          onDeleteNote={props.onDeleteNote}
          onOpenReadible={props.onOpenReadible}
          onFoldersUpdated={props.onFoldersUpdated}
          onCreateFolder={props.onCreateFolder}
          onRenameFolder={props.onRenameFolder}
          onDeleteFolder={props.onDeleteFolder}
          onOpenSearch={() => {
            void context.emit('readergo:open-search', {})
          }}
        />
      ),
    }

    context.registerCapability('left-explorer', explorer)
    context.log.info('Folder explorer ready')
  },

  deactivate(context: PluginContext) {
    context.log.info('Folder explorer deactivated')
  },
}

export default ExplorerPlugin
