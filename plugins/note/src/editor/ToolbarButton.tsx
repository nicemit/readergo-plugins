import React from 'react'

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'danger' | 'success'
  /** `compact` is the touch-sized variant used by the mobile toolbar. */
  size?: 'default' | 'compact'
}

export function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
  className = '',
  variant = 'default',
  size = 'default'
}: ToolbarButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'danger':
        return 'text-destructive hover:bg-destructive/10'
      case 'success':
        return 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
      default:
        return isActive
          ? 'bg-primary/15 text-primary'
          : 'text-foreground/70 hover:text-foreground hover:bg-foreground/10'
    }
  }

  const sizeClasses =
    size === 'compact'
      ? 'h-9 w-9 flex items-center justify-center'
      : 'p-2'

  const baseClasses = 'rounded-lg transition-colors duration-150 flex-shrink-0'
  const disabledClasses = disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${getVariantClasses()} ${disabledClasses} ${className}`}
      title={title}
      aria-label={title}
      aria-pressed={isActive || undefined}
    >
      {children}
    </button>
  )
}
