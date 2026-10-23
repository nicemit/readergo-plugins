'use client';

export type WhiteboardToolbarProps = {
  onAddNode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  zoomPercent: number;
};

export function WhiteboardToolbar({
  onAddNode,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetView,
  zoomPercent,
}: WhiteboardToolbarProps) {
  const btn =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-200 shadow-sm transition-colors hover:bg-slate-700/90 hover:text-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 touch-manipulation sm:px-2.5 sm:py-1.5';

  const iconBtn = `${btn} px-2.5 min-w-[2.5rem] sm:min-w-[2rem] sm:px-2`;

  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-800/80 bg-slate-950/95 px-3 py-2 backdrop-blur-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" className={btn} onClick={onAddNode}>
        <span aria-hidden className="text-sm leading-none font-semibold">
          +
        </span>
        <span className="whitespace-nowrap">Add</span>
      </button>
      <div className="mx-0.5 hidden h-4 w-px bg-slate-800 sm:block" aria-hidden />
      <button type="button" className={`${btn} hidden sm:inline-flex`} onClick={onUndo}>
        Undo
      </button>
      <button type="button" className={`${btn} hidden sm:inline-flex`} onClick={onRedo}>
        Redo
      </button>
      <div className="mx-0.5 h-4 w-px bg-slate-800" aria-hidden />
      <button type="button" className={iconBtn} onClick={onZoomOut} title="Zoom out">
        −
      </button>
      <span className="min-w-[3rem] text-center text-xs tabular-nums text-slate-400">{zoomPercent}%</span>
      <button type="button" className={iconBtn} onClick={onZoomIn} title="Zoom in">
        +
      </button>
      <button type="button" className={btn} onClick={onResetView}>
        <span className="whitespace-nowrap">Reset</span>
      </button>
    </div>
  );
}
