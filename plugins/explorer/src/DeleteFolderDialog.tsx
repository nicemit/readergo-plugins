'use client'

import React, { useEffect, useState } from 'react'
import { Trash2, AlertTriangle, Folder, FileText, X } from 'lucide-react'
import { useDisplayName } from '@/components/providers/I18nProvider'

interface DeleteFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  folderName: string
  noteCount: number
  subfolderCount: number
}

export function DeleteFolderDialog({
  isOpen,
  onClose,
  onConfirm,
  folderName,
  noteCount,
  subfolderCount,
}: DeleteFolderDialogProps) {
  const getDisplayName = useDisplayName()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => setIsAnimating(true))
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        cancelAnimationFrame(frame)
        document.body.style.overflow = originalOverflow
      }
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
    }, 150)
  }

  const handleConfirm = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onConfirm()
    }, 150)
  }

  const hasContent = noteCount > 0 || subfolderCount > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Delete folder confirmation"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-md bg-card border border-border/60 text-card-foreground rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 z-10 ${
          isAnimating
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-border/40">
          <div className="flex items-center space-x-3.5 pr-4">
            <div className="w-11 h-11 rounded-xl border border-destructive/25 bg-destructive/15 text-destructive flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-lg font-bold text-foreground leading-snug"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {getDisplayName('deleteFolder', 'ui') || 'Delete Folder'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getDisplayName('deleteFolderConfirm', 'ui') || 'Are you sure you want to delete this folder?'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 -mr-1 -mt-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-muted/30 border border-border/50 rounded-xl">
            <Folder className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {folderName}
              </p>

              {hasContent && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    {getDisplayName('folderContains', 'ui') || 'This folder contains'}:
                  </p>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {noteCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-background border border-border/60 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5 mr-1 text-primary" />
                        {noteCount} {noteCount === 1 ? (getDisplayName('note', 'ui') || 'note') : (getDisplayName('notes', 'ui') || 'notes')}
                      </span>
                    )}

                    {subfolderCount > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-background border border-border/60 text-muted-foreground">
                        <Folder className="w-3.5 h-3.5 mr-1 text-primary" />
                        {subfolderCount} {subfolderCount === 1 ? (getDisplayName('subfolder', 'ui') || 'subfolder') : (getDisplayName('subfolders', 'ui') || 'subfolders')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-xs text-destructive font-medium leading-relaxed">
              {getDisplayName('deleteFolderWarning', 'ui') || 'This action cannot be undone. All notes and subfolders will be permanently deleted.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border/40 bg-muted/15">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border/70 hover:bg-muted/60 active:scale-[0.98] rounded-xl transition-all min-h-[42px]"
          >
            {getDisplayName('cancel', 'ui') || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2.5 text-sm font-bold text-destructive-foreground bg-destructive hover:bg-destructive/90 active:scale-[0.98] rounded-xl shadow-lg shadow-destructive/20 transition-all flex items-center justify-center gap-2 min-h-[42px]"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            <Trash2 className="w-4 h-4" />
            <span>{getDisplayName('delete', 'ui') || 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
