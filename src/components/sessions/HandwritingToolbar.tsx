import React, { useState, useRef } from 'react';
import {
  PenLine,
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InkPage } from '../../types/ink';
import { InkNotebook } from './InkNotebook';
import { InkPageThumbnail } from './InkPageThumbnail';
import { transcribeInkPage } from '../../lib/inkOcr';
import { downscaleImageToJpeg } from '../../lib/imageUtils';

export interface HandwritingToolbarProps {
  /** Callback when text is transcribed from OCR (photo or ink page) */
  onAppendText: (text: string, source: 'photo' | 'ink', pageNum?: number) => void | Promise<boolean>;

  /** Optional ink pages associated with this section */
  inkPages?: InkPage[];

  /** Callback to persist ink pages */
  onSaveInkPages?: (pages: InkPage[]) => Promise<boolean>;

  /** Label for this section (e.g., "Write-Up", "Prep Notes", "Live Notes") */
  sectionTitle?: string;

  /** Session number for notebook header */
  sessionNumber?: number;

  /** Whether to render the visual ink pages thumbnail strip (default: true) */
  showThumbnails?: boolean;

  /** Any extra custom action buttons to render in the toolbar */
  extraActions?: React.ReactNode;

  /** Compact mode for small cards or inline bars (default: false) */
  compact?: boolean;
}

export const HandwritingToolbar: React.FC<HandwritingToolbarProps> = ({
  onAppendText,
  inkPages = [],
  onSaveInkPages,
  sectionTitle = 'Notes',
  sessionNumber,
  showThumbnails = true,
  extraActions,
  compact = false,
}) => {
  // Ink Notebook state
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [activeNotebookPageIndex, setActiveNotebookPageIndex] = useState(0);
  const [convertingPageIndex, setConvertingPageIndex] = useState<number | null>(null);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

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

      await onAppendText(fullAppend, 'photo');

      setOcrSuccessMsg(`Photo transcribed and added to ${sectionTitle}!`);
      setTimeout(() => setOcrSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setOcrError(err.message || 'Failed to transcribe photo. Please try again.');
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
      const appendHeader = `— From ${sectionTitle.toLowerCase()} ink page ${page.pageNumber}, ${dateStr} —`;
      const fullAppend = `${appendHeader}\n${transcribedText}`;

      await onAppendText(fullAppend, 'ink', page.pageNumber);

      setOcrSuccessMsg(`Page ${page.pageNumber} transcribed and added to ${sectionTitle}!`);
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
      setOcrError('No handwritten strokes found across notebook pages.');
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
        accumulatedAppend += `\n\n— From ${sectionTitle.toLowerCase()} ink page ${p.pageNumber}, ${dateStr} —\n${text}`;
      }

      await onAppendText(accumulatedAppend.trimStart(), 'ink');

      setOcrSuccessMsg(`All ${pagesWithStrokes.length} ink pages transcribed and added to ${sectionTitle}!`);
      setTimeout(() => setOcrSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Batch ink OCR error:', err);
      setOcrError(err.message || 'Failed to transcribe ink pages.');
    } finally {
      setIsConvertingAll(false);
      setIsOcrProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Write Notes (Pen Notebook) Button */}
        <button
          type="button"
          onClick={() => {
            setActiveNotebookPageIndex(Math.max(0, inkPages.length - 1));
            setIsNotebookOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 font-semibold rounded-xl border border-sage/60 bg-sage/10 hover:bg-sage/20 text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
          title="Open full-screen pen notebook for stylus/mouse handwritten notes"
        >
          <PenLine className={compact ? 'w-3 h-3 text-sage-dark' : 'w-3.5 h-3.5 text-sage-dark'} />
          <span>✍️ Write notes</span>
          {inkPages.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-sage-dark text-white rounded-full text-[10px] font-bold">
              {inkPages.length}
            </span>
          )}
        </button>

        {/* Upload Photo of Notes Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <button
          type="button"
          disabled={isOcrProcessing}
          onClick={() => fileInputRef.current?.click()}
          className={`inline-flex items-center gap-1.5 font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark hover:border-sage transition cursor-pointer shadow-2xs disabled:opacity-50 ${
            compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
          }`}
          title="Upload a photo of handwritten notes and transcribe via Gemini Vision OCR"
        >
          {isOcrProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-dark" />
              <span>Transcribing...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 text-sage-dark" />
              <span>Upload Notes</span>
            </>
          )}
        </button>

        {/* Extra Action Buttons */}
        {extraActions}
      </div>

      {/* OCR Feedback Alerts */}
      {ocrError && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="flex-1">{ocrError}</p>
        </div>
      )}

      {ocrSuccessMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="flex-1">{ocrSuccessMsg}</p>
        </div>
      )}

      {/* Ink Notebook Pages Gallery */}
      {showThumbnails && inkPages.length > 0 && (
        <div className="p-3 rounded-xl border border-beige/80 bg-[#FAF8F4]/80 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
              <PenLine className="w-3.5 h-3.5 text-sage-dark" />
              <span>
                {sectionTitle} Ink Pages ({inkPages.length})
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
                    <span>Transcribing All Pages...</span>
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

          {/* Thumbnail strip */}
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

            {/* Add New Page Button Card */}
            <button
              type="button"
              onClick={() => {
                setActiveNotebookPageIndex(inkPages.length);
                setIsNotebookOpen(true);
              }}
              className="w-24 h-34 rounded-xl border border-dashed border-beige hover:border-sage bg-white/60 hover:bg-white text-warm-gray hover:text-sage-dark transition cursor-pointer flex flex-col items-center justify-center gap-1.5 shrink-0 shadow-2xs group"
              title="Add a new blank ink page"
            >
              <div className="w-7 h-7 rounded-full bg-sage/10 group-hover:bg-sage/20 border border-sage/30 flex items-center justify-center transition">
                <Plus className="w-3.5 h-3.5 text-sage-dark" />
              </div>
              <span className="text-[11px] font-medium">Add Page</span>
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Pen Ink Notebook Overlay */}
      {isNotebookOpen && (
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
      )}
    </div>
  );
};
