import React, { useState, useRef } from 'react';
import {
  PenLine,
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InkPage } from '../../types/ink';
import { InkNotebook } from '../sessions/InkNotebook';
import { InkPageThumbnail } from '../sessions/InkPageThumbnail';
import { transcribeInkPage } from '../../lib/inkOcr';
import { downscaleImageToJpeg } from '../../lib/imageUtils';

export interface HandwritingOptionProps {
  /** Callback triggered when text is transcribed from ink or photo */
  onInsertText: (
    transcribedText: string,
    metadata?: { source: 'photo' | 'ink'; pageNum?: number }
  ) => void | Promise<boolean>;

  /** Name of the field, tab, or window, e.g. "Consultation Write-Up", "Prep Notes", "Member Note" */
  fieldLabel?: string;

  /** Visual variant: 'button' (standard button pair), 'toolbar' (action bar with ink gallery), 'compact' (smaller buttons), or 'dropdown' */
  variant?: 'button' | 'toolbar' | 'compact' | 'dropdown';

  /** Ink pages if this place stores ink drawings */
  inkPages?: InkPage[];

  /** Callback to persist ink pages if supported by this place */
  onSaveInkPages?: (pages: InkPage[]) => Promise<boolean>;

  /** Session number (for notebook header) */
  sessionNumber?: number;

  /** Whether to show the thumbnail strip if ink pages exist (default: true) */
  showThumbnails?: boolean;

  /** Custom extra actions or buttons to render alongside */
  children?: React.ReactNode;

  /** Custom class name */
  className?: string;
}

/**
 * Universal Handwriting Option component.
 * Can be added to ANY tab, window, or input section in the website to provide:
 * 1. Digital Pen / Stylus drawing notebook (`InkNotebook`)
 * 2. Photo upload & Gemini Vision OCR of paper notes
 * 3. Ink pages thumbnail strip (if ink pages are saved)
 * 4. Automatic transcription insertion directly into that specific place
 */
