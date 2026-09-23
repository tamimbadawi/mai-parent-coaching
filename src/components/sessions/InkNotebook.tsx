import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import {
  RotateCcw,
  RotateCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Sparkles,
  Eraser,
  PenLine,
  Highlighter,
} from 'lucide-react';
import type { InkPage, InkStroke, InkPoint, InkTool } from '../../types/ink';
import { INK_PAGE_WIDTH, INK_PAGE_HEIGHT, INK_COLORS } from '../../types/ink';

interface InkNotebookProps {
  initialPages: InkPage[];
  initialPageIndex?: number;
  onSave: (pages: InkPage[]) => Promise<boolean>;
  onClose: (pages: InkPage[]) => void;
  onConvertToText?: (page: InkPage) => Promise<void>;
  sessionNumber?: number;
}

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

export const InkNotebook: React.FC<InkNotebookProps> = ({
  initialPages,
  initialPageIndex = 0,
  onSave,
  onClose,
  onConvertToText,
  sessionNumber,
}) => {
  // Container & Fullscreen refs
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Pages state
  const [pages, setPages] = useState<InkPage[]>(() => {
    if (initialPages && initialPages.length > 0) {
      return initialPages;
    }
    return [{ id: `page-${Date.now()}`, pageNumber: 1, strokes: [] }];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(() => {
    if (initialPageIndex >= 0 && initialPageIndex < (initialPages?.length || 1)) {
      return initialPageIndex;
    }
    return 0;
  });

  const currentPage = pages[currentPageIndex] || pages[0];

  // Tool & Palette state
  const [selectedTool, setSelectedTool] = useState<InkTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>(INK_COLORS.charcoal);

  // Drawing state
  const [currentPoints, setCurrentPoints] = useState<InkPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [forceShowToolbar, setForceShowToolbar] = useState(false);

  // History for Undo / Redo
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  // Save status & debounce ref
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('saved');
  const isDirtyRef = useRef(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestPagesRef = useRef<InkPage[]>(pages);
  latestPagesRef.current = pages;

  // Converting to text state
  const [isConverting, setIsConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(false);

  // Fit page scaling
  const [pageSize, setPageSize] = useState({ width: INK_PAGE_WIDTH, height: INK_PAGE_HEIGHT, scale: 1 });

  const updatePageSize = useCallback(() => {
    if (!workspaceRef.current) return;
    const { clientWidth, clientHeight } = workspaceRef.current;
    if (!clientWidth || !clientHeight) return;

    // Available canvas padding
    const paddingX = 32;
    const paddingY = 80;
    const availableW = Math.max(200, clientWidth - paddingX);
    const availableH = Math.max(200, clientHeight - paddingY);

    const scale = Math.min(availableW / INK_PAGE_WIDTH, availableH / INK_PAGE_HEIGHT);
    setPageSize({
      width: Math.round(INK_PAGE_WIDTH * scale),
      height: Math.round(INK_PAGE_HEIGHT * scale),
      scale,
    });
  }, []);

  useEffect(() => {
    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, [updatePageSize]);

  // Request Fullscreen on mount
  useEffect(() => {
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Fullscreen API may be blocked without user activation; fallback overlay handles it
      });
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Autosave execution
  const executeAutosave = useCallback(async (pagesToSave: InkPage[]) => {
    if (!isDirtyRef.current) return;
    setSaveStatus('saving');
    try {
      const ok = await onSave(pagesToSave);
      if (ok) {
        isDirtyRef.current = false;
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [onSave]);

  const scheduleAutosave = useCallback((updatedPages: InkPage[]) => {
    isDirtyRef.current = true;
    setSaveStatus('unsaved');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      void executeAutosave(updatedPages);
    }, 2000);
  }, [executeAutosave]);

  // Handle Done / Close with guaranteed save
  const handleDone = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    if (isDirtyRef.current) {
      setSaveStatus('saving');
      try {
        await onSave(latestPagesRef.current);
        isDirtyRef.current = false;
      } catch (err) {
        console.error('Failed to save on exit:', err);
      }
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose(latestPagesRef.current);
  }, [onClose, onSave]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void handleDone();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDone]);

  // Update current page strokes
  const updateCurrentPageStrokes = useCallback(
    (newStrokes: InkStroke[]) => {
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === currentPageIndex
            ? { ...p, strokes: newStrokes, updatedAt: new Date().toISOString() }
            : p
        );
        scheduleAutosave(next);
        return next;
      });
    },
    [currentPageIndex, scheduleAutosave]
  );

  // Erase whole strokes near point (Surface Pen eraser or tool)
  const eraseStrokesAt = useCallback(
    (pt: InkPoint) => {
      const radius = 24; // logical coordinate radius
      const currentStrokes = currentPage.strokes;
      const filtered = currentStrokes.filter((stroke) => {
        return !stroke.points.some((p) => {
          const dx = p.x - pt.x;
          const dy = p.y - pt.y;
          return dx * dx + dy * dy < radius * radius;
        });
      });

      if (filtered.length !== currentStrokes.length) {
        setUndoStack((prev) => [...prev, currentStrokes]);
        setRedoStack([]);
        updateCurrentPageStrokes(filtered);
      }
    },
    [currentPage.strokes, updateCurrentPageStrokes]
  );

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // 1. Palm Rejection: Ignore touch completely. Pen and Mouse only.
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    setIsDrawing(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * INK_PAGE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * INK_PAGE_HEIGHT;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : (e.pointerType === 'pen' ? 0.5 : 0.5);

    const pt: InkPoint = { x, y, pressure };

    // Check if Surface Pen physical eraser is engaged (buttons & 32 or button === 5)
    const isEraser = selectedTool === 'eraser' || (e.buttons & 32) !== 0 || e.button === 5;

    if (isEraser) {
      eraseStrokesAt(pt);
      return;
    }

    setCurrentPoints([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * INK_PAGE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * INK_PAGE_HEIGHT;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : (e.pointerType === 'pen' ? 0.5 : 0.5);

    const pt: InkPoint = { x, y, pressure };

    // Check eraser mode
    const isEraser = selectedTool === 'eraser' || (e.buttons & 32) !== 0 || e.button === 5;

    if (isEraser) {
      eraseStrokesAt(pt);
      return;
    }

    setCurrentPoints((prev) => [...prev, pt]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }

    const isEraser = selectedTool === 'eraser' || (e.buttons & 32) !== 0 || e.button === 5;
    if (isEraser) {
      setCurrentPoints([]);
      return;
    }

    if (currentPoints.length > 0) {
      const newStroke: InkStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool: selectedTool,
        color: selectedTool === 'highlighter' ? INK_COLORS.highlighter : selectedColor,
        size: selectedTool === 'highlighter' ? 22 : 4.5,
        points: currentPoints,
      };

      setUndoStack((prev) => [...prev, currentPage.strokes]);
      setRedoStack([]);
      updateCurrentPageStrokes([...currentPage.strokes, newStroke]);
    }

    setCurrentPoints([]);
  };

  // Undo / Redo Handlers
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevStrokes = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, currentPage.strokes]);
    updateCurrentPageStrokes(prevStrokes);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextStrokes = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, currentPage.strokes]);
    updateCurrentPageStrokes(nextStrokes);
  };

  // Page Switchers
  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  const handleAddPage = () => {
    const newPage: InkPage = {
      id: `page-${Date.now()}`,
      pageNumber: pages.length + 1,
      strokes: [],
      createdAt: new Date().toISOString(),
    };
    const nextPages = [...pages, newPage];
    setPages(nextPages);
    setCurrentPageIndex(nextPages.length - 1);
    setUndoStack([]);
    setRedoStack([]);
    scheduleAutosave(nextPages);
  };

  // Convert to text action
  const handleConvertPage = async () => {
    if (!onConvertToText || isConverting) return;
    setIsConverting(true);
    setConvertSuccess(false);
    try {
      await onConvertToText(currentPage);
      setConvertSuccess(true);
      setTimeout(() => setConvertSuccess(false), 3000);
    } catch (err) {
      console.error('Convert to text error:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Active in-progress stroke path
  const activeStrokePath = useMemo(() => {
    if (currentPoints.length === 0) return '';
    const strokeOptions = {
      size: selectedTool === 'highlighter' ? 22 : 4.5,
      thinning: selectedTool === 'highlighter' ? 0 : 0.6,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: selectedTool !== 'highlighter',
    };
    const outline = getStroke(
      currentPoints.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
      strokeOptions
    );
    return getSvgPathFromStroke(outline);
  }, [currentPoints, selectedTool]);

  // Pre-generate SVG ruled lines (from y=120 to 1080 every 36px)
  const ruledLines = useMemo(() => {
    const lines: number[] = [];
    for (let y = 126; y <= 1080; y += 36) {
      lines.push(y);
    }
    return lines;
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#1e1c1b] text-charcoal flex flex-col items-center select-none overflow-hidden touch-none"
    >
      {/* Top Hover Sensor (keeps toolbar accessible if hovered) */}
      <div
        onMouseEnter={() => setForceShowToolbar(true)}
        onMouseLeave={() => setForceShowToolbar(false)}
        className="absolute top-0 left-0 right-0 h-14 z-30 pointer-events-auto"
      />

      {/* Floating Slim Toolbar (auto-hides during active drawing) */}
      <div
        className={`absolute top-3 z-40 transition-all duration-300 ease-out max-w-4xl px-3 sm:px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-beige/80 shadow-xl flex items-center gap-2 sm:gap-3 flex-wrap justify-between ${
          isDrawing && !forceShowToolbar
            ? '-translate-y-10 opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        {/* Left Section: Tools & Palette */}
        <div className="flex items-center gap-1.5">
          {/* Pen Tool Button */}
          <button
            type="button"
            onClick={() => setSelectedTool('pen')}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              selectedTool === 'pen'
                ? 'bg-charcoal text-white shadow-2xs'
                : 'text-charcoal/70 hover:bg-beige/40'
            }`}
            title="Pen (Pressure-Sensitive)"
          >
            <PenLine className="w-4 h-4" />
          </button>

          {/* Color Swatches (for Pen) */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#faf8f4] border border-beige/60">
            {/* Charcoal */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('pen');
                setSelectedColor(INK_COLORS.charcoal);
              }}
              className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                selectedTool === 'pen' && selectedColor === INK_COLORS.charcoal
                  ? 'ring-2 ring-sage-dark scale-110 border-white'
                  : 'border-charcoal/20 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: INK_COLORS.charcoal }}
              title="Charcoal Ink"
            />
            {/* Sage */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('pen');
                setSelectedColor(INK_COLORS.sage);
              }}
              className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                selectedTool === 'pen' && selectedColor === INK_COLORS.sage
                  ? 'ring-2 ring-sage-dark scale-110 border-white'
                  : 'border-charcoal/20 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: INK_COLORS.sage }}
              title="Sage Ink"
            />
            {/* Terracotta */}
            <button
              type="button"
              onClick={() => {
                setSelectedTool('pen');
                setSelectedColor(INK_COLORS.terracotta);
              }}
              className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                selectedTool === 'pen' && selectedColor === INK_COLORS.terracotta
                  ? 'ring-2 ring-sage-dark scale-110 border-white'
                  : 'border-charcoal/20 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: INK_COLORS.terracotta }}
              title="Terracotta Ink"
            />
          </div>

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => setSelectedTool('highlighter')}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedTool === 'highlighter'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs font-semibold'
                : 'text-charcoal/70 hover:bg-beige/40'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline text-[11px]">Highlight</span>
          </button>

          {/* Eraser */}
          <button
            type="button"
            onClick={() => setSelectedTool('eraser')}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedTool === 'eraser'
                ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs font-semibold'
                : 'text-charcoal/70 hover:bg-beige/40'
            }`}
            title="Eraser (or use pen eraser end)"
          >
            <Eraser className="w-4 h-4 text-rose-700" />
            <span className="hidden sm:inline text-[11px]">Eraser</span>
          </button>
        </div>

        {/* Center: History & Page Navigation */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-beige/80 pr-2">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Switcher */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPageIndex === 0}
              onClick={handlePrevPage}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cream border border-beige text-charcoal/80">
              Page {currentPageIndex + 1} of {pages.length}
            </span>
            <button
              type="button"
              disabled={currentPageIndex === pages.length - 1}
              onClick={handleNextPage}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAddPage}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-dark hover:bg-sage/15 px-2 py-1 rounded-lg border border-sage/40 transition cursor-pointer"
              title="Add New Blank Page"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Right Section: Status, OCR & Done */}
        <div className="flex items-center gap-2">
          {/* Autosave Status */}
          <div className="flex items-center text-[10px] font-mono">
            {saveStatus === 'saving' && (
              <span className="text-sage-dark flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-700 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {saveStatus === 'unsaved' && <span className="text-amber-700">Unsaved</span>}
            {saveStatus === 'error' && (
              <span className="text-rose-700 flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3" /> Error saving
              </span>
            )}
          </div>

          {/* Convert to text (optional per page) */}
          {onConvertToText && (
            <button
              type="button"
              disabled={isConverting || currentPage.strokes.length === 0}
              onClick={handleConvertPage}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark transition cursor-pointer disabled:opacity-40"
              title="Transcribe current ink page via Gemini OCR"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-dark" />
                  <span className="hidden sm:inline">Transcribing...</span>
                </>
              ) : convertSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-700">Transcribed!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sage-dark" />
                  <span className="hidden sm:inline">Convert to Text</span>
                </>
              )}
            </button>
          )}

          {/* Done Button */}
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl bg-charcoal text-white hover:bg-charcoal/90 transition cursor-pointer shadow-xs"
            title="Save & Return to Session (Esc)"
          >
            <Check className="w-3.5 h-3.5 text-sage" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* Main Workspace with Scaled Cream Paper */}
      <div
        ref={workspaceRef}
        className="flex-1 w-full flex items-center justify-center relative min-h-0 overflow-hidden"
      >
        <div
          className="relative shadow-2xl rounded-sm overflow-hidden border border-[#E2DBD0]"
          style={{
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
            backgroundColor: '#FAF8F4',
          }}
        >
          {/* Surface Note-Taking SVG Canvas */}
          <svg
            viewBox={`0 0 ${INK_PAGE_WIDTH} ${INK_PAGE_HEIGHT}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`w-full h-full block touch-none select-none ${
              selectedTool === 'eraser' ? 'cursor-crosshair' : 'cursor-crosshair'
            }`}
          >
            {/* Paper Background */}
            <rect width={INK_PAGE_WIDTH} height={INK_PAGE_HEIGHT} fill="#FAF8F4" />

            {/* Faint Red/Terracotta Margin Line */}
            <line
              x1="76"
              y1="0"
              x2="76"
              y2={INK_PAGE_HEIGHT}
              stroke="rgba(184, 92, 66, 0.22)"
              strokeWidth="1.2"
            />

            {/* Top Header Separator */}
            <line
              x1="0"
              y1="90"
              x2={INK_PAGE_WIDTH}
              y2="90"
              stroke="rgba(184, 92, 66, 0.25)"
              strokeWidth="1.4"
            />

            {/* Ruled Horizontal Lines */}
            {ruledLines.map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2={INK_PAGE_WIDTH}
                y2={y}
                stroke="rgba(170, 155, 140, 0.22)"
                strokeWidth="0.8"
              />
            ))}

            {/* Page Header text indicator */}
            <text
              x="90"
              y="60"
              fill="rgba(120, 110, 100, 0.55)"
              fontSize="14"
              fontFamily="serif"
              fontStyle="italic"
            >
              {sessionNumber ? `Session #${sessionNumber} Notes` : 'Clinical Notes'} · Page {currentPageIndex + 1}
            </text>

            {/* Render Saved Strokes */}
            {currentPage.strokes.map((stroke) => {
              const strokeOptions = {
                size: stroke.tool === 'highlighter' ? 22 : stroke.size || 4.5,
                thinning: stroke.tool === 'highlighter' ? 0 : 0.6,
                smoothing: 0.5,
                streamline: 0.5,
                simulatePressure: stroke.tool !== 'highlighter',
              };
              const outline = getStroke(
                stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
                strokeOptions
              );
              const pathData = getSvgPathFromStroke(outline);
              const isHighlighter = stroke.tool === 'highlighter';

              return (
                <path
                  key={stroke.id}
                  d={pathData}
                  fill={isHighlighter ? 'rgba(217, 119, 6, 0.38)' : stroke.color || '#232120'}
                  style={isHighlighter ? { mixBlendMode: 'multiply' } : undefined}
                />
              );
            })}

            {/* Render In-Progress Stroke */}
            {activeStrokePath && (
              <path
                d={activeStrokePath}
                fill={
                  selectedTool === 'highlighter'
                    ? 'rgba(217, 119, 6, 0.38)'
                    : selectedTool === 'eraser'
                    ? 'transparent'
                    : selectedColor
                }
                style={selectedTool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Subtle Bottom Bar Help Text */}
      <div className="p-2 text-center text-[11px] text-warm-gray/60 font-mono flex items-center justify-center gap-4">
        <span>Draw with Pen or Mouse (palm touch rejected)</span>
        <span>·</span>
        <span>Surface Pen eraser flips to erase whole strokes</span>
        <span>·</span>
        <span>Press Esc to Save & Exit</span>
      </div>
    </div>
  );
};
