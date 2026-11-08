'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { type Folder } from '@/lib/platform/CapabilityClient'
import { useDisplayName } from '@/components/providers/I18nProvider'
import {
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderOpen,
  MoreHorizontal,
  Edit2,
  Trash2,
  Search,
  FolderPlus,
  Check,
  X,
  Clock,
  ArrowUpDown,
  Pin,
  List as LayoutList,
  AlignLeft,
  ChevronUp
} from 'lucide-react'
import { resolveNoteListTitle, getDocumentTypeIcon } from '@/lib/notes/noteListDisplay'

export type SortOption = 'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc';
export type ViewMode = 'folder' | 'timeline';
import { NoteContextMenu } from './NoteContextMenu'
import { FolderContextMenu } from './FolderContextMenu'
import { DeleteFolderDialog } from './DeleteFolderDialog'
import { usePluginCapabilities } from '@/hooks/usePluginCapabilities'
import { executeCommand, usePluginEvent } from '@/lib/platform/actions'

function notify(type: 'success' | 'error', message: string) {
  void executeCommand('readergo.toast.show', { type, message })
}

// Helper function to format relative time
function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return `${diffYears}y ago`
  } catch {
    return ''
  }
}

// Helper function to format absolute date
function getAbsoluteDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return ''
  }
}

