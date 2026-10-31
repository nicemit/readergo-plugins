import { Editor } from '@tiptap/react'
import { showToast } from './toast'

// Image compression utility
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new window.Image()

    img.onload = () => {
      // Calculate new dimensions (max 1200px width/height for better quality)
      const maxSize = 1200
      let { width, height } = img

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress with higher quality
      ctx?.drawImage(img, 0, 0, width, height)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve(compressedDataUrl)
    }

    img.src = URL.createObjectURL(file)
  })
}

// Handle image paste from clipboard
export const handleImagePaste = async (event: ClipboardEvent, editor: Editor) => {
  const items = Array.from(event.clipboardData?.items || [])

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      event.stopPropagation()

      const file = item.getAsFile()
      if (!file) continue

      try {
        const compressedImage = await compressImage(file)
        editor.chain().focus().setImageBlock({ src: compressedImage }).run()
        showToast.success('Image pasted successfully!')
      } catch (error) {
        console.error('Error pasting image:', error)
        showToast.error('Failed to paste image')
      }
      break
    }
  }
}

// Handle mobile-specific image paste
export const handleMobileImagePaste = async (event: ClipboardEvent, editor: Editor) => {
  // Check if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (!isMobile) return

  const items = Array.from(event.clipboardData?.items || [])

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      event.stopPropagation()

      const file = item.getAsFile()
      if (!file) continue

      try {
        const compressedImage = await compressImage(file)
        editor.chain().focus().setImageBlock({ src: compressedImage }).run()
        showToast.success('Image pasted successfully!')
      } catch (error) {
        console.error('Error pasting image on mobile:', error)
        showToast.error('Failed to paste image')
      }
      break
    }
  }
}

// Handle image file selection
export const handleImageFileSelect = async (file: File, editor: Editor) => {
  try {
    const compressedImage = await compressImage(file)
    editor.chain().focus().setImageBlock({ src: compressedImage }).run()
    showToast.success('Image added successfully!')
  } catch (error) {
    console.error('Error adding image:', error)
    showToast.error('Failed to add image')
  }
}

// Create file input for image selection
export const createImageFileInput = (editor: Editor) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      await handleImageFileSelect(file, editor)
    }
  }
  input.click()
}
