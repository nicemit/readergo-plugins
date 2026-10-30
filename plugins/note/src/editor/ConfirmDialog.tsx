'use client'

import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'default'

export interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  icon?: React.ElementType
  isLoading?: boolean
  children?: React.ReactNode
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onClose,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
  icon: CustomIcon,
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [internalLoading, setInternalLoading] = useState(false)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  const isBusy = isLoading || internalLoading

  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => setIsAnimating(true))
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      setTimeout(() => {
        cancelBtnRef.current?.focus()
      }, 50)

      return () => {
        cancelAnimationFrame(frame)
        document.body.style.overflow = originalOverflow
      }
    } else {
      setIsAnimating(false)
      setInternalLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isBusy) return
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isBusy, onClose])

  if (!isOpen) return null

  const handleConfirm = async () => {
    try {
      setInternalLoading(true)
      await onConfirm()
      onClose()
    } catch {
      setInternalLoading(false)
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: CustomIcon || Trash2,
          iconBg: 'bg-red-500/10 text-red-500',
          btn: 'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-500/20 active:bg-red-700',
          defaultText: 'Delete',
        }
      case 'warning':
        return {
          icon: CustomIcon || AlertTriangle,
          iconBg: 'bg-amber-500/10 text-amber-500',
          btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-500/20 active:bg-amber-700',
          defaultText: 'Confirm',
        }
      case 'info':
        return {
          icon: CustomIcon || Info,
          iconBg: 'bg-blue-500/10 text-blue-500',
          btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 active:bg-blue-700',
          defaultText: 'Continue',
        }
      default:
        return {
          icon: CustomIcon || AlertTriangle,
          iconBg: 'bg-accent/10 text-accent',
          btn: 'bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm active:opacity-90',
          defaultText: 'Confirm',
        }
    }
  }

  const vStyles = getVariantStyles()
  const IconComponent = vStyles.icon
  const resolvedConfirmText = confirmText || vStyles.defaultText

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isAnimating ? 'bg-background/80 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className={`w-full max-w-md transform overflow-hidden rounded-2xl border border-border bg-card p-6 text-left align-middle shadow-2xl transition-all duration-200 ease-out ${
          isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${vStyles.iconBg}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-semibold leading-6 text-foreground">
              {title}
            </h3>
            {description && (
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            )}
            {children && <div className="mt-3">{children}</div>}
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg p-1 text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleConfirm}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${vStyles.btn}`}
          >
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