export const HandwritingOption: React.FC<HandwritingOptionProps> = ({
  onInsertText,
  fieldLabel = 'Notes',
  variant = 'button',
  inkPages = [],
  onSaveInkPages,
  sessionNumber,
  showThumbnails = true,
  children,
  className = '',
}) => {
  // Notebook state
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [activeNotebookPageIndex, setActiveNotebookPageIndex] = useState(0);
  const [convertingPageIndex, setConvertingPageIndex] = useState<number | null>(null);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  // Dropdown menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Photo OCR state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Photo OCR Handler (Gemini Vision Flash OCR)                        */
  /* ------------------------------------------------------------------ */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setIsMenuOpen(false);
    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    try {
      const { base64Data, mimeType } = await downscaleImageToJpeg(file, 1600, 0.8);
      const prompt =
        'Transcribe this handwritten note exactly as written, in its original language (Arabic or English). Do not summarise, translate or add anything.';

      const { data, error } = await supabase.functions.invoke('gemini-generate', {
        body: {
          prompt,
          imageBase64: base64Data,
          imageMimeType: mimeType,
        },
      });

      if (error) {
        throw new Error(error.message || 'Gemini OCR failed to process image');
      }

      const transcribedText = data?.text?.trim();
      if (!transcribedText) {
        throw new Error('No legible text could be extracted from this photo.');
      }

      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const appendHeader = `— From photo, ${dateStr} —`;
      const fullAppend = `${appendHeader}\n${transcribedText}`;

      await onInsertText(fullAppend, { source: 'photo' });

      setOcrSuccessMsg(`Photo notes transcribed into ${fieldLabel}!`);
      setTimeout(() => setOcrSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setOcrError(err.message || 'Failed to transcribe photo.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Convert Single Ink Page                                            */
  /* ------------------------------------------------------------------ */
  const handleConvertSingleInkPage = async (page: InkPage, index?: number) => {
    if (!page.strokes || page.strokes.length === 0) return;
    if (index !== undefined) setConvertingPageIndex(index);
    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    try {
      const transcribedText = await transcribeInkPage(page);
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const appendHeader = `— From ${fieldLabel.toLowerCase()} ink page ${page.pageNumber}, ${dateStr} —`;
      const fullAppend = `${appendHeader}\n${transcribedText}`;

      await onInsertText(fullAppend, { source: 'ink', pageNum: page.pageNumber });

      setOcrSuccessMsg(`Page ${page.pageNumber} transcribed into ${fieldLabel}!`);
      setTimeout(() => setOcrSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Ink OCR error:', err);
      setOcrError(err.message || `Failed to transcribe page ${page.pageNumber}.`);
    } finally {
      setIsOcrProcessing(false);
      setConvertingPageIndex(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Convert All Ink Pages                                              */
  /* ------------------------------------------------------------------ */
  const handleConvertAllInkPages = async () => {
    if (inkPages.length === 0) return;
    const pagesWithStrokes = inkPages.filter((p) => p.strokes && p.strokes.length > 0);
    if (pagesWithStrokes.length === 0) {
      setOcrError('No handwriting found across notebook pages.');
      return;
    }

    setIsConvertingAll(true);
    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    try {
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let accumulatedAppend = '';
      for (const p of pagesWithStrokes) {
        const text = await transcribeInkPage(p);
        accumulatedAppend += `\n\n— From ${fieldLabel.toLowerCase()} ink page ${p.pageNumber}, ${dateStr} —\n${text}`;
      }

      await onInsertText(accumulatedAppend.trimStart(), { source: 'ink' });

      setOcrSuccessMsg(`All ${pagesWithStrokes.length} ink pages transcribed into ${fieldLabel}!`);
      setTimeout(() => setOcrSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Batch ink OCR error:', err);
      setOcrError(err.message || 'Failed to transcribe ink pages.');
    } finally {
      setIsConvertingAll(false);
      setIsOcrProcessing(false);
    }
  };

  /* Hidden file input for photo upload */
  const renderFileInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handlePhotoUpload}
    />
  );

  /* Full screen notebook overlay */
  const renderNotebookModal = () =>
    isNotebookOpen ? (
      <InkNotebook
        initialPages={inkPages}
        initialPageIndex={activeNotebookPageIndex}
        sessionNumber={sessionNumber}
        onSave={async (updatedPages) => {
          if (onSaveInkPages) {
            return onSaveInkPages(updatedPages);
          }
          return true;
        }}
        onClose={(updatedPages) => {
          if (onSaveInkPages) {
            onSaveInkPages(updatedPages);
          }
          setIsNotebookOpen(false);
        }}
        onConvertToText={handleConvertSingleInkPage}
      />
    ) : null;

  /* Feedback alerts */
  const renderAlerts = () => (
    <>
      {ocrError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 my-1">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="flex-1">{ocrError}</p>
        </div>
      )}
      {ocrSuccessMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700 my-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="flex-1">{ocrSuccessMsg}</p>
        </div>
      )}
    </>
  );

  /* Ink Thumbnails strip */
  const renderThumbnails = () => {
    if (!showThumbnails || inkPages.length === 0) return null;
    return (
      <div className="p-3 rounded-xl border border-beige/80 bg-[#FAF8F4]/80 space-y-2.5 my-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
            <PenLine className="w-3.5 h-3.5 text-sage-dark" />
            <span>
              {fieldLabel} Ink Pages ({inkPages.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isConvertingAll || isOcrProcessing}
              onClick={handleConvertAllInkPages}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-charcoal hover:text-sage-dark px-2.5 py-1 rounded-lg border border-beige bg-white hover:border-sage transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Transcribe all ink pages to text via Gemini OCR"
            >
              {isConvertingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-sage-dark" />
                  <span>Transcribing All...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-sage-dark" />
                  <span>Convert All to Text</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNotebookPageIndex(inkPages.length - 1);
                setIsNotebookOpen(true);
              }}
              className="text-[11px] font-semibold text-sage-dark hover:underline cursor-pointer"
            >
              Open Notebook
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar">
          {inkPages.map((page, index) => (
            <div key={page.id} className="relative group shrink-0">
              <InkPageThumbnail
                page={page}
                isConverting={convertingPageIndex === index}
                onClick={() => {
                  setActiveNotebookPageIndex(index);
                  setIsNotebookOpen(true);
                }}
                onConvert={() => handleConvertSingleInkPage(page, index)}
              />
              <div className="text-center mt-1">
                <span className="text-[10px] text-warm-gray font-medium">
                  Page {page.pageNumber}
                </span>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setActiveNotebookPageIndex(inkPages.length);
              setIsNotebookOpen(true);
            }}
            className="w-24 h-34 rounded-xl border border-dashed border-beige hover:border-sage bg-white/60 hover:bg-white text-warm-gray hover:text-sage-dark transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shrink-0 shadow-2xs group"
            title="Add a new page"
          >
            <div className="w-7 h-7 rounded-full bg-sage/10 group-hover:bg-sage/20 border border-sage/30 flex items-center justify-center transition">
              <Plus className="w-3.5 h-3.5 text-sage-dark" />
            </div>
            <span className="text-[11px] font-medium">Add Page</span>
          </button>
        </div>
      </div>
    );
  };

  /* ================================================================== */
  /* Variant: Dropdown                                                  */
  /* ================================================================== */
  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        {renderFileInput()}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl border border-sage/50 bg-sage/10 hover:bg-sage/20 text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs"
          title={`Handwriting options for ${fieldLabel}`}
        >
          <PenLine className="w-3.5 h-3.5 text-sage-dark" />
          <span>✍️ Handwrite</span>
          <ChevronDown className="w-3 h-3 text-warm-gray" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-xl border border-beige bg-white p-1.5 shadow-lg z-30 space-y-1">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setActiveNotebookPageIndex(Math.max(0, inkPages.length - 1));
                setIsNotebookOpen(true);
              }}
              className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-charcoal hover:bg-sage/10 hover:text-sage-dark transition cursor-pointer"
            >
              <PenLine className="w-3.5 h-3.5 text-sage-dark" />
              <span>Write with Stylus/Pen</span>
            </button>
            <button
              type="button"
              disabled={isOcrProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-charcoal hover:bg-sage/10 hover:text-sage-dark transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-sage-dark" />
              <span>Upload Notes</span>
            </button>
          </div>
        )}

        {renderAlerts()}
        {renderNotebookModal()}
      </div>
    );
  }

  /* ================================================================== */
  /* Variant: Button, Toolbar, or Compact                               */
  /* ================================================================== */
  const isCompact = variant === 'compact';

  return (
    <div className={`space-y-2 ${className}`}>
      {renderFileInput()}
      <div className="flex items-center gap-1.5 shrink-0 flex-nowrap overflow-x-auto py-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveNotebookPageIndex(Math.max(0, inkPages.length - 1));
            setIsNotebookOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 font-semibold rounded-xl border border-sage/60 bg-sage/10 hover:bg-sage/20 text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap ${
            isCompact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
          title={`Open pen notebook for ${fieldLabel}`}
        >
          <PenLine className={isCompact ? 'w-3 h-3 text-sage-dark' : 'w-3.5 h-3.5 text-sage-dark'} />
          <span>✍️ Write notes</span>
          {inkPages.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-sage-dark text-white rounded-full text-[10px] font-bold">
              {inkPages.length}
            </span>
          )}
        </button>

        <button
          type="button"
          disabled={isOcrProcessing}
          onClick={() => fileInputRef.current?.click()}
          className={`inline-flex items-center gap-1.5 font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark hover:border-sage transition cursor-pointer shadow-2xs disabled:opacity-50 shrink-0 whitespace-nowrap ${
            isCompact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
          title={`Upload photo of notes for ${fieldLabel}`}
        >
          {isOcrProcessing ? (
            <>
              <Loader2 className={isCompact ? 'w-3 h-3 animate-spin text-sage-dark' : 'w-3.5 h-3.5 animate-spin text-sage-dark'} />
              <span>Transcribing...</span>
            </>
          ) : (
            <>
              <Upload className={isCompact ? 'w-3 h-3 text-sage-dark' : 'w-3.5 h-3.5 text-sage-dark'} />
              <span>Upload Notes</span>
            </>
          )}
        </button>

        {children}
      </div>

      {renderAlerts()}
      {variant === 'toolbar' && renderThumbnails()}
      {renderNotebookModal()}
    </div>
  );
};
