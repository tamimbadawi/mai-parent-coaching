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
  Sparkles,
  Eraser,
  PenLine,
  Highlighter,
  Smile,
} from 'lucide-react';
import type {
  InkPage,
  InkStroke,
  InkPoint,
  InkTool,
  InkStamp,
  PaperStyle,
  PenSize,
  StampEmoji,
} from '../../types/ink';
import {
  INK_PAGE_WIDTH,
  INK_PAGE_HEIGHT,
  INK_COLORS,
  PEN_SIZES,
  STAMP_EMOJIS,
} from '../../types/ink';

interface InkNotebookProps {
  initialPages: InkPage[];
  initialPageIndex?: number;
  onSave: (pages: InkPage[]) => Promise<boolean>;
  onClose: (pages: InkPage[]) => void;
  onConvertToText?: (page: InkPage) => Promise<void>;
  sessionNumber?: number;
}

function getStoredPref<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setStoredPref(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage exceptions
  }
}

const COLOR_OPTIONS: { id: string; label: string; hex: string }[] = [
  { id: 'charcoal', label: 'Charcoal', hex: INK_COLORS.charcoal },
  { id: 'sage', label: 'Sage', hex: INK_COLORS.sage },
  { id: 'terracotta', label: 'Terracotta', hex: INK_COLORS.terracotta },
  { id: 'dustyRose', label: 'Dusty Rose', hex: INK_COLORS.dustyRose },
  { id: 'oceanBlue', label: 'Ocean Blue', hex: INK_COLORS.oceanBlue },
  { id: 'plum', label: 'Plum', hex: INK_COLORS.plum },
];

const SIZE_OPTIONS: { id: PenSize; label: string; dotPx: number }[] = [
  { id: 'fine', label: 'Fine (2.8px)', dotPx: 3 },
  { id: 'medium', label: 'Medium (4.8px)', dotPx: 5 },
  { id: 'bold', label: 'Bold (7.5px)', dotPx: 8 },
];

