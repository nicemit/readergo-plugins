'use client'

import React from 'react'
import { Link2 } from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'

interface FloatingActionButtonsProps {
  onShare?: () => void
  onDelete?: () => void
  onImportArticle?: () => void
  showShareButton?: boolean
  showDeleteButton?: boolean
  showImportButton?: boolean
}

export function FloatingActionButtons({
  onShare,
  onDelete,
  onImportArticle,
  showShareButton = true,
  showDeleteButton = true,
  showImportButton = false
}: FloatingActionButtonsProps) {
  const hasAnyButton = (showShareButton && onShare) || (showDeleteButton && onDelete) || (showImportButton && onImportArticle)
  
  if (!hasAnyButton) return null
  
  return (
    <div className="hidden sm:flex absolute bottom-8 right-8 flex-col p-3 border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-sm rounded-lg z-30">
      {/* Import Article Button */}
      {showImportButton && onImportArticle && (
        <ToolbarButton onClick={onImportArticle} title="Import article from URL">
          <Link2 className="w-5 h-5" />
        </ToolbarButton>
      )}
      
      {/* Separator */}
      {showImportButton && showShareButton && onImportArticle && onShare && (
        <div className="h-px bg-gray-300 dark:bg-gray-600 my-2"></div>
      )}
      
      {/* Share Button */}
      {showShareButton && onShare && (
        <ToolbarButton onClick={onShare} title="Share note">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </ToolbarButton>
      )}
      
      {/* Separator */}
      {showShareButton && showDeleteButton && onShare && onDelete && (
        <div className="h-px bg-gray-300 dark:bg-gray-600 my-2"></div>
      )}
      
      {/* Delete Button */}
      {showDeleteButton && onDelete && (
        <ToolbarButton onClick={onDelete} variant="danger" title="Delete note">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </ToolbarButton>
      )}
    </div>
  )
}