function getTypeLabel(type: string): string {
  if (!type) return 'Note'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function getHoverPreview(note: { content?: string; type: string }): string {
  const raw = (note.content || '').replace(/\s+/g, ' ').trim()
  if (raw.length > 0) {
    return raw.length > 140 ? `${raw.slice(0, 140)}...` : raw
  }

  if (note.type && note.type !== 'note') {
    return `${getTypeLabel(note.type)} document`
  }
  return 'No content preview'
}

interface FolderTreeProps {
  folders?: Folder[]
  onCreateNote: (folderId?: string) => void
  notes?: Array<{
    id: string
    title: string
    content?: string
    data?: unknown
    type: string
    status: string
    createdAt: string
    updatedAt: string
    folderId?: string | null
  }>
  onNoteSelect?: (noteId: string) => void
  selectedNoteId?: string | null
  onDuplicateNote?: (noteId: string, noteTitle: string) => void
  onMoveNote?: (noteId: string, noteTitle: string) => void
  onDeleteNote?: (noteId: string, noteTitle: string) => void
  onFoldersUpdated?: () => void
  // Folder operation callbacks (for SpaceManager integration)
  onCreateFolder?: (name: string, parentId?: string) => Promise<void>
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>
  onDeleteFolder?: (folderId: string) => Promise<void>
  onOpenSearch?: () => void
}

interface FolderNodeProps {
  folder: Folder
  level: number
  isExpanded: boolean
  expandedFolders: Set<string>
  notes?: Array<{
    id: string
    title: string
    content?: string
    data?: unknown
    type: string
    status: string
    createdAt: string
    updatedAt: string
    folderId?: string | null
  }>
  onToggle: (folderId: string) => void
  onRename: (folderId: string, newName: string) => void
  onDelete: (folderId: string) => void
  onCreateSubfolder: (parentId: string) => void
  onCreateNote: (folderId: string) => void
  onNoteSelect?: (noteId: string) => void
  selectedNoteId?: string | null
  onDuplicateNote?: (noteId: string, noteTitle: string) => void
  onMoveNote?: (noteId: string, noteTitle: string) => void
  onDeleteNote?: (noteId: string, noteTitle: string) => void
  dateDisplayMode: Map<string, 'relative' | 'absolute'>
  onToggleDateDisplay: (noteId: string, e: React.MouseEvent) => void
  // Folder operation callbacks
  onRenameFolderAsync?: (folderId: string, newName: string) => Promise<void>
  onDeleteFolderAsync?: (folderId: string) => Promise<void>
  onTogglePin: (noteId: string) => void
  pinnedNoteIds: string[]
  hasPinService?: boolean
  noteCountByFolderId: Map<string, number>
}

interface NoteItemProps {
  note: {
    id: string
    title: string
    content?: string
    data?: unknown
    type: string
    status: string
    createdAt: string
    updatedAt: string
    folderId?: string | null
  }
  level?: number
  selectedNoteId?: string | null
  onNoteSelect?: (noteId: string) => void
  onDuplicateNote?: (noteId: string, noteTitle: string) => void
  onMoveNote?: (noteId: string, noteTitle: string) => void
  onDeleteNote?: (noteId: string, noteTitle: string) => void
  onTogglePin: (noteId: string) => void
  isPinned: boolean
  hasPinService?: boolean
  dateDisplayMode: Map<string, 'relative' | 'absolute'>
  onToggleDateDisplay: (noteId: string, e: React.MouseEvent) => void
}

function NoteItem({
  note,
  level = 0,
  selectedNoteId,
  onNoteSelect,
  onDuplicateNote,
  onMoveNote,
  onDeleteNote,
  onTogglePin,
  isPinned,
  hasPinService = true,
  dateDisplayMode,
  onToggleDateDisplay
}: NoteItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const displayTitle = resolveNoteListTitle(note)
  const TypeIcon = getDocumentTypeIcon(note.type)
  const typeLabel = getTypeLabel(note.type)
  const hoverPreview = getHoverPreview(note)

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (containerRef.current) {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: e.clientX,
        clientY: e.clientY
      })
      containerRef.current.dispatchEvent(event)
    }
  }

  return (
    <NoteContextMenu
      key={note.id}
      noteId={note.id}
      noteTitle={displayTitle}
      onEdit={() => onNoteSelect?.(note.id)}
      onDuplicate={() => onDuplicateNote?.(note.id, displayTitle)}
      onMove={() => onMoveNote?.(note.id, displayTitle)}
      onDelete={() => onDeleteNote?.(note.id, displayTitle)}
      onPin={hasPinService ? () => onTogglePin(note.id) : undefined}
      isPinned={isPinned}
    >
      <div
        ref={containerRef}
        className={`
            relative flex flex-col p-2.5 rounded-xl cursor-pointer
            border transition-all duration-150 ease-out group/note
            ${selectedNoteId === note.id
              ? 'bg-primary/10 border-primary/50 shadow-sm'
              : 'border-transparent hover:border-border/60 hover:bg-muted/40'
            }
          `}
        style={{
          paddingLeft: `${level * 16 + 10}px`,
          marginLeft: level >= 0 ? '2px' : '0px'
        }}
        title={hoverPreview}
        onClick={(e) => {
          // Only handle left clicks, let right clicks go to context menu
          if (e.button === 0) {
            onNoteSelect?.(note.id)
          }
        }}
      >
        <div className="flex items-start w-full gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-transform duration-150 group-hover/note:scale-105 ${
              selectedNoteId === note.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/60 text-muted-foreground border-border/40'
            }`}
            title={note.type}
          >
            <TypeIcon className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={`block text-xs font-semibold whitespace-normal break-words text-left leading-snug tracking-tight ${
                selectedNoteId === note.id ? 'text-primary' : 'text-foreground'
              }`}
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {displayTitle}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-muted-foreground/80">
              <span
                className="cursor-pointer hover:text-muted-foreground transition-colors"
                onClick={(e) => onToggleDateDisplay(note.id, e)}
                title="Click to toggle date format"
              >
                {dateDisplayMode.get(note.id) === 'absolute'
                  ? getAbsoluteDate(note.updatedAt)
                  : getRelativeTime(note.updatedAt)
                }
              </span>
              <span>•</span>
              <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-muted/60 text-muted-foreground">
                {typeLabel}
              </span>
            </div>
          </div>

          <button
            className="opacity-0 group-hover/note:opacity-100 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-all ml-1 flex-shrink-0"
            onClick={handleMenuClick}
            title="Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </NoteContextMenu>
  )
}

function FolderNode({
  folder,
  level,
  isExpanded,
  expandedFolders,
  notes = [],
  onToggle,
  onRename,
  onDelete,
  onCreateSubfolder,
  onCreateNote,
  onNoteSelect,
  selectedNoteId,
  onDuplicateNote,
  onMoveNote,
  onDeleteNote,
  dateDisplayMode,
  onToggleDateDisplay,
  onRenameFolderAsync,
  onDeleteFolderAsync,
  onTogglePin,
  pinnedNoteIds,
  hasPinService = true,
  noteCountByFolderId
}: FolderNodeProps) {
  const folderRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (folderRef.current) {
      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: e.clientX,
        clientY: e.clientY
      })
      folderRef.current.dispatchEvent(event)
    }
  }
  const [editName, setEditName] = useState(folder.name)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const getDisplayName = useDisplayName()
  const directNoteCount = noteCountByFolderId.get(folder.id) ?? 0

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== folder.name) {
      try {
        // Use callback if provided, otherwise fall back to API
        if (onRenameFolderAsync) {
          await onRenameFolderAsync(folder.id, editName.trim())
        }
        onRename(folder.id, editName.trim())
        setIsEditing(false)
        notify('success', getDisplayName('folderRenamedSuccessfully', 'ui'))
      } catch (error) {
        notify('error', getDisplayName('failedToRenameFolder', 'ui'))
        setEditName(folder.name)
      }
    } else {
      setEditName(folder.name)
      setIsEditing(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    try {
      // Use callback if provided, otherwise fall back to API
      if (onDeleteFolderAsync) {
        await onDeleteFolderAsync(folder.id)
      }
      onDelete(folder.id)
      notify('success', getDisplayName('folderDeletedSuccessfully', 'ui'))
      setShowDeleteDialog(false)
    } catch (error) {
      // Show the specific error message from the API
      if (error instanceof Error) {
        notify('error', error.message)
      } else {
        notify('error', getDisplayName('failedToDeleteFolder', 'ui'))
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setEditName(folder.name)
      setIsEditing(false)
    }
  }

  return (
    <div className="select-none">
      <FolderContextMenu
        folderId={folder.id}
        folderName={folder.name}
        onRename={() => setIsEditing(true)}
        onCreateSubfolder={() => onCreateSubfolder(folder.id)}
        onCreateNote={() => onCreateNote(folder.id)}
        onDelete={handleDelete}
      >
        <div
          ref={folderRef}
          className={`
            flex items-center py-1.5 px-1 rounded-md border border-transparent
            transition-colors duration-150 ease-out group/folder
            hover:bg-muted/50 hover:border-border/50
          `}
          style={{
            paddingLeft: `${level * 20 + 4}px`,
            marginLeft: level > 0 ? '2px' : '0px'
          }}
        >
          {/* Expand/Collapse Button */}
          <button
            type="button"
            data-rg-chrome="tree-toggle"
            data-rg-quiet="true"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            className="p-1 mr-1.5 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-md transition-colors flex items-center justify-center shadow-none border-0 bg-transparent"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggle(folder.id)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Folder Icon */}
          <div className="mr-2 flex-shrink-0">
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-primary" />
            ) : (
              <FolderIcon className="w-4 h-4 text-primary" />
            )}
          </div>

          {/* Folder Name */}
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-background text-foreground border border-primary rounded px-1 py-0.5 text-sm"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-base font-medium text-foreground whitespace-normal break-words">
              {folder.name}
            </span>
          )}

          {!isEditing && (
            <span className="mr-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {directNoteCount}
            </span>
          )}

          {!isEditing && (
            <button
              className="opacity-0 group-hover/folder:opacity-100 p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-all ml-1 flex-shrink-0"
              onClick={handleMenuClick}
              title="Options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </FolderContextMenu>

      {/* Children. Inline grid rows, not Tailwind arbitrary classes: those are not in the host stylesheet, so a click only changed opacity. */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 200ms ease-out',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          {/* Subfolders */}
          {folder.children && folder.children.length > 0 && folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              isExpanded={expandedFolders.has(child.id)}
              expandedFolders={expandedFolders}
              notes={notes}
              onToggle={onToggle}
              dateDisplayMode={dateDisplayMode}
              onToggleDateDisplay={onToggleDateDisplay}
              onRename={onRename}
              onDelete={onDelete}
              onCreateSubfolder={onCreateSubfolder}
              onCreateNote={onCreateNote}
              onNoteSelect={onNoteSelect}
              selectedNoteId={selectedNoteId}
              onDuplicateNote={onDuplicateNote}
              onMoveNote={onMoveNote}
              onDeleteNote={onDeleteNote}
              onRenameFolderAsync={onRenameFolderAsync}
              onDeleteFolderAsync={onDeleteFolderAsync}
              onTogglePin={onTogglePin}
              pinnedNoteIds={pinnedNoteIds}
              hasPinService={hasPinService}
              noteCountByFolderId={noteCountByFolderId}
            />
          ))}

          {/* Notes in this folder - Show when folder is expanded */}
          {notes
            .filter(note => note.folderId === folder.id)
            .map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                level={level + 1}
                selectedNoteId={selectedNoteId}
                onNoteSelect={onNoteSelect}
                onDuplicateNote={onDuplicateNote}
                onMoveNote={onMoveNote}
                onDeleteNote={onDeleteNote}
                onTogglePin={onTogglePin}
                isPinned={pinnedNoteIds.includes(note.id)}
                hasPinService={hasPinService}
                dateDisplayMode={dateDisplayMode}
                onToggleDateDisplay={onToggleDateDisplay}
              />
            ))}
        </div>
      </div>

      {/* Delete Folder Dialog */}
      <DeleteFolderDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        folderName={folder.name}
        noteCount={folder._count?.notes || 0}
        subfolderCount={folder._count?.children || 0}
      />
    </div>
  )
}

export function FolderTree({
  folders = [],
  onCreateNote,
  notes = [],
  onNoteSelect,
  selectedNoteId,
  onDuplicateNote,
  onMoveNote,
  onDeleteNote,
  onFoldersUpdated,
  onCreateFolder: onCreateFolderProp,
  onRenameFolder: onRenameFolderProp,
  onDeleteFolder: onDeleteFolderProp,
  onOpenSearch,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false) // No loading state needed since folders come from parent
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingSubfolderFor, setCreatingSubfolderFor] = useState<string | null>(null)
  const [dateDisplayMode, setDateDisplayMode] = useState<Map<string, 'relative' | 'absolute'>>(new Map())
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [pinnedNoteIds, setPinnedNoteIds] = useState<string[]>([])

  // Organization state
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc')
  const [viewMode, setViewMode] = useState<ViewMode>('folder')
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  const getDisplayName = useDisplayName()
  const hasPinService = usePluginCapabilities('pin-note-service').length > 0

  // Sync pinned notes via plugin commands and events
  useEffect(() => {
    executeCommand<string[]>('readergo.pin-notes.listPinned')
      .then(ids => {
        if (Array.isArray(ids)) setPinnedNoteIds(ids)
      })
      .catch(() => setPinnedNoteIds([]))
  }, [])

  usePluginEvent('readergo.pin-notes.changed', () => {
    executeCommand<string[]>('readergo.pin-notes.listPinned')
      .then(ids => {
        if (Array.isArray(ids)) setPinnedNoteIds(ids)
      })
      .catch(() => {})
  })

  const handleTogglePin = (noteId: string) => {
    if (pinnedNoteIds.includes(noteId)) {
      executeCommand('readergo.pin-notes.unpin', { noteId })
    } else {
      executeCommand('readergo.pin-notes.pin', { noteId })
    }
  }

  const toggleDateDisplay = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDateDisplayMode((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(noteId) || 'relative'
      newMap.set(noteId, current === 'relative' ? 'absolute' : 'relative')
      return newMap
    })
  }

  // Folders are now loaded by parent component and passed as props
  // Removed duplicate loadFolders call


  // loadFolders function removed - folders are now passed as props from parent

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const handleCreateFolder = async (parentId?: string) => {
    const trimmedName = newFolderName.trim()
    if (!trimmedName || isCreatingFolder) return

    setIsCreatingFolder(true)
    const tempId = `temp-${Date.now()}`

    try {
      // Optimistic update: create temporary folder in UI
      const optimisticFolder: Folder = {
        id: tempId,
        name: trimmedName,
        userId: '',
        parentId: parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: {
          notes: 0,
          children: 0
        }
      }

      // Expand parent folder if creating subfolder
      if (parentId) {
        setExpandedFolders(prev => new Set(prev).add(parentId))
      }

      // Use callback if provided, otherwise fall back to API
      let createdFolder: Folder | void
      if (onCreateFolderProp) {
        await onCreateFolderProp(trimmedName, parentId)
      }

      // Notify parent component to update its folders state
      onFoldersUpdated?.()

      setNewFolderName('')
      setShowCreateFolder(false)
      setCreatingSubfolderFor(null)
      notify('success', getDisplayName('folderCreatedSuccessfully', 'ui'))
    } catch (error: any) {
      // Rollback optimistic update by refreshing folders
      onFoldersUpdated?.()

      let errorMessage = getDisplayName('failedToCreateFolder', 'ui')
      if (error?.message?.includes('directory access')) {
        errorMessage = 'Directory access required to create folders'
      } else if (error?.message?.includes('already exists')) {
        errorMessage = 'Folder with this name already exists in this location'
      } else if (error?.message) {
        errorMessage = error.message
      }

      notify('error', errorMessage)

      // Keep the input open so user can try again
      if (!showCreateFolder) {
        setShowCreateFolder(true)
      }
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleCreateSubfolder = (parentId: string) => {
    setCreatingSubfolderFor(parentId)
    setNewFolderName('')
    setShowCreateFolder(true)
  }

  const handleRenameFolder = (folderId: string, newName: string) => {
    // Notify parent component to update its folders state
    onFoldersUpdated?.()
  }

  const handleDeleteFolder = (folderId: string) => {
    // Notify parent component to update its folders state
    onFoldersUpdated?.()
  }

  // Sort utility
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      switch (sortBy) {
        case 'updated-desc': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'updated-asc': return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'created-desc': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'created-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'title-asc': return resolveNoteListTitle(a).localeCompare(resolveNoteListTitle(b))
        case 'title-desc': return resolveNoteListTitle(b).localeCompare(resolveNoteListTitle(a))
        default: return 0
      }
    })
  }, [notes, sortBy])

  // Build hierarchical structure
  const buildFolderTree = (folders: Folder[]): Folder[] => {
    const folderMap = new Map<string, Folder>()
    const rootFolders: Folder[] = []

    // Create map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Build hierarchy
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children!.push(folderWithChildren)
        }
      } else {
        rootFolders.push(folderWithChildren)
      }
    })

    return rootFolders
  }

  const folderTree = buildFolderTree(folders)
  const noteCountByFolderId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const note of sortedNotes) {
      if (!note.folderId) continue
      counts.set(note.folderId, (counts.get(note.folderId) ?? 0) + 1)
    }
    return counts
  }, [sortedNotes])

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-base text-muted-foreground">Loading folders...</div>
      </div>
    )
  }

  return (
    <div className="p-1">
      {/* Search + view/sort (create folder lives on the activity bar) */}
      <div className="flex flex-col gap-2 mb-2 px-2 mt-1">
        <button
          type="button"
          className="flex w-full items-center gap-2 h-8 px-2.5 bg-background/80 hover:bg-muted/50 border border-border/60 hover:border-border/80 rounded-md text-xs text-muted-foreground transition-all group shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={() => onOpenSearch?.()}
          title="Search notes (Cmd/Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          <span className="font-medium truncate">Search documents...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1.5 font-mono text-[10px] text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        <div className="flex items-center justify-between text-xs">
          {/* View Toggles */}
          <div className="flex items-center bg-background/80 p-0.5 rounded-lg border border-border/60 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('folder')}
              className={`p-1 rounded-md flex items-center justify-center transition-all ${viewMode === 'folder'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}`}
              title="Folder View"
            >
              <FolderIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`p-1 rounded-md flex items-center justify-center transition-all ${viewMode === 'timeline'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}`}
              title="Timeline View"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sort Control */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors border border-transparent hover:border-border/40"
              title="Sort notes"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort</span>
            </button>

            {/* Dropdown Menu */}
            {showSortDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/60 z-50 overflow-hidden p-1 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/40 mb-1">Sort By</div>

                  <button onClick={() => { setSortBy('updated-desc'); setShowSortDropdown(false) }} className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${sortBy === 'updated-desc' ? 'text-primary font-bold bg-primary/10' : 'text-foreground hover:bg-muted/50'}`}>
                    <span>Last modified (Newest)</span>
                    {sortBy === 'updated-desc' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setSortBy('updated-asc'); setShowSortDropdown(false) }} className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${sortBy === 'updated-asc' ? 'text-primary font-bold bg-primary/10' : 'text-foreground hover:bg-muted/50'}`}>
                    <span>Last modified (Oldest)</span>
                    {sortBy === 'updated-asc' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setSortBy('created-desc'); setShowSortDropdown(false) }} className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${sortBy === 'created-desc' ? 'text-primary font-bold bg-primary/10' : 'text-foreground hover:bg-muted/50'}`}>
                    <span>Date created (Newest)</span>
                    {sortBy === 'created-desc' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setSortBy('title-asc'); setShowSortDropdown(false) }} className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${sortBy === 'title-asc' ? 'text-primary font-bold bg-primary/10' : 'text-foreground hover:bg-muted/50'}`}>
                    <span>Title (A-Z)</span>
                    {sortBy === 'title-asc' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setSortBy('title-desc'); setShowSortDropdown(false) }} className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors ${sortBy === 'title-desc' ? 'text-primary font-bold bg-primary/10' : 'text-foreground hover:bg-muted/50'}`}>
                    <span>Title (Z-A)</span>
                    {sortBy === 'title-desc' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Folder Input */}
      {showCreateFolder && (
        <div className="mb-2 px-2">
          <div className="flex items-center gap-2 p-2 bg-card rounded-xl border border-primary/50 shadow-sm">
            <div className="text-primary">
              <FolderPlus className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreatingFolder && newFolderName.trim()) {
                  handleCreateFolder(creatingSubfolderFor || undefined)
                } else if (e.key === 'Escape' && !isCreatingFolder) {
                  setNewFolderName('')
                  setShowCreateFolder(false)
                  setCreatingSubfolderFor(null)
                }
              }}
              placeholder={creatingSubfolderFor ? "New Subfolder..." : "New Folder..."}
              className="flex-1 min-w-0 bg-transparent border-none p-0 text-xs focus:ring-0 placeholder:text-muted-foreground text-foreground"

              autoFocus
              disabled={isCreatingFolder}
            />
            <div className="flex items-center gap-1">
              {isCreatingFolder ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (newFolderName.trim()) {
                        handleCreateFolder(creatingSubfolderFor || undefined)
                      }
                    }}
                    disabled={!newFolderName.trim()}
                    className="p-1 hover:bg-muted text-primary rounded transition-colors disabled:opacity-30"
                    title="Create (Enter)"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setNewFolderName('')
                      setShowCreateFolder(false)
                      setCreatingSubfolderFor(null)
                    }}
                    className="p-1 hover:bg-muted text-destructive rounded transition-colors"
                    title="Cancel (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="px-2 mt-1 text-[10px] text-muted-foreground flex justify-end gap-2">
            <span>↵ Enter to save</span>
            <span>Esc to cancel</span>
          </div>
        </div>
      )}


      {/* Pinned Notes Section */}
      {viewMode === 'folder' && pinnedNoteIds.length > 0 && (
        <div className="mb-4">
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <Pin className="w-3.5 h-3.5" />
            <span>Pinned</span>
          </div>
          <div className="mt-1 space-y-0.5">
            {sortedNotes
              .filter(note => pinnedNoteIds.includes(note.id))
              .map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={onNoteSelect}
                  onDuplicateNote={onDuplicateNote}
                  onMoveNote={onMoveNote}
                  onDeleteNote={onDeleteNote}
                  onTogglePin={handleTogglePin}
                  isPinned={true}
                  hasPinService={hasPinService}
                  dateDisplayMode={dateDisplayMode}
                  onToggleDateDisplay={toggleDateDisplay}
                />
              ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'folder' ? (
        <>
          {/* Folder Tree */}
          <div className="mt-2 mb-4">
            {folderTree.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Folders
              </div>
            )}
            <div className="space-y-0.5">
              {folderTree.map((folder) => (
                <FolderNode
                  key={folder.id}
                  folder={folder}
                  level={0}
                  isExpanded={expandedFolders.has(folder.id)}
                  expandedFolders={expandedFolders}
                  notes={sortedNotes} // pass sorted notes to folders
                  onToggle={handleToggleFolder}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                  onCreateSubfolder={handleCreateSubfolder}
                  onCreateNote={onCreateNote}
                  onNoteSelect={onNoteSelect}
                  selectedNoteId={selectedNoteId}
                  onDuplicateNote={onDuplicateNote}
                  onMoveNote={onMoveNote}
                  onDeleteNote={onDeleteNote}
                  dateDisplayMode={dateDisplayMode}
                  onToggleDateDisplay={toggleDateDisplay}
                  onRenameFolderAsync={onRenameFolderProp}
                  onDeleteFolderAsync={onDeleteFolderProp}
                  onTogglePin={handleTogglePin}
                  pinnedNoteIds={pinnedNoteIds}
                  hasPinService={hasPinService}
                  noteCountByFolderId={noteCountByFolderId}
                />
              ))}
            </div>
          </div>

          {/* Root Level Notes (notes not in any folder and not pinned) */}
          {sortedNotes.filter(note => !note.folderId && !pinnedNoteIds.includes(note.id)).length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Notes
              </div>
              <div className="space-y-0.5">
                {sortedNotes
                  .filter(note => !note.folderId && !pinnedNoteIds.includes(note.id))
                  .map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      selectedNoteId={selectedNoteId}
                      onNoteSelect={onNoteSelect}
                      onDuplicateNote={onDuplicateNote}
                      onMoveNote={onMoveNote}
                      onDeleteNote={onDeleteNote}
                      onTogglePin={handleTogglePin}
                      isPinned={false}
                      hasPinService={hasPinService}
                      dateDisplayMode={dateDisplayMode}
                      onToggleDateDisplay={toggleDateDisplay}
                    />
                  ))}
              </div>
            </div>
          )}

          {folderTree.length === 0 && notes.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border mx-2">
              {getDisplayName('noFoldersYet', 'ui')}
            </div>
          )}
        </>
      ) : (
        /* Timeline View */
        <div className="mt-2">
          {sortedNotes.length > 0 ? (
            <div className="space-y-0.5">
              {sortedNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={onNoteSelect}
                  onDuplicateNote={onDuplicateNote}
                  onMoveNote={onMoveNote}
                  onDeleteNote={onDeleteNote}
                  onTogglePin={handleTogglePin}
                  isPinned={pinnedNoteIds.includes(note.id)}
                  hasPinService={hasPinService}
                  dateDisplayMode={dateDisplayMode}
                  onToggleDateDisplay={toggleDateDisplay}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border mx-2">
              No notes found.
            </div>
          )}
        </div>
      )}

    </div >
  )
}
