import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { HouseholdMember, MemberActionItem, MemberNote, MemberNoteType } from '../../types/family';
import type { SessionTranscript, EmotionalObservation } from '../../types/session';
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
    }
  ) => Promise<boolean>;
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
}) => {
  // Write-up editor state
  const [draftWriteUp, setDraftWriteUp] = useState(session.clinicalSummary);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSavingWriteUp, setIsSavingWriteUp] = useState(false);
  const [saveWriteUpSuccess, setSaveWriteUpSuccess] = useState(false);

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

  // Sync draft when session changes
  useEffect(() => {
    setDraftWriteUp(session.clinicalSummary);
    setInsights(session.keyInsights || []);
    setEmotionalObservations(
      session.emotionalObservations || {
        parentalStressLevel: 'moderate',
        nervousSystemState: 'fluctuating',
        identifiedTriggers: [],
        strengthsNoted: [],
      }
    );
    setSaveWriteUpSuccess(false);
  }, [session.id, session.clinicalSummary]);

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
      const ok = await onSavePostNotes(draftWriteUp, {
        keyInsights: insights,
        emotionalObservations,
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

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {/* 1. Clinical Summary & Consultation Write-up */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Consultation Write-Up (Post-Session Notes)
              </h3>
              <p className="text-[11px] text-warm-gray">
                Structured clinical synthesis, observations, and recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-beige bg-[#faf8f4] hover:bg-white text-charcoal hover:text-sage-dark transition cursor-pointer shadow-2xs"
            >
              {isPreviewMode ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-sage-dark" />
                  <span>Edit Markdown</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-sage-dark" />
                  <span>Preview</span>
                </>
              )}
            </button>

            {saveWriteUpSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Saved
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveWriteUp}
              disabled={isSavingWriteUp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-charcoal text-white hover:bg-charcoal/90 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSavingWriteUp ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-sage" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 text-sage" />
                  <span>Save Write-Up</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isPreviewMode ? (
          <div className="rounded-xl border border-beige bg-[#faf8f4] p-4 text-xs text-charcoal/90 leading-relaxed max-h-96 overflow-y-auto prose prose-sm max-w-none">
            <ReactMarkdown>{draftWriteUp}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            rows={10}
            value={draftWriteUp}
            onChange={(e) => setDraftWriteUp(e.target.value)}
            placeholder="Document clinical consultation summary, key breakthroughs, recommendations, and next session focuses..."
            className="w-full text-xs rounded-xl border border-beige bg-[#faf8f4] p-3 text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition leading-relaxed font-mono"
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
