import React, { useState, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { createImageFileInput, handleImageFileSelect } from './imageUtils'
import { showToast } from './toast'

interface MobileImageUploadProps {
  editor: Editor
  className?: string
}

export function MobileImageUpload({ editor, className = '' }: MobileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast.error('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      showToast.error('Image size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      await handleImageFileSelect(file, editor)
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const openImagePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        disabled={isUploading}
      />

      {/* Mobile Image Upload Button */}
      {/* <button
        onClick={openImagePicker}
        disabled={isUploading}
        className={`fixed bottom-20 right-4 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${className}`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'
        }}
        title="Upload Image"
      >
        {isUploading ? (
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </button> */}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="fixed bottom-20 right-20 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 flex items-center space-x-2">
          <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm text-gray-700 dark:text-gray-300">Uploading...</span>
        </div>
      )}
    </>
  )
}
