import React, { forwardRef } from 'react';
import type { Editor } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'ghost' | 'outline' | 'default';
  'data-active'?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ tooltip, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = 'ToolbarButton';

export const Toolbar = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      role="toolbar"
      aria-label="editor toolbar"
      className={`flex flex-wrap items-center gap-1 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
Toolbar.displayName = 'Toolbar';

export const ToolbarGroup = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={`flex items-center gap-0.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
ToolbarGroup.displayName = 'ToolbarGroup';

export const ToolbarSeparator = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      className={`h-5 w-[1px] bg-border mx-1 ${className}`}
      {...props}
    />
  )
);
ToolbarSeparator.displayName = 'ToolbarSeparator';

export function HeadingButton({
  level,
  editor,
  size,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  editor: Editor;
  size?: string;
}) {
  const isActive = editor.isActive('heading', { level });
  return (
    <Button
      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
      disabled={!editor.can().chain().focus().toggleHeading({ level }).run()}
      data-active={isActive ? 'true' : undefined}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-accent text-accent-foreground font-bold' : ''}`}
      tooltip={`Heading ${level}`}
    >
      <span className="text-xs font-bold">H{level}</span>
    </Button>
  );
}

export function TextAlignButton({
  align,
  editor,
  size,
}: {
  align: 'left' | 'center' | 'right' | 'justify';
  editor: Editor;
  size?: string;
}) {
  const isActive = editor.isActive({ textAlign: align });
  const Icon =
    align === 'center'
      ? AlignCenter
      : align === 'right'
      ? AlignRight
      : align === 'justify'
      ? AlignJustify
      : AlignLeft;

  const label =
    align === 'left'
      ? 'Align Left'
      : align === 'center'
      ? 'Align Center'
      : align === 'right'
      ? 'Align Right'
      : 'Align Justify';

  return (
    <Button
      onClick={() => (editor.chain().focus() as any).setTextAlign?.(align).run()}
      data-active={isActive ? 'true' : undefined}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
      tooltip={label}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
}
