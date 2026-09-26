import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  CheckSquare,
  Activity,
  Plus,
  Trash2,
  Edit3,
  Check,
  Save,
  Loader2,
  Calendar,
  AlertTriangle,
  User,
  Heart,
  Zap,
  CheckCircle2,
  Circle,
  Eye,
  PenLine,
  Upload,
  Sparkles,
  ExternalLink,
  ArrowDownToLine,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { HouseholdMember, MemberActionItem, MemberNote, MemberNoteType } from '../../types/family';
import type { SessionTranscript, EmotionalObservation } from '../../types/session';
import type { InkPage } from '../../types/ink';
import { InkNotebook } from './InkNotebook';
import { InkPageThumbnail } from './InkPageThumbnail';
import { transcribeInkPage } from '../../lib/inkOcr';
import { downscaleImageToJpeg } from '../../lib/imageUtils';
import { roleLabel } from '../../types/family';

interface SessionAfterStepProps {
  session: SessionTranscript;
  householdMembers: HouseholdMember[];
  sessionActionItems: MemberActionItem[];
  onCreateActionItem: (item: {
    memberId: string;
    task: string;
    priority: 'normal' | 'high';
    dueDate?: string | null;
  }) => Promise<boolean>;
  onToggleActionItem: (id: string, newStatus: 'open' | 'done') => Promise<void>;
  onDeleteActionItem: (id: string) => Promise<void>;
  sessionMemberNotes: MemberNote[];
  onCreateMemberNote: (note: {
    memberId: string;
    noteType: MemberNoteType;
    body: string;
  }) => Promise<boolean>;
  onSavePostNotes: (
    writeUp: string,
    metadata: {
      keyInsights: string[];
      emotionalObservations: EmotionalObservation;
      inkPages?: InkPage[];
    }
  ) => Promise<boolean>;
  onSavePostInkPages?: (pages: InkPage[]) => Promise<boolean>;
}

