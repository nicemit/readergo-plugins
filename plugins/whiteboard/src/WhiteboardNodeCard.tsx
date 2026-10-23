'use client';

import React, { memo, useCallback, useEffect, useRef, useState, type PointerEventHandler } from 'react';

export type WhiteboardNodeModel = {
  id: string;
  x: number;
  y: number;
  content: string;
};

type Props = {
  node: WhiteboardNodeModel;
  zoom: number;
  selected: boolean;
  onHoverChange?: (hovered: boolean) => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onConnectStart?: (nodeId: string, clientX: number, clientY: number) => void;
  onDelete?: (nodeId: string) => void;
  onContentCommit: (id: string, content: string) => void;
};

export const WhiteboardNodeCard = memo(function WhiteboardNodeCard({
  node,
  zoom,
  selected,
  onHoverChange,
  onPointerDown,
  onConnectStart,
  onDelete,
  onContentCommit,
}: Props) {
  const [draft, setDraft] = useState(node.content);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(node.content);
    }
  }, [node.content]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-whiteboard-no-drag]')) {
        return;
      }
      onPointerDown(e);
    },
    [onPointerDown],
  );

  const handleFocus = useCallback(() => {
    editingRef.current = true;
    setDraft(node.content);
  }, [node.content]);

  const handleBlur = useCallback(() => {
    editingRef.current = false;
    const next = draft.trimEnd();
    if (next !== node.content) {
      onContentCommit(node.id, next);
    }
  }, [draft, node.content, node.id, onContentCommit]);

  return (
    <div
      data-whiteboard-node
      data-whiteboard-node-id={node.id}
      data-x={node.x}
      data-y={node.y}
      data-scale={zoom}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
      className={[
        'whiteboard-node-card absolute cursor-pointer outline-none active:cursor-grabbing',
        selected ? 'z-10' : 'z-0',
      ].join(' ')}
      style={{
        left: node.x,
        top: node.y,
      }}
    >
      <div
        className={[
          'group relative origin-top-left rounded-xl border bg-slate-900/95 p-3',
          'min-w-[160px] max-w-[240px]',
          'transition-[box-shadow,transform,border-color,opacity,filter] duration-150 ease-out',
          selected
            ? 'scale-[1.03] border-2 border-sky-400/95 opacity-100 shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_0_24px_-4px_rgba(56,189,248,0.55),0_18px_40px_-16px_rgba(0,0,0,0.65)]'
            : 'scale-100 border border-slate-600/55 opacity-[0.88] shadow-lg shadow-black/35 hover:opacity-100 hover:shadow-[0_0_20px_-6px_rgba(56,189,248,0.45)]',
          !selected && 'hover:border-slate-400/75',
        ].join(' ')}
      >
        <textarea
          data-whiteboard-no-drag
          className="w-full resize-none bg-transparent text-[13px] leading-snug text-slate-100 placeholder:text-slate-500 focus:outline-none"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Write something…"
          spellCheck={false}
        />
        <button
          type="button"
          data-whiteboard-no-drag
          className={[
            'absolute -top-2 -right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/90 text-white shadow-md',
            'touch-manipulation transition-opacity duration-150',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
          title="Delete card"
          aria-label="Delete card"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(node.id);
          }}
        >
          <span className="text-sm leading-none">×</span>
        </button>
        <button
          type="button"
          data-whiteboard-no-drag
          className={[
            'absolute -right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full',
            'cursor-crosshair touch-manipulation transition-opacity duration-150',
            selected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
          title="Drag to connect"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onConnectStart?.(node.id, e.clientX, e.clientY);
          }}
        >
          <span className="block h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.75)]" />
        </button>
      </div>
    </div>
  );
});
