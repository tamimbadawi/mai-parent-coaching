import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Search,
  MessageSquare,
  Save,
  Check,
  Plus,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TranscriptUtterance } from '../../types/session';
import type { InkPage } from '../../types/ink';
import { InkNotebook } from './InkNotebook';
import { InkPageThumbnail } from './InkPageThumbnail';
import { transcribeInkPage } from '../../lib/inkOcr';

interface SessionDuringStepProps {
  initialHandwrittenNotes: string;
  initialInkPages?: InkPage[];
  sessionNumber?: number;
  onSaveHandwrittenText: (text: string) => Promise<boolean>;
  onSaveInkPages: (pages: InkPage[]) => Promise<boolean>;
  driveWebViewUrl?: string | null;
  onSaveDriveLink: (url: string) => Promise<boolean>;
  onClearDriveLink: () => Promise<boolean>;
  rawTranscript: TranscriptUtterance[];
  onSaveTranscript?: (utterances: TranscriptUtterance[]) => Promise<boolean>;
}

export const SessionDuringStep: React.FC<SessionDuringStepProps> = ({
  initialHandwrittenNotes,
  initialInkPages,
  sessionNumber,
  onSaveHandwrittenText,
  onSaveInkPages,
  driveWebViewUrl,
  onSaveDriveLink,
  onClearDriveLink,
  rawTranscript,
  onSaveTranscript,
}) => {
  // Handwritten notes state
  const [draftHandwritten, setDraftHandwritten] = useState(initialHandwrittenNotes);
  const draftHandwrittenRef = useRef(initialHandwrittenNotes);
  draftHandwrittenRef.current = draftHandwritten;

  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);

  // Ink Notebook state
  const [inkPages, setInkPages] = useState<InkPage[]>(initialInkPages || []);
  const inkPagesRef = useRef<InkPage[]>(initialInkPages || []);
  inkPagesRef.current = inkPages;

  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [activeNotebookPageIndex, setActiveNotebookPageIndex] = useState(0);
  const [convertingPageIndex, setConvertingPageIndex] = useState<number | null>(null);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  useEffect(() => {
    setInkPages(initialInkPages || []);
    inkPagesRef.current = initialInkPages || [];
  }, [initialInkPages]);

  // Photo OCR state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  // Drive link state
  const [driveInput, setDriveInput] = useState(driveWebViewUrl || '');
  const [driveError, setDriveError] = useState<string | null>(null);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState(false);

  // Transcript state
  const [searchQuery, setSearchQuery] = useState('');
  const [utterances, setUtterances] = useState<TranscriptUtterance[]>(rawTranscript);
  const [showAddUtterance, setShowAddUtterance] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState<'Mai (Coach)' | 'Parent'>('Mai (Coach)');
  const [newTimestamp, setNewTimestamp] = useState('');
  const [newText, setNewText] = useState('');

  const hasUnsavedNotes = draftHandwritten !== initialHandwrittenNotes;

  useEffect(() => {
    setDraftHandwritten(initialHandwrittenNotes);
    draftHandwrittenRef.current = initialHandwrittenNotes;
    setSaveNotesSuccess(false);
  }, [initialHandwrittenNotes]);

  useEffect(() => {
    setDriveInput(driveWebViewUrl || '');
    setDriveError(null);
    setDriveSuccess(false);
  }, [driveWebViewUrl]);

  useEffect(() => {
    setUtterances(rawTranscript);
  }, [rawTranscript]);

  /* ------------------------------------------------------------------ */
  /* Handwritten notes save                                             */
  /* ------------------------------------------------------------------ */
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setSaveNotesSuccess(false);
    try {
      const ok = await onSaveHandwrittenText(draftHandwrittenRef.current);
      if (ok) {
        setSaveNotesSuccess(true);
        setTimeout(() => setSaveNotesSuccess(false), 2500);
      }
    } finally {
      setIsSavingNotes(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Photo OCR with Canvas Downscaling (<=1600px, JPEG 0.8)             */
  /* ------------------------------------------------------------------ */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick the same file again if desired
    e.target.value = '';

    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    try {
      // 1. Downscale image on canvas (max 1600px on long side, JPEG quality 0.8)
      const { base64Data, mimeType } = await downscaleImageToJpeg(file, 1600, 0.8);

      // 2. Call gemini-generate edge function
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

      // 3. Append to existing notes without overwriting
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const appendHeader = `— From photo, ${dateStr} —`;
      const trimmed = draftHandwrittenRef.current.trim();
      const updatedNotes = trimmed
        ? `${trimmed}\n\n${appendHeader}\n${transcribedText}`
        : `${appendHeader}\n${transcribedText}`;

      setDraftHandwritten(updatedNotes);
      draftHandwrittenRef.current = updatedNotes;

      // 4. Autosave text immediately to handwritten_notes row in database
      setIsSavingNotes(true);
      const saveOk = await onSaveHandwrittenText(updatedNotes);
      setIsSavingNotes(false);

      if (saveOk) {
        setSaveNotesSuccess(true);
        setTimeout(() => setSaveNotesSuccess(false), 3000);
        setOcrSuccessMsg('Handwritten notes transcribed and saved!');
        setTimeout(() => setOcrSuccessMsg(null), 4000);
      } else {
        setOcrError('Photo transcribed, but autosaving to database failed. Please click Save Notes.');
      }
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setOcrError(err.message || 'Failed to transcribe photo. Please try again.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Ink Page OCR Conversion                                            */
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
      const appendHeader = `— From ink page ${page.pageNumber}, ${dateStr} —`;
      const trimmed = draftHandwrittenRef.current.trim();
      const updatedNotes = trimmed
        ? `${trimmed}\n\n${appendHeader}\n${transcribedText}`
        : `${appendHeader}\n${transcribedText}`;

      setDraftHandwritten(updatedNotes);
      draftHandwrittenRef.current = updatedNotes;

      // Autosave text immediately preserving ink pages untouched
      setIsSavingNotes(true);
      const saveOk = await onSaveHandwrittenText(updatedNotes);
      setIsSavingNotes(false);

      if (saveOk) {
        setSaveNotesSuccess(true);
        setTimeout(() => setSaveNotesSuccess(false), 3000);
        setOcrSuccessMsg(`Ink page ${page.pageNumber} transcribed and saved to notes!`);
        setTimeout(() => setOcrSuccessMsg(null), 4000);
      } else {
        setOcrError('Ink page transcribed, but saving failed. Please click Save Notes.');
      }
    } catch (err: any) {
      console.error('Ink OCR error:', err);
      setOcrError(err.message || `Failed to transcribe ink page ${page.pageNumber}.`);
    } finally {
      setIsOcrProcessing(false);
      setConvertingPageIndex(null);
    }
  };

  const handleConvertAllInkPages = async () => {
    const currentPages = inkPagesRef.current;
    if (currentPages.length === 0) return;
    setIsConvertingAll(true);
    setIsOcrProcessing(true);
    setOcrError(null);
    setOcrSuccessMsg(null);

    try {
      const pagesWithStrokes = currentPages.filter((p) => p.strokes && p.strokes.length > 0);
      if (pagesWithStrokes.length === 0) {
        setOcrError('No ink strokes found across notebook pages.');
        return;
      }

      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let accumulatedAppend = '';
      for (const p of pagesWithStrokes) {
        const text = await transcribeInkPage(p);
        accumulatedAppend += `\n\n— From ink page ${p.pageNumber}, ${dateStr} —\n${text}`;
      }

      const trimmed = draftHandwrittenRef.current.trim();
      const updatedNotes = trimmed
        ? `${trimmed}${accumulatedAppend}`
        : accumulatedAppend.trimStart();

      setDraftHandwritten(updatedNotes);
      draftHandwrittenRef.current = updatedNotes;

      setIsSavingNotes(true);
      const saveOk = await onSaveHandwrittenText(updatedNotes);
      setIsSavingNotes(false);

      if (saveOk) {
        setSaveNotesSuccess(true);
        setTimeout(() => setSaveNotesSuccess(false), 3000);
        setOcrSuccessMsg('All ink pages transcribed and saved to notes!');
        setTimeout(() => setOcrSuccessMsg(null), 4000);
      } else {
        setOcrError('Ink pages transcribed, but saving failed. Please click Save Notes.');
      }
    } catch (err: any) {
      console.error('Batch ink OCR error:', err);
      setOcrError(err.message || 'Failed to transcribe ink pages.');
    } finally {
      setIsConvertingAll(false);
      setIsOcrProcessing(false);
    }
  };

  /* Helper to downscale image via HTML Canvas */
  const downscaleImageToJpeg = (
    file: File,
    maxDim: number,
    quality: number
  ): Promise<{ base64Data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        resolve({ base64Data, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image file'));
      };

      img.src = objectUrl;
    });
  };

  /* ------------------------------------------------------------------ */
  /* Drive Link Handlers                                                */
  /* ------------------------------------------------------------------ */
  const handleSaveDrive = async () => {
    const trimmed = driveInput.trim();
    if (!trimmed.startsWith('https://drive.google.com/')) {
      setDriveError('Link must start with https://drive.google.com/');
      return;
    }
    setDriveError(null);
    setIsSavingDrive(true);
    setDriveSuccess(false);
    try {
      const ok = await onSaveDriveLink(trimmed);
      if (ok) {
        setDriveSuccess(true);
        setTimeout(() => setDriveSuccess(false), 2500);
      }
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleClearDrive = async () => {
    setDriveError(null);
    setIsSavingDrive(true);
    try {
      const ok = await onClearDriveLink();
      if (ok) {
        setDriveInput('');
      }
    } finally {
      setIsSavingDrive(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Transcript Handlers                                                */
  /* ------------------------------------------------------------------ */
  const filteredUtterances = utterances.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.text.toLowerCase().includes(q) || u.speaker.toLowerCase().includes(q);
  });

  const handleAddUtterance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newUtt: TranscriptUtterance = {
      id: `utt-${Date.now()}`,
      timestamp: newTimestamp.trim() || '00:00',
      speaker: newSpeaker,
      text: newText.trim(),
    };

    const nextUtterances = [...utterances, newUtt];
    setUtterances(nextUtterances);
    if (onSaveTranscript) {
      await onSaveTranscript(nextUtterances);
    }

    setNewText('');
    setNewTimestamp('');
    setShowAddUtterance(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {/* 1. In-Session Handwritten & Raw Notes */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Handwritten & Live Session Notes
              </h3>
              <p className="text-[11px] text-warm-gray">
                Live consultation notes or transcribed notebook pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Write Notes (Pen Notebook) Button */}
            <button
              type="button"
              onClick={() => {
                setActiveNotebookPageIndex(Math.max(0, inkPages.length - 1));
                setIsNotebookOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-sage/60 bg-sage/10 hover:bg-sage/20 text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs"
              title="Open full-screen pen notebook for stylus/mouse drawing"
            >
              <PenLine className="w-3.5 h-3.5 text-sage-dark" />
              <span>✍️ Write notes</span>
            </button>

            {/* Upload Photo Button */}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark hover:border-sage transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isOcrProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-dark" />
                  <span>Transcribing Photo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-sage-dark" />
                  <span>Upload Photo of Notes</span>
                </>
              )}
            </button>

            {/* Save Notes Button & Status */}
            {hasUnsavedNotes && !saveNotesSuccess && !isSavingNotes && (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                Unsaved changes
              </span>
            )}
            {saveNotesSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={isSavingNotes || isOcrProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-charcoal text-white hover:bg-charcoal/90 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSavingNotes ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-sage" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 text-sage" />
                  <span>Save Notes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* OCR feedback banners */}
        {ocrError && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="flex-1">{ocrError}</p>
          </div>
        )}

        {ocrSuccessMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="flex-1">{ocrSuccessMsg}</p>
          </div>
        )}

        {/* Ink Notebook Pages Gallery (when ink pages exist) */}
        {inkPages.length > 0 && (
          <div className="mb-4 p-3.5 rounded-xl border border-beige/80 bg-[#FAF8F4]/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                <PenLine className="w-3.5 h-3.5 text-sage-dark" />
                <span>Ink Notebook Pages ({inkPages.length})</span>
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
                  Resume Writing →
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Thumbnails Strip */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
              {inkPages.map((page, index) => (
                <InkPageThumbnail
                  key={page.id}
                  page={page}
                  isConverting={convertingPageIndex === index}
                  onClick={() => {
                    setActiveNotebookPageIndex(index);
                    setIsNotebookOpen(true);
                  }}
                  onConvert={() => handleConvertSingleInkPage(page, index)}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setActiveNotebookPageIndex(inkPages.length);
                  setIsNotebookOpen(true);
                }}
                className="w-24 h-34 rounded-xl border border-dashed border-beige/90 bg-white/70 hover:bg-white hover:border-sage text-warm-gray hover:text-sage-dark transition flex flex-col items-center justify-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                title="Open notebook and start a new page"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10px] font-medium">Add Page</span>
              </button>
            </div>
          </div>
        )}

        <textarea
          rows={8}
          value={draftHandwritten}
          onChange={(e) => setDraftHandwritten(e.target.value)}
          placeholder="Capture real-time clinical observations, phrases spoken by parent or child, behavioral shifts, or upload a photo of your paper notebook to transcribe..."
          className="w-full text-xs rounded-xl border border-beige bg-[#faf8f4] p-3 text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition leading-relaxed font-sans"
        />

        {/* Full-Screen Pen Ink Notebook Overlay */}
        {isNotebookOpen && (
          <InkNotebook
            initialPages={inkPages}
            initialPageIndex={activeNotebookPageIndex}
            sessionNumber={sessionNumber}
            onSave={async (updatedPages) => {
              setInkPages(updatedPages);
              inkPagesRef.current = updatedPages;
              return onSaveInkPages(updatedPages);
            }}
            onClose={(updatedPages) => {
              setInkPages(updatedPages);
              inkPagesRef.current = updatedPages;
              setIsNotebookOpen(false);
            }}
            onConvertToText={handleConvertSingleInkPage}
          />
        )}
      </div>

      {/* 2. Embedded Voice Recording Link Strip */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-bold text-charcoal">Voice Recording</h3>
                {driveWebViewUrl ? (
                  <a
                    href={driveWebViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 hover:underline"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Open in Drive
                  </a>
                ) : (
                  <span className="text-[10px] text-warm-gray">Not linked</span>
                )}
              </div>
              <p className="text-[11px] text-warm-gray">
                Secure Google Drive audio link for clinical reference
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="url"
              value={driveInput}
              onChange={(e) => {
                setDriveInput(e.target.value);
                if (driveError) setDriveError(null);
              }}
              placeholder="https://drive.google.com/file/d/..."
              className="flex-1 text-xs rounded-xl border border-beige bg-[#faf8f4] px-3 py-1.5 text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition"
            />
            {driveSuccess && (
              <span className="text-[11px] font-semibold text-emerald-700">Saved</span>
            )}
            <button
              type="button"
              onClick={handleSaveDrive}
              disabled={isSavingDrive}
              className="px-3 py-1.5 text-xs font-medium rounded-xl bg-sage text-white hover:bg-sage-dark transition cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
            >
              {isSavingDrive ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleClearDrive}
              disabled={isSavingDrive || (!driveInput && !driveWebViewUrl)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-beige bg-white text-warm-gray hover:text-rose-600 hover:border-rose-200 transition cursor-pointer shrink-0 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        {driveError && (
          <p className="mt-2 text-xs font-medium text-rose-600 pl-9">{driveError}</p>
        )}
      </div>

      {/* 3. Dialogue Transcript Viewer (Search only, no audio seeking) */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-charcoal/10 border border-charcoal/20 flex items-center justify-center text-charcoal shrink-0">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Dialogue Transcript ({filteredUtterances.length} lines)
              </h3>
              <p className="text-[11px] text-warm-gray">
                Speaker turns and transcript dialogue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-gray" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dialogue..."
                className="pl-8 pr-3 py-1 text-xs rounded-xl border border-beige bg-[#faf8f4] text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition w-44"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddUtterance(!showAddUtterance)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark transition cursor-pointer"
            >
              <Plus className="w-3 h-3 text-sage-dark" />
              <span>Add Line</span>
            </button>
          </div>
        </div>

        {/* Add Utterance Form */}
        {showAddUtterance && (
          <form
            onSubmit={handleAddUtterance}
            className="mb-4 rounded-xl bg-[#faf8f4] border border-beige p-3 space-y-2.5 animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <select
                value={newSpeaker}
                onChange={(e) => setNewSpeaker(e.target.value as any)}
                className="text-xs rounded-lg border border-beige bg-white px-2 py-1 text-charcoal font-medium"
              >
                <option value="Mai (Coach)">Mai (Coach)</option>
                <option value="Parent">Parent</option>
              </select>
              <input
                type="text"
                value={newTimestamp}
                onChange={(e) => setNewTimestamp(e.target.value)}
                placeholder="e.g. 12:45"
                className="w-24 text-xs rounded-lg border border-beige bg-white px-2 py-1 text-charcoal"
              />
            </div>
            <textarea
              rows={2}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Spoken words..."
              className="w-full text-xs rounded-lg border border-beige bg-white p-2 text-charcoal focus:outline-hidden focus:border-sage"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddUtterance(false)}
                className="px-2.5 py-1 text-xs font-medium text-warm-gray hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-medium rounded-lg bg-charcoal text-white hover:bg-charcoal/90"
              >
                Add Utterance
              </button>
            </div>
          </form>
        )}

        {/* Utterances list */}
        {filteredUtterances.length > 0 ? (
          <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {filteredUtterances.map((utt) => {
              const isCoach = utt.speaker.includes('Mai');
              return (
                <div
                  key={utt.id}
                  className={`rounded-xl border p-3 text-xs transition ${
                    isCoach
                      ? 'border-sage/30 bg-sage/5 hover:bg-sage/10'
                      : 'border-beige/80 bg-[#faf8f4] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                        isCoach
                          ? 'bg-sage/20 text-sage-dark'
                          : 'bg-charcoal/10 text-charcoal'
                      }`}
                    >
                      {utt.speaker}
                    </span>
                    <span className="text-[10px] text-warm-gray font-mono">
                      {utt.timestamp}
                    </span>
                  </div>
                  <p className="text-charcoal/90 leading-relaxed font-sans pl-0.5">
                    {utt.text}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf8f4] border border-dashed border-beige p-6 text-center text-xs text-warm-gray">
            {searchQuery
              ? 'No dialogue utterances match your search query.'
              : 'No audio transcript or dialogue turns loaded for this session.'}
          </div>
        )}
      </div>
    </div>
  );
};