export const SessionAfterStep: React.FC<SessionAfterStepProps> = ({
  session,
  householdMembers,
  sessionActionItems,
  onCreateActionItem,
  onToggleActionItem,
  onDeleteActionItem,
  sessionMemberNotes,
  onCreateMemberNote,
  onSavePostNotes,
  onSavePostInkPages,
}) => {
  // Write-up editor state
  const [draftWriteUp, setDraftWriteUp] = useState(session.clinicalSummary);
  const draftWriteUpRef = useRef(session.clinicalSummary);
  draftWriteUpRef.current = draftWriteUp;

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSavingWriteUp, setIsSavingWriteUp] = useState(false);
  const [saveWriteUpSuccess, setSaveWriteUpSuccess] = useState(false);

  // Handwritten ink pages state (from post_session_notes source_metadata.ink_pages)
  const [inkPages, setInkPages] = useState<InkPage[]>(session.postInkPages || []);
  const inkPagesRef = useRef<InkPage[]>(session.postInkPages || []);
  inkPagesRef.current = inkPages;

  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [activeNotebookPageIndex, setActiveNotebookPageIndex] = useState(0);
  const [convertingPageIndex, setConvertingPageIndex] = useState<number | null>(null);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  // Photo OCR state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  // In-session notes import state
  const [inSessionImported, setInSessionImported] = useState(false);

  // Key Insights state
  const [insights, setInsights] = useState<string[]>(session.keyInsights || []);
  const [newInsightText, setNewInsightText] = useState('');
  const [showAddInsight, setShowAddInsight] = useState(false);

  // Emotional observations state
  const [emotionalObservations, setEmotionalObservations] = useState<EmotionalObservation>(
    session.emotionalObservations || {
      parentalStressLevel: 'moderate',
      nervousSystemState: 'fluctuating',
      identifiedTriggers: [],
      strengthsNoted: [],
    }
  );

  // Action item creation form
  const [showAddAction, setShowAddAction] = useState(false);
  const [actionMemberId, setActionMemberId] = useState(householdMembers[0]?.id || '');
  const [actionTask, setActionTask] = useState('');
  const [actionPriority, setActionPriority] = useState<'normal' | 'high'>('normal');
  const [actionDueDate, setActionDueDate] = useState('');
  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Member note creation form
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteMemberId, setNoteMemberId] = useState(householdMembers[0]?.id || '');
  const [noteType, setNoteType] = useState<MemberNoteType>('observation');
  const [noteBody, setNoteBody] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Extract all converted ink page references from write-up
  const convertedInkPageLinks = useMemo(() => {
    const regex = /— From (?:write-up )?ink page (\d+)(?:,\s*([^—\n]+))? —/g;
    const links: { pageNum: number; dateStr?: string }[] = [];
    const seen = new Set<number>();
    let m: RegExpExecArray | null;
    while ((m = regex.exec(draftWriteUp)) !== null) {
      const pageNum = parseInt(m[1], 10);
      if (!seen.has(pageNum)) {
        seen.add(pageNum);
        links.push({
          pageNum,
          dateStr: m[2]?.trim(),
        });
      }
    }
    return links.sort((a, b) => a.pageNum - b.pageNum);
  }, [draftWriteUp]);

  // Sync draft when session changes
  useEffect(() => {
    setDraftWriteUp(session.clinicalSummary);
    draftWriteUpRef.current = session.clinicalSummary;
    setInsights(session.keyInsights || []);
    setEmotionalObservations(
      session.emotionalObservations || {
        parentalStressLevel: 'moderate',
        nervousSystemState: 'fluctuating',
        identifiedTriggers: [],
        strengthsNoted: [],
      }
    );
    const existingInk = session.postInkPages || [];
    setInkPages(existingInk);
    inkPagesRef.current = existingInk;
    setSaveWriteUpSuccess(false);
    setInSessionImported(false);
  }, [session.id, session.clinicalSummary, session.postInkPages]);

  useEffect(() => {
    if (householdMembers.length > 0) {
      if (!actionMemberId) setActionMemberId(householdMembers[0].id);
      if (!noteMemberId) setNoteMemberId(householdMembers[0].id);
    }
  }, [householdMembers, actionMemberId, noteMemberId]);

  /* ------------------------------------------------------------------ */
  /* Write-up Save Handler (saves post_session_notes)                   */
  /* ------------------------------------------------------------------ */
  const handleSaveWriteUp = async () => {
    setIsSavingWriteUp(true);
    setSaveWriteUpSuccess(false);
    try {
      const ok = await onSavePostNotes(draftWriteUpRef.current, {
        keyInsights: insights,
        emotionalObservations,
        inkPages: inkPagesRef.current,
      });
      if (ok) {
        setSaveWriteUpSuccess(true);
        setTimeout(() => setSaveWriteUpSuccess(false), 2500);
      }
    } finally {
      setIsSavingWriteUp(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Ink Pages Save Handler                                             */
  /* ------------------------------------------------------------------ */
  const handleSaveInkPages = async (updatedPages: InkPage[]): Promise<boolean> => {
    setInkPages(updatedPages);
    inkPagesRef.current = updatedPages;
    if (onSavePostInkPages) {
      return onSavePostInkPages(updatedPages);
    }
    return onSavePostNotes(draftWriteUpRef.current, {
      keyInsights: insights,
      emotionalObservations,
      inkPages: updatedPages,
    });
  };

  /* ------------------------------------------------------------------ */
  /* Photo OCR with Canvas Downscaling (<=1600px, JPEG 0.8)             */
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
      const trimmed = draftWriteUpRef.current.trim();
      const updatedNotes = trimmed
        ? `${trimmed}\n\n${appendHeader}\n${transcribedText}`
        : `${appendHeader}\n${transcribedText}`;

      setDraftWriteUp(updatedNotes);
      draftWriteUpRef.current = updatedNotes;

      setIsSavingWriteUp(true);
      const saveOk = await onSavePostNotes(updatedNotes, {
        keyInsights: insights,
        emotionalObservations,
        inkPages: inkPagesRef.current,
      });
      setIsSavingWriteUp(false);

      if (saveOk) {
        setSaveWriteUpSuccess(true);
        setTimeout(() => setSaveWriteUpSuccess(false), 3000);
        setOcrSuccessMsg('Handwritten notes transcribed and appended to write-up!');
        setTimeout(() => setOcrSuccessMsg(null), 4000);
      } else {
        setOcrError('Photo transcribed, but autosaving to database failed. Please click Save Write-Up.');
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
      const appendHeader = `— From write-up ink page ${page.pageNumber}, ${dateStr} —`;
      const trimmed = draftWriteUpRef.current.trim();
      const updatedNotes = trimmed
        ? `${trimmed}\n\n${appendHeader}\n${transcribedText}`
        : `${appendHeader}\n${transcribedText}`;

      setDraftWriteUp(updatedNotes);
      draftWriteUpRef.current = updatedNotes;

      setIsSavingWriteUp(true);
      const saveOk = await onSavePostNotes(updatedNotes, {
        keyInsights: insights,
        emotionalObservations,
        inkPages: inkPagesRef.current,
      });
      setIsSavingWriteUp(false);

      if (saveOk) {
        setSaveWriteUpSuccess(true);
        setTimeout(() => setSaveWriteUpSuccess(false), 3000);
        setOcrSuccessMsg(`Ink page ${page.pageNumber} transcribed and appended to write-up!`);
        setTimeout(() => setOcrSuccessMsg(null), 4000);
      } else {
        setOcrError('Ink page transcribed, but saving failed. Please click Save Write-Up.');
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
        accumulatedAppend += `\n\n— From write-up ink page ${p.pageNumber}, ${dateStr} —\n${text}`;
      }

      const trimmed = draftWriteUpRef.current.trim();
      const updatedNotes = trimmed
        ? `${trimmed}${accumulatedAppend}`
        : accumulatedAppend.trimStart();

      setDraftWriteUp(updatedNotes);
      draftWriteUpRef.current = updatedNotes;

      setIsSavingWriteUp(true);
      const saveOk = await onSavePostNotes(updatedNotes, {
        keyInsights: insights,
        emotionalObservations,
        inkPages: inkPagesRef.current,
      });
      setIsSavingWriteUp(false);

      if (saveOk) {
        setSaveWriteUpSuccess(true);
        setTimeout(() => setSaveWriteUpSuccess(false), 3000);
        setOcrSuccessMsg('All ink pages transcribed and appended to write-up!');
        setTimeout(() => setOcrSuccessMsg(null), 4000);
      } else {
        setOcrError('Ink pages transcribed, but saving failed. Please click Save Write-Up.');
      }
    } catch (err: any) {
      console.error('Batch ink OCR error:', err);
      setOcrError(err.message || 'Failed to transcribe ink pages.');
    } finally {
      setIsConvertingAll(false);
      setIsOcrProcessing(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Import In-Session Notes Handler                                    */
  /* ------------------------------------------------------------------ */
  const handleImportInSessionNotes = async () => {
    const sessionNotes = session.handwrittenNotes?.trim();
    if (!sessionNotes && (!session.inkPages || session.inkPages.length === 0)) return;

    let updatedText = draftWriteUpRef.current.trim();
    if (sessionNotes && !updatedText.includes(sessionNotes)) {
      const header = '— From In-Session Notes —';
      updatedText = updatedText
        ? `${updatedText}\n\n${header}\n${sessionNotes}`
        : `${header}\n${sessionNotes}`;
    }

    let updatedInk = inkPagesRef.current;
    if (updatedInk.length === 0 && session.inkPages && session.inkPages.length > 0) {
      updatedInk = session.inkPages.map((p) => ({ ...p, id: `post-${p.id}` }));
      setInkPages(updatedInk);
      inkPagesRef.current = updatedInk;
    }

    setDraftWriteUp(updatedText);
    draftWriteUpRef.current = updatedText;
    setInSessionImported(true);

    setIsSavingWriteUp(true);
    const ok = await onSavePostNotes(updatedText, {
      keyInsights: insights,
      emotionalObservations,
      inkPages: updatedInk,
    });
    setIsSavingWriteUp(false);

    if (ok) {
      setOcrSuccessMsg('In-session notes successfully imported into write-up!');
      setTimeout(() => setOcrSuccessMsg(null), 3500);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Key Insights Handlers                                              */
  /* ------------------------------------------------------------------ */
  const handleAddInsight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInsightText.trim()) return;
    setInsights((prev) => [...prev, newInsightText.trim()]);
    setNewInsightText('');
    setShowAddInsight(false);
  };

  const handleDeleteInsight = (index: number) => {
    setInsights((prev) => prev.filter((_, i) => i !== index));
  };

  /* ------------------------------------------------------------------ */
  /* Action Item Handlers (saved directly to member_action_items)       */
  /* ------------------------------------------------------------------ */
  const handleCreateActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTask.trim()) return;
    if (!actionMemberId) {
      setActionError('Please select a household member for this commitment.');
      return;
    }

    setActionError(null);
    setIsCreatingAction(true);
    try {
      const ok = await onCreateActionItem({
        memberId: actionMemberId,
        task: actionTask.trim(),
        priority: actionPriority,
        dueDate: actionDueDate || null,
      });
      if (ok) {
        setActionTask('');
        setActionDueDate('');
        setShowAddAction(false);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create action item');
    } finally {
      setIsCreatingAction(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Member Note Handlers (saved directly to member_notes)              */
  /* ------------------------------------------------------------------ */
  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    if (!noteMemberId) {
      setNoteError('Please select a member to associate this note with.');
      return;
    }

    setNoteError(null);
    setIsCreatingNote(true);
    try {
      const ok = await onCreateMemberNote({
        memberId: noteMemberId,
        noteType,
        body: noteBody.trim(),
      });
      if (ok) {
        setNoteBody('');
        setShowAddNote(false);
      }
    } catch (err: any) {
      setNoteError(err.message || 'Failed to save note');
    } finally {
      setIsCreatingNote(false);
    }
  };

  const hasUnsavedChanges = draftWriteUp !== session.clinicalSummary;

  const renderFormattedWriteUp = () => {
    if (!draftWriteUp.trim()) {
      return (
        <p className="text-xs text-warm-gray/60 italic py-4 text-center">
          No write-up text yet. Switch to Edit to type or click ✍️ Write notes.
        </p>
      );
    }

    const headerRegex = /(— From (?:write-up )?ink page \d+(?:,\s*[^—\n]+)? —|— From photo(?:,\s*[^—\n]+)? —|— From In-Session Notes —)/g;
    const parts = draftWriteUp.split(headerRegex);

    return (
      <div className="space-y-2 text-xs leading-relaxed text-charcoal">
        {parts.map((part, idx) => {
          const inkMatch = part.match(/^— From (?:write-up )?ink page (\d+)(?:,\s*([^—\n]+))? —$/);
          if (inkMatch) {
            const pageNum = parseInt(inkMatch[1], 10);
            const dateStr = inkMatch[2]?.trim();
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveNotebookPageIndex(Math.max(0, pageNum - 1));
                  setIsNotebookOpen(true);
                }}
                className="w-full text-left my-2 py-1.5 px-3 rounded-xl bg-sage/10 hover:bg-sage/20 border border-sage/30 text-sage-dark font-medium transition cursor-pointer flex items-center justify-between group shadow-2xs"
                title={`Click to open notebook directly at Page ${pageNum}`}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <PenLine className="w-3.5 h-3.5 text-sage-dark" />
                  <span>— From write-up ink page {pageNum}{dateStr ? `, ${dateStr}` : ''} —</span>
                </span>
                <span className="text-[10px] font-semibold text-sage-dark flex items-center gap-1 group-hover:underline">
                  <span>Open Page {pageNum} in notebook</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </button>
            );
          }

          if (part.startsWith('— From photo')) {
            return (
              <div
                key={idx}
                className="my-2 py-1 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium text-[11px]"
              >
                {part}
              </div>
            );
          }

          if (part.startsWith('— From In-Session Notes')) {
            return (
              <div
                key={idx}
                className="my-2 py-1 px-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-medium text-[11px] flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3 text-sky-700" />
                <span>{part}</span>
              </div>
            );
          }

          if (!part.trim()) return null;

          return (
            <div key={idx} className="prose prose-sm max-w-none text-charcoal/90">
              <ReactMarkdown>{part.trim()}</ReactMarkdown>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {/* 1. Clinical Summary & Consultation Write-up */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-beige/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-sm font-bold text-charcoal whitespace-nowrap">
                Write-Up
              </h3>
              <p className="text-[11px] text-warm-gray truncate">
                Structured clinical synthesis, observations, and recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap overflow-x-auto py-0.5">
            {/* Write Notes (Pen Notebook) Button */}
            <button
              type="button"
              onClick={() => {
                setActiveNotebookPageIndex(Math.max(0, inkPages.length - 1));
                setIsNotebookOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-sage/60 bg-sage/10 hover:bg-sage/20 text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
              title="Open full-screen pen notebook for stylus/mouse handwritten notes"
            >
              <PenLine className="w-3.5 h-3.5 text-sage-dark" />
              <span>✍️ Write notes</span>
              {inkPages.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-sage-dark text-white rounded-full text-[10px] font-bold">
                  {inkPages.length}
                </span>
              )}
            </button>

            {/* Upload Notes Button */}
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark hover:border-sage transition cursor-pointer shadow-2xs disabled:opacity-50 shrink-0 whitespace-nowrap"
              title="Upload photo of handwritten notes and transcribe into write-up"
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

            {/* Import In-Session Notes (if in-session notes exist) */}
            {(Boolean(session.handwrittenNotes?.trim()) || Boolean(session.inkPages && session.inkPages.length > 0)) && (
              <button
                type="button"
                onClick={handleImportInSessionNotes}
                disabled={isSavingWriteUp || isOcrProcessing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
                title="Import handwritten notes taken during the consultation call"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-sky-700" />
                <span>Import In-Session</span>
              </button>
            )}

            {/* Preview / Edit Toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
            >
              {isPreviewMode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-sage-dark" />
                  <span>Edit</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-sage-dark" />
                  <span>Preview</span>
                </>
              )}
            </button>

            {/* Save Notes Button */}
            <button
              type="button"
              onClick={handleSaveWriteUp}
              disabled={isSavingWriteUp || isOcrProcessing}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0 whitespace-nowrap ${
                saveWriteUpSuccess
                  ? 'bg-emerald-600 text-white'
                  : hasUnsavedChanges
                  ? 'bg-charcoal text-white hover:bg-charcoal/90 ring-1 ring-amber-400/60'
                  : 'bg-charcoal text-white hover:bg-charcoal/90'
              }`}
              title="Save write-up text and observations to database"
            >
              {isSavingWriteUp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sage" />
                  <span>Saving...</span>
                </>
              ) : saveWriteUpSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-sage" />
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

        {/* In-Session Notes Available Callout Banner */}
        {(Boolean(session.handwrittenNotes?.trim()) || Boolean(session.inkPages && session.inkPages.length > 0)) &&
          !inSessionImported &&
          !draftWriteUp.includes(session.handwrittenNotes || '___none___') && (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-sky-50/70 border border-sky-200/80 p-2.5 text-xs text-sky-900">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
                <p className="truncate">
                  In-session handwritten notes exist from this consultation call.
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportInSessionNotes}
                className="shrink-0 text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              >
                Import into write-up →
              </button>
            </div>
          )}

        {/* Ink Notebook Pages Gallery (when write-up ink pages exist) */}
        {inkPages.length > 0 && (
          <div className="mb-4 p-3.5 rounded-xl border border-beige/80 bg-[#FAF8F4]/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                <PenLine className="w-3.5 h-3.5 text-sage-dark" />
                <span>Write-Up Ink Pages ({inkPages.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isConvertingAll || isOcrProcessing}
                  onClick={handleConvertAllInkPages}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-charcoal hover:text-sage-dark px-2.5 py-1 rounded-lg border border-beige bg-white hover:border-sage transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Transcribe all write-up ink pages to markdown text via Gemini OCR"
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

            {/* Thumbnail cards row */}
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
                title="Add a new page to write-up notebook"
              >
                <div className="w-7 h-7 rounded-full bg-sage/10 group-hover:bg-sage/20 border border-sage/30 flex items-center justify-center transition">
                  <Plus className="w-3.5 h-3.5 text-sage-dark" />
                </div>
                <span className="text-[11px] font-medium">Add Page</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Links strip to jump to ink pages */}
        {convertedInkPageLinks.length > 0 && (
          <div className="mb-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-warm-gray flex items-center gap-1">
              <PenLine className="w-3 h-3 text-sage-dark" /> Referenced ink pages:
            </span>
            {convertedInkPageLinks.map((item) => (
              <button
                key={item.pageNum}
                type="button"
                onClick={() => {
                  const targetIndex = Math.max(0, item.pageNum - 1);
                  setActiveNotebookPageIndex(targetIndex);
                  setIsNotebookOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-beige hover:border-sage hover:text-sage-dark text-charcoal text-[11px] font-medium shadow-2xs transition cursor-pointer group"
                title={`Open notebook directly at Page ${item.pageNum}`}
              >
                <span>Page {item.pageNum}</span>
                {item.dateStr && (
                  <span className="text-[10px] text-warm-gray group-hover:text-charcoal/70">
                    · {item.dateStr}
                  </span>
                )}
                <ExternalLink className="w-2.5 h-2.5 text-warm-gray group-hover:text-sage-dark" />
              </button>
            ))}
          </div>
        )}

        {/* Write-Up Editor / Preview */}
        {isPreviewMode ? (
          <div className="rounded-xl border border-beige bg-[#faf8f4] p-4 text-xs text-charcoal/90 leading-relaxed max-h-96 overflow-y-auto">
            {renderFormattedWriteUp()}
          </div>
        ) : (
          <textarea
            rows={10}
            value={draftWriteUp}
            onChange={(e) => setDraftWriteUp(e.target.value)}
            onBlur={handleSaveWriteUp}
            placeholder="Document clinical consultation summary, key breakthroughs, recommendations, and next session focuses..."
            className="w-full text-xs rounded-xl border border-beige bg-[#faf8f4] p-3 text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition leading-relaxed font-mono"
          />
        )}

        {/* Full-Screen Pen Ink Notebook Overlay */}
        {isNotebookOpen && (
          <InkNotebook
            initialPages={inkPages}
            initialPageIndex={activeNotebookPageIndex}
            sessionNumber={session.sessionNumber}
            onSave={async (updatedPages) => {
              setInkPages(updatedPages);
              inkPagesRef.current = updatedPages;
              return handleSaveInkPages(updatedPages);
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

      {/* 2. Key Insights & Emotional Dynamics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Insights List */}
        <div className="rounded-2xl border border-beige/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                <Zap className="w-3 h-3" />
              </div>
              <h4 className="font-serif text-xs font-bold text-charcoal">
                Key Insights ({insights.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setShowAddInsight(!showAddInsight)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-dark hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Insight
            </button>
          </div>

          {showAddInsight && (
            <form onSubmit={handleAddInsight} className="mb-3 flex items-center gap-1.5">
              <input
                type="text"
                value={newInsightText}
                onChange={(e) => setNewInsightText(e.target.value)}
                placeholder="New core clinical takeaway..."
                className="flex-1 text-xs rounded-lg border border-beige bg-[#faf8f4] px-2.5 py-1 text-charcoal focus:bg-white focus:border-sage focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-charcoal text-white hover:bg-charcoal/90"
              >
                Add
              </button>
            </form>
          )}

          <div className="space-y-1.5">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-2 rounded-lg bg-[#faf8f4] border border-beige/60 p-2 text-xs text-charcoal/90"
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span className="leading-snug">{insight}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteInsight(idx)}
                  className="text-warm-gray hover:text-rose-600 transition shrink-0 mt-0.5"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-xs text-warm-gray italic py-1">No insights logged yet.</p>
            )}
          </div>
        </div>

        {/* Emotional Observations */}
        <div className="rounded-2xl border border-beige/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800 shrink-0">
              <Heart className="w-3 h-3" />
            </div>
            <h4 className="font-serif text-xs font-bold text-charcoal">
              Emotional State & Dynamics
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                Parental Stress Level
              </span>
              <div className="grid grid-cols-4 gap-1">
                {(['low', 'moderate', 'elevated', 'acute'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      setEmotionalObservations((prev) => ({
                        ...prev,
                        parentalStressLevel: lvl,
                      }))
                    }
                    className={`rounded-lg py-1 text-[11px] font-medium capitalize border transition ${
                      emotionalObservations.parentalStressLevel === lvl
                        ? 'bg-charcoal text-white border-charcoal'
                        : 'bg-[#faf8f4] text-charcoal/70 border-beige hover:bg-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                Nervous System State
              </span>
              <select
                value={emotionalObservations.nervousSystemState}
                onChange={(e) =>
                  setEmotionalObservations((prev) => ({
                    ...prev,
                    nervousSystemState: e.target.value as any,
                  }))
                }
                className="w-full text-xs rounded-lg border border-beige bg-[#faf8f4] px-2.5 py-1 text-charcoal focus:bg-white focus:border-sage"
              >
                <option value="regulated_ventral">Regulated Ventral (Calm & Connected)</option>
                <option value="sympathetic_fight_or_flight">Sympathetic (Fight / Flight)</option>
                <option value="dorsal_vagal_shutdown">Dorsal Vagal (Shutdown / Overwhelmed)</option>
                <option value="fluctuating">Fluctuating State</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Session Action Commitments (directly saved to member_action_items) */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shrink-0">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Session Action Commitments ({sessionActionItems.length})
              </h3>
              <p className="text-[11px] text-warm-gray">
                Assigned per household member and saved directly into member action items
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddAction(!showAddAction)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark hover:border-sage transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-sage-dark" />
            <span>Add Action Item</span>
          </button>
        </div>

        {/* Add Action Item Form */}
        {showAddAction && (
          <form
            onSubmit={handleCreateActionSubmit}
            className="mb-4 rounded-xl bg-[#faf8f4] border border-beige p-3.5 space-y-3 animate-in fade-in"
          >
            {actionError && (
              <p className="text-xs text-rose-600 font-medium">{actionError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                  Household Member
                </label>
                <select
                  value={actionMemberId}
                  onChange={(e) => setActionMemberId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-beige bg-white px-2.5 py-1 text-charcoal"
                >
                  {householdMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({roleLabel(m.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={actionPriority}
                  onChange={(e) => setActionPriority(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-beige bg-white px-2.5 py-1 text-charcoal"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={actionDueDate}
                  onChange={(e) => setActionDueDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-beige bg-white px-2.5 py-1 text-charcoal"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                Commitment / Task Description
              </label>
              <textarea
                rows={2}
                value={actionTask}
                onChange={(e) => setActionTask(e.target.value)}
                placeholder="What is required from him/her? e.g. Introduce 5-minute wind-down anchor before bedtime..."
                className="w-full text-xs rounded-lg border border-beige bg-white p-2.5 text-charcoal focus:outline-hidden focus:border-sage"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddAction(false)}
                className="px-3 py-1 text-xs font-medium text-warm-gray hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingAction}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-charcoal text-white hover:bg-charcoal/90 disabled:opacity-50"
              >
                {isCreatingAction ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-sage" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Commitment</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Action items list for this session */}
        {sessionActionItems.length > 0 ? (
          <div className="space-y-2">
            {sessionActionItems.map((item) => {
              const assignedMember = householdMembers.find(
                (m) => m.id === item.household_member_id
              );
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-beige/80 bg-[#faf8f4] p-3 transition hover:bg-white"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleActionItem(item.id, item.status === 'open' ? 'done' : 'open')}
                      className="mt-0.5 text-warm-gray hover:text-emerald-700 transition cursor-pointer shrink-0"
                      title="Click to toggle status"
                    >
                      {item.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-4 h-4 text-warm-gray hover:text-emerald-600" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-medium leading-snug ${
                          item.status === 'done'
                            ? 'line-through text-warm-gray'
                            : 'text-charcoal'
                        }`}
                      >
                        {item.task}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {assignedMember && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-charcoal/80 border border-beige/80">
                            <User className="w-2.5 h-2.5 text-sage-dark" />
                            {assignedMember.full_name} ({roleLabel(assignedMember.role)})
                          </span>
                        )}
                        {item.priority === 'high' && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-2.5 h-2.5" /> High
                          </span>
                        )}
                        {item.due_date && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-warm-gray">
                            <Calendar className="w-2.5 h-2.5" />
                            Due: {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteActionItem(item.id)}
                    className="text-warm-gray hover:text-rose-600 transition shrink-0 p-1"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf8f4] border border-dashed border-beige p-4 text-center text-xs text-warm-gray">
            No action commitments created for this session yet. Click "Add Action Item" above.
          </div>
        )}
      </div>

      {/* 4. Per-Attendee Longitudinal Notes (saved directly to member_notes) */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800 shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Member Longitudinal Observations ({sessionMemberNotes.length})
              </h3>
              <p className="text-[11px] text-warm-gray">
                Specific clinical notes linked to attendees from this consultation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddNote(!showAddNote)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark hover:border-sage transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-sage-dark" />
            <span>Add Member Note</span>
          </button>
        </div>

        {/* Add Member Note Form */}
        {showAddNote && (
          <form
            onSubmit={handleCreateNoteSubmit}
            className="mb-4 rounded-xl bg-[#faf8f4] border border-beige p-3.5 space-y-3 animate-in fade-in"
          >
            {noteError && (
              <p className="text-xs text-rose-600 font-medium">{noteError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                  Household Member
                </label>
                <select
                  value={noteMemberId}
                  onChange={(e) => setNoteMemberId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-beige bg-white px-2.5 py-1 text-charcoal"
                >
                  {householdMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({roleLabel(m.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                  Note Type
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-beige bg-white px-2.5 py-1 text-charcoal"
                >
                  <option value="observation">Observation (Behavior / Demeanor)</option>
                  <option value="concern">Concern (Risk / Escalation)</option>
                  <option value="progress">Progress (Positive Milestone)</option>
                  <option value="follow_up">Follow Up</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wider block mb-1">
                Observation Body
              </label>
              <textarea
                rows={2}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Specific clinical note regarding this member during this session..."
                className="w-full text-xs rounded-lg border border-beige bg-white p-2.5 text-charcoal focus:outline-hidden focus:border-sage"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddNote(false)}
                className="px-3 py-1 text-xs font-medium text-warm-gray hover:text-charcoal"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingNote}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-charcoal text-white hover:bg-charcoal/90 disabled:opacity-50"
              >
                {isCreatingNote ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-sage" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Note</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Member notes list for this session */}
        {sessionMemberNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sessionMemberNotes.map((note) => {
              const member = householdMembers.find((m) => m.id === note.household_member_id);
              return (
                <div
                  key={note.id}
                  className="rounded-xl border border-beige/80 bg-[#faf8f4] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-charcoal">
                      {member ? member.full_name : 'Member'}
                    </span>
                    <span className="rounded-md bg-white border border-beige/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sage-dark">
                      {note.note_type}
                    </span>
                  </div>
                  <p className="text-charcoal/90 leading-relaxed font-sans mt-1">
                    {note.body}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf8f4] border border-dashed border-beige p-4 text-center text-xs text-warm-gray">
            No member-specific observations logged for this session yet.
          </div>
        )}
      </div>
    </div>
  );
};