const PAPER_OPTIONS: { id: PaperStyle; label: string }[] = [
  { id: 'lined', label: 'Lined' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'grid', label: 'Grid' },
  { id: 'blank', label: 'Blank' },
];

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

  // Pages state (with defaults for paperStyle, stamps, and createdAt)
  const [pages, setPages] = useState<InkPage[]>(() => {
    if (initialPages && initialPages.length > 0) {
      return initialPages.map((p) => ({
        ...p,
        strokes: p.strokes || [],
        stamps: p.stamps || [],
        paperStyle: p.paperStyle || 'lined',
        createdAt: p.createdAt || new Date().toISOString(),
      }));
    }
    return [
      {
        id: `page-${Date.now()}`,
        pageNumber: 1,
        strokes: [],
        stamps: [],
        paperStyle: 'lined',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(() => {
    if (initialPageIndex >= 0 && initialPageIndex < (initialPages?.length || 1)) {
      return initialPageIndex;
    }
    return 0;
  });

  const currentPage = pages[currentPageIndex] || pages[0];

  // Tool & Preferences state with localStorage persistence
  const [selectedTool, setSelectedTool] = useState<InkTool>(() =>
    getStoredPref<InkTool>('mai_ink_tool', 'pen')
  );
  const [selectedColor, setSelectedColor] = useState<string>(() =>
    getStoredPref<string>('mai_ink_color', INK_COLORS.charcoal)
  );
  const [selectedPenSize, setSelectedPenSize] = useState<PenSize>(() =>
    getStoredPref<PenSize>('mai_ink_size', 'medium')
  );
  const [selectedStamp, setSelectedStamp] = useState<StampEmoji>(() =>
    getStoredPref<StampEmoji>('mai_ink_stamp', '⭐')
  );

  // Active dragging stamp state
  const [activeStamp, setActiveStamp] = useState<InkStamp | null>(null);
  const activeStampRef = useRef<InkStamp | null>(null);

  // Drawing state
  const [currentPoints, setCurrentPoints] = useState<InkPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [forceShowToolbar, setForceShowToolbar] = useState(false);

  // Unified History for Undo / Redo (strokes and stamps)
  const [undoStack, setUndoStack] = useState<{ strokes: InkStroke[]; stamps: InkStamp[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ strokes: InkStroke[]; stamps: InkStamp[] }[]>([]);

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
        // Fullscreen API may be blocked without user activation
      });
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Preference change helpers
  const handleSelectTool = (t: InkTool) => {
    setSelectedTool(t);
    setStoredPref('mai_ink_tool', t);
  };

  const handleSelectColor = (c: string) => {
    setSelectedColor(c);
    setStoredPref('mai_ink_color', c);
  };

  const handleSelectSize = (s: PenSize) => {
    setSelectedPenSize(s);
    setStoredPref('mai_ink_size', s);
  };

  const handleSelectStamp = (st: StampEmoji) => {
    setSelectedStamp(st);
    setStoredPref('mai_ink_stamp', st);
  };

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
        const ok = await onSave(latestPagesRef.current);
        if (ok) {
          isDirtyRef.current = false;
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Failed to save on exit:', err);
        setSaveStatus('error');
      }
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose(latestPagesRef.current);
  }, [onClose, onSave]);

  // Unified page data updater
  const updateCurrentPageData = useCallback(
    (updates: Partial<InkPage>) => {
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === currentPageIndex
            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
            : p
        );
        latestPagesRef.current = next;
        scheduleAutosave(next);
        return next;
      });
    },
    [currentPageIndex, scheduleAutosave]
  );

  // Switch Paper Style for current page
  const handleSetPaperStyle = (style: PaperStyle) => {
    updateCurrentPageData({ paperStyle: style });
  };

  // Erase strokes and stamps near point
  const eraseStrokesAndStampsAt = useCallback(
    (pt: InkPoint) => {
      const strokeRadius = 24;
      const currentStrokes = currentPage.strokes;
      const filteredStrokes = currentStrokes.filter((stroke) => {
        return !stroke.points.some((p) => {
          const dx = p.x - pt.x;
          const dy = p.y - pt.y;
          return dx * dx + dy * dy < strokeRadius * strokeRadius;
        });
      });

      const stampRadius = 32;
      const currentStamps = currentPage.stamps || [];
      const filteredStamps = currentStamps.filter((stamp) => {
        const dx = stamp.x - pt.x;
        const dy = stamp.y - pt.y;
        return dx * dx + dy * dy >= stampRadius * stampRadius;
      });

      if (
        filteredStrokes.length !== currentStrokes.length ||
        filteredStamps.length !== currentStamps.length
      ) {
        setUndoStack((prev) => [
          ...prev,
          { strokes: currentStrokes, stamps: currentStamps },
        ]);
        setRedoStack([]);
        updateCurrentPageData({
          strokes: filteredStrokes,
          stamps: filteredStamps,
        });
      }
    },
    [currentPage.strokes, currentPage.stamps, updateCurrentPageData]
  );

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    setIsDrawing(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * INK_PAGE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * INK_PAGE_HEIGHT;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    const pt: InkPoint = { x, y, pressure };

    // Check eraser mode (Surface Pen eraser end or eraser tool)
    const isEraser = selectedTool === 'eraser' || (e.buttons & 32) !== 0 || e.button === 5;
    if (isEraser) {
      eraseStrokesAndStampsAt(pt);
      return;
    }

    // Check stamp tool mode
    if (selectedTool === 'stamp') {
      const newStamp: InkStamp = {
        id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'stamp',
        emoji: selectedStamp,
        x: Math.round(x),
        y: Math.round(y),
      };
      activeStampRef.current = newStamp;
      setActiveStamp(newStamp);
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
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    const pt: InkPoint = { x, y, pressure };

    // Check eraser mode
    const isEraser = selectedTool === 'eraser' || (e.buttons & 32) !== 0 || e.button === 5;
    if (isEraser) {
      eraseStrokesAndStampsAt(pt);
      return;
    }

    // Check stamp tool mode (draggable while pen is down)
    if (selectedTool === 'stamp' && activeStampRef.current) {
      const updatedStamp: InkStamp = {
        ...activeStampRef.current,
        x: Math.round(x),
        y: Math.round(y),
      };
      activeStampRef.current = updatedStamp;
      setActiveStamp(updatedStamp);
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

    // Commit stamp
    if (selectedTool === 'stamp' && activeStampRef.current) {
      const stampToCommit = activeStampRef.current;
      activeStampRef.current = null;
      setActiveStamp(null);

      const prevStamps = currentPage.stamps || [];
      const updatedStamps = [...prevStamps, stampToCommit];

      setUndoStack((prev) => [
        ...prev,
        { strokes: currentPage.strokes, stamps: prevStamps },
      ]);
      setRedoStack([]);

      updateCurrentPageData({ stamps: updatedStamps });
      return;
    }

    // Commit stroke
    if (currentPoints.length > 0) {
      const strokeSize =
        selectedTool === 'highlighter' ? 22 : PEN_SIZES[selectedPenSize] || 4.8;
      const strokeColor =
        selectedTool === 'highlighter' ? INK_COLORS.highlighter : selectedColor;

      const newStroke: InkStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool: selectedTool,
        color: strokeColor,
        size: strokeSize,
        points: currentPoints,
      };

      setUndoStack((prev) => [
        ...prev,
        { strokes: currentPage.strokes, stamps: currentPage.stamps || [] },
      ]);
      setRedoStack([]);

      updateCurrentPageData({ strokes: [...currentPage.strokes, newStroke] });
    }

    setCurrentPoints([]);
  };

  // Undo / Redo Handlers (supports both strokes and stamps)
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevSnapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [
      ...prev,
      { strokes: currentPage.strokes, stamps: currentPage.stamps || [] },
    ]);
    updateCurrentPageData({
      strokes: prevSnapshot.strokes,
      stamps: prevSnapshot.stamps,
    });
  }, [currentPage.strokes, currentPage.stamps, undoStack, updateCurrentPageData]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [
      ...prev,
      { strokes: currentPage.strokes, stamps: currentPage.stamps || [] },
    ]);
    updateCurrentPageData({
      strokes: nextSnapshot.strokes,
      stamps: nextSnapshot.stamps,
    });
  }, [currentPage.strokes, currentPage.stamps, redoStack, updateCurrentPageData]);

  // Keyboard shortcuts (Escape, Undo Ctrl+Z, Redo Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void handleDone();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDone, handleUndo, handleRedo]);

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
    const defaultPaper = currentPage.paperStyle || 'lined';
    const newPage: InkPage = {
      id: `page-${Date.now()}`,
      pageNumber: pages.length + 1,
      strokes: [],
      stamps: [],
      paperStyle: defaultPaper,
      createdAt: new Date().toISOString(),
    };
    const nextPages = [...pages, newPage];
    latestPagesRef.current = nextPages;
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
      const pageToConvert = latestPagesRef.current[currentPageIndex] || currentPage;
      await onConvertToText(pageToConvert);
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
      size: selectedTool === 'highlighter' ? 22 : PEN_SIZES[selectedPenSize] || 4.8,
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
  }, [currentPoints, selectedTool, selectedPenSize]);

  // Formatted page creation date in top-right
  const formattedPageDate = useMemo(() => {
    try {
      const rawDate = currentPage.createdAt || currentPage.updatedAt;
      if (!rawDate) return '';
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [currentPage.createdAt, currentPage.updatedAt]);

  // Ruled lines for lined paper
  const ruledLines = useMemo(() => {
    const lines: number[] = [];
    for (let y = 140; y <= 1080; y += 38) {
      lines.push(y);
    }
    return lines;
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#1e1c1b] text-charcoal flex flex-col items-center select-none overflow-hidden touch-none"
    >
      {/* Top Hover Sensor (keeps toolbar accessible if mouse moves to top) */}
      <div
        onMouseEnter={() => setForceShowToolbar(true)}
        onMouseLeave={() => setForceShowToolbar(false)}
        className="absolute top-0 left-0 right-0 h-16 z-30 pointer-events-auto"
      />

      {/* Floating Slim Toolbar */}
      <div
        className={`absolute top-2.5 z-40 transition-all duration-300 ease-out max-w-5xl px-3 sm:px-4 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-beige/80 shadow-xl flex items-center gap-2 sm:gap-3 flex-wrap justify-between ${
          isDrawing && !forceShowToolbar
            ? '-translate-y-14 opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100 pointer-events-auto'
        }`}
      >
        {/* Left Section: Tools, Sizes, Colors & Stamps */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Pen Button */}
          <button
            type="button"
            onClick={() => handleSelectTool('pen')}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedTool === 'pen'
                ? 'bg-charcoal text-white shadow-2xs font-medium'
                : 'text-charcoal/70 hover:bg-beige/40'
            }`}
            title="Pen"
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Pen</span>
          </button>

          {/* 3 Pen Sizes (active when pen is selected) */}
          {selectedTool === 'pen' && (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-xl bg-[#faf8f4] border border-beige/60">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => handleSelectSize(size.id)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition cursor-pointer ${
                    selectedPenSize === size.id
                      ? 'bg-white text-charcoal border border-beige shadow-2xs'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                  title={size.label}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: `${size.dotPx}px`, height: `${size.dotPx}px` }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* 6 Color Swatches (active when pen is selected) */}
          {selectedTool === 'pen' && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-[#faf8f4] border border-beige/60">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectColor(c.hex)}
                  className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                    selectedColor === c.hex
                      ? 'ring-2 ring-sage-dark scale-110 border-white shadow-xs'
                      : 'border-charcoal/15 opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={`${c.label} Ink`}
                />
              ))}
            </div>
          )}

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => handleSelectTool('highlighter')}
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

          {/* Stamp Tool Button */}
          <button
            type="button"
            onClick={() => handleSelectTool('stamp')}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedTool === 'stamp'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs font-semibold'
                : 'text-charcoal/70 hover:bg-beige/40'
            }`}
            title="Stamps / Clinical Symbols (Tap to place, drag to position)"
          >
            <Smile className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline text-[11px]">Stamp</span>
          </button>

          {/* Stamp Palette (when stamp is selected) */}
          {selectedTool === 'stamp' && (
            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-xl bg-emerald-50 border border-emerald-200">
              {STAMP_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectStamp(emoji)}
                  className={`w-6 h-6 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                    selectedStamp === emoji
                      ? 'bg-white shadow-2xs scale-110 border border-emerald-300'
                      : 'hover:bg-emerald-100/70 opacity-80 hover:opacity-100'
                  }`}
                  title={`Select ${emoji} stamp`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Eraser */}
          <button
            type="button"
            onClick={() => handleSelectTool('eraser')}
            className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedTool === 'eraser'
                ? 'bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs font-semibold'
                : 'text-charcoal/70 hover:bg-beige/40'
            }`}
            title="Eraser (Erases strokes and stamps)"
          >
            <Eraser className="w-4 h-4 text-rose-700" />
            <span className="hidden sm:inline text-[11px]">Eraser</span>
          </button>
        </div>

        {/* Paper Style Selector per page */}
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-xl bg-[#faf8f4] border border-beige/60 text-[10px]">
          {PAPER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSetPaperStyle(opt.id)}
              className={`px-1.5 py-0.5 rounded-md font-medium transition cursor-pointer ${
                (currentPage.paperStyle || 'lined') === opt.id
                  ? 'bg-white text-charcoal border border-beige/80 shadow-2xs font-semibold'
                  : 'text-warm-gray hover:text-charcoal'
              }`}
              title={`${opt.label} Paper Style`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Center: History & Page Navigation */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-beige/80 pr-2">
            <button
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Redo (Ctrl+Y)"
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
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cream border border-beige text-charcoal/80">
              {currentPageIndex + 1}/{pages.length}
            </span>
            <button
              type="button"
              disabled={currentPageIndex === pages.length - 1}
              onClick={handleNextPage}
              className="p-1 rounded text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                <AlertCircle className="w-3 h-3" /> Error
              </span>
            )}
          </div>

          {/* Convert to text */}
          {onConvertToText && (
            <button
              type="button"
              disabled={
                isConverting ||
                ((!currentPage.strokes || currentPage.strokes.length === 0) &&
                  (!currentPage.stamps || currentPage.stamps.length === 0))
              }
              onClick={handleConvertPage}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark transition cursor-pointer disabled:opacity-40"
              title="Transcribe current ink page via symbol-aware Gemini OCR"
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
              selectedTool === 'eraser'
                ? 'cursor-crosshair'
                : selectedTool === 'stamp'
                ? 'cursor-cell'
                : 'cursor-crosshair'
            }`}
          >
            {/* Defs for grid and dot paper patterns */}
            <defs>
              <pattern
                id="notebook-grid-pattern"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 36 0 L 0 0 0 36"
                  fill="none"
                  stroke="rgba(170, 155, 140, 0.22)"
                  strokeWidth="0.8"
                />
              </pattern>
              <pattern
                id="notebook-dot-pattern"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="16" cy="16" r="1.4" fill="rgba(170, 155, 140, 0.35)" />
              </pattern>
            </defs>

            {/* Paper Background */}
            <rect width={INK_PAGE_WIDTH} height={INK_PAGE_HEIGHT} fill="#FAF8F4" />

            {/* Paper Pattern by paperStyle */}
            {(!currentPage.paperStyle || currentPage.paperStyle === 'lined') && (
              <>
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
              </>
            )}

            {currentPage.paperStyle === 'grid' && (
              <rect
                width={INK_PAGE_WIDTH}
                height={INK_PAGE_HEIGHT}
                fill="url(#notebook-grid-pattern)"
              />
            )}

            {currentPage.paperStyle === 'dotted' && (
              <rect
                width={INK_PAGE_WIDTH}
                height={INK_PAGE_HEIGHT}
                fill="url(#notebook-dot-pattern)"
              />
            )}

            {/* Page Header text indicator */}
            <text
              x="90"
              y="60"
              fill="rgba(120, 110, 100, 0.55)"
              fontSize="14"
              fontFamily="serif"
              fontStyle="italic"
              className="select-none pointer-events-none"
            >
              {sessionNumber ? `Session #${sessionNumber} Notes` : 'Clinical Notes'} · Page {currentPageIndex + 1}
            </text>

            {/* Creation Date in Top-Right Corner */}
            {formattedPageDate && (
              <text
                x={INK_PAGE_WIDTH - 36}
                y="60"
                textAnchor="end"
                fill="rgba(140, 130, 120, 0.65)"
                fontSize="12"
                fontFamily="sans-serif"
                className="select-none pointer-events-none font-mono"
              >
                {formattedPageDate}
              </text>
            )}

            {/* Render Saved Strokes */}
            {currentPage.strokes.map((stroke) => {
              const strokeOptions = {
                size: stroke.tool === 'highlighter' ? 22 : stroke.size || 4.8,
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

            {/* Render Saved Stamps */}
            {currentPage.stamps &&
              currentPage.stamps.map((stamp) => (
                <text
                  key={stamp.id}
                  x={stamp.x}
                  y={stamp.y}
                  fontSize="36"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="select-none pointer-events-none"
                >
                  {stamp.emoji}
                </text>
              ))}

            {/* Render Active Dragging Stamp */}
            {activeStamp && (
              <g className="pointer-events-none select-none">
                <circle
                  cx={activeStamp.x}
                  cy={activeStamp.y}
                  r="28"
                  fill="rgba(62, 92, 70, 0.12)"
                  stroke="rgba(62, 92, 70, 0.45)"
                  strokeDasharray="4 4"
                />
                <text
                  x={activeStamp.x}
                  y={activeStamp.y}
                  fontSize="36"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {activeStamp.emoji}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Subtle Bottom Bar Help Text */}
      <div className="p-2 text-center text-[11px] text-warm-gray/60 font-mono flex items-center justify-center gap-4">
        <span>Draw with Pen or Mouse (palm touch rejected)</span>
        <span>·</span>
        <span>Tap with Stamp tool to place stickers</span>
        <span>·</span>
        <span>Eraser flips to erase whole strokes & stamps</span>
        <span>·</span>
        <span>Press Esc to Save & Exit</span>
      </div>
    </div>
  );
};
