import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  User,
  Users,
  AlertTriangle,
  Bookmark,
  Calendar,
  Save,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import type { Household, HouseholdMember, MemberActionItem, MemberNote } from '../../types/family';
import type { SessionTranscript } from '../../types/session';
import { roleLabel, currentAge } from '../../types/family';

interface SessionBeforeStepProps {
  household: Household | null;
  householdMembers: HouseholdMember[];
  openActionItems: MemberActionItem[];
  onToggleActionItem: (id: string, newStatus: 'open' | 'done') => Promise<void>;
  memberNotes: MemberNote[];
  previousSession: SessionTranscript | null;
  initialPrepNotes: string;
  onSavePrepNotes: (text: string) => Promise<boolean>;
}

export const SessionBeforeStep: React.FC<SessionBeforeStepProps> = ({
  household,
  householdMembers,
  openActionItems,
  onToggleActionItem,
  memberNotes,
  previousSession,
  initialPrepNotes,
  onSavePrepNotes,
}) => {
  const [draftPrepNotes, setDraftPrepNotes] = useState(initialPrepNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [togglingActionId, setTogglingActionId] = useState<string | null>(null);

  useEffect(() => {
    setDraftPrepNotes(initialPrepNotes);
    setSaveSuccess(false);
  }, [initialPrepNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await onSavePrepNotes(draftPrepNotes);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    setTogglingActionId(id);
    try {
      await onToggleActionItem(id, currentStatus === 'open' ? 'done' : 'open');
    } finally {
      setTogglingActionId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-5">
      {/* 1. Family Context & Working Plan */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-charcoal">
              Family Clinical Context & Working Plan
            </h3>
            <p className="text-[11px] text-warm-gray">
              {household ? `${household.family_name || 'Family'} Case Overview` : 'No connected household record'}
            </p>
          </div>
        </div>

        {household ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div className="rounded-xl bg-[#faf8f4] border border-beige/80 p-3.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">
                <Bookmark className="w-3 h-3 text-terracotta" />
                Presenting Issue
              </span>
              <p className="text-xs text-charcoal/90 leading-relaxed font-medium">
                {household.presenting_issue || 'No presenting focus recorded.'}
              </p>
            </div>

            <div className="rounded-xl bg-[#faf8f4] border border-beige/80 p-3.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-charcoal/60 mb-1.5">
                <Sparkles className="w-3 h-3 text-sage-dark" />
                Active Working Plan
              </span>
              <p className="text-xs text-charcoal/90 leading-relaxed font-medium">
                {household.working_plan || 'No working plan formulated yet.'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-warm-gray italic py-2">
            No family case profile linked to this client yet.
          </p>
        )}
      </div>

      {/* 2. Previous Session's Notes (Read-Only) */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-charcoal/10 border border-charcoal/20 flex items-center justify-center text-charcoal shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Prior Session Recap (Read-Only)
              </h3>
              <p className="text-[11px] text-warm-gray">
                {previousSession
                  ? `Session #${previousSession.sessionNumber} · ${new Date(previousSession.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : 'First session with this family'}
              </p>
            </div>
          </div>
        </div>

        {previousSession ? (
          <div className="rounded-xl bg-[#faf8f4] border border-beige/80 p-4 max-h-60 overflow-y-auto custom-scrollbar">
            <div className="prose prose-sm max-w-none text-xs text-charcoal/90 leading-relaxed">
              <ReactMarkdown>{previousSession.clinicalSummary}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf8f4] border border-dashed border-beige p-4 text-center text-xs text-warm-gray">
            This is the initial session for this client. No previous session notes exist.
          </div>
        )}
      </div>

      {/* 3. Open Commitments / Action Items Across Household */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Open Commitments ({openActionItems.length})
              </h3>
              <p className="text-[11px] text-warm-gray">
                Tasks from previous sessions awaiting completion
              </p>
            </div>
          </div>
        </div>

        {openActionItems.length > 0 ? (
          <div className="space-y-2">
            {openActionItems.map((item) => {
              const assignedMember = householdMembers.find(
                (m) => m.id === item.household_member_id
              );
              const isToggling = togglingActionId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-beige/80 bg-[#faf8f4] p-3 transition hover:bg-white"
                >
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(item.id, item.status)}
                    className="mt-0.5 text-warm-gray hover:text-emerald-700 transition cursor-pointer shrink-0 disabled:opacity-50"
                    title="Click to mark done"
                  >
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sage-dark" />
                    ) : item.status === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-4 h-4 text-warm-gray hover:text-emerald-600" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-charcoal leading-snug">
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
                          <AlertTriangle className="w-2.5 h-2.5" /> High Priority
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
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-[#faf8f4] border border-dashed border-beige p-4 text-center text-xs text-warm-gray">
            No open commitments pending. All previous action items are resolved.
          </div>
        )}
      </div>

      {/* 4. Household Members & Longitudinal Clinical Notes */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800 shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-charcoal">
              Family Personas & Recent Member Notes
            </h3>
            <p className="text-[11px] text-warm-gray">
              Longitudinal behavioral observations and concern levels
            </p>
          </div>
        </div>

        {householdMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {householdMembers.map((member) => {
              const age = currentAge(member.birth_year);
              const recentNotes = memberNotes
                .filter((n) => n.household_member_id === member.id)
                .slice(0, 3);

              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-beige/80 bg-[#faf8f4] p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-charcoal">
                          {member.full_name}
                        </h4>
                        <span className="text-[10px] text-warm-gray">
                          {roleLabel(member.role)} {age ? `· ${age}y` : ''}
                        </span>
                      </div>

                      {member.concern_level && (
                        <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 border border-amber-300">
                          {member.concern_level}
                        </span>
                      )}
                    </div>

                    {member.persona_summary && (
                      <p className="text-[11px] text-charcoal/80 mb-2 italic">
                        "{member.persona_summary}"
                      </p>
                    )}

                    <div className="space-y-1.5 mt-2 border-t border-beige/60 pt-2">
                      <span className="text-[9px] font-semibold text-charcoal/50 uppercase tracking-wider block">
                        Recent Notes ({recentNotes.length})
                      </span>
                      {recentNotes.length > 0 ? (
                        recentNotes.map((note) => (
                          <div
                            key={note.id}
                            className="rounded-lg bg-white p-2 border border-beige/60 text-[11px]"
                          >
                            <div className="flex items-center justify-between text-[9px] text-warm-gray mb-0.5">
                              <span className="font-semibold uppercase tracking-wider text-sage-dark">
                                {note.note_type}
                              </span>
                              <span>{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-charcoal/90 leading-tight line-clamp-2">
                              {note.body}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-warm-gray italic">
                          No notes recorded yet for this member.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-warm-gray italic py-2">
            No family members registered in this household.
          </p>
        )}
      </div>

      {/* 5. "My Prep Notes" Textarea */}
      <div className="rounded-2xl border border-beige/80 bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                My Prep Notes
              </h3>
              <p className="text-[11px] text-warm-gray">
                Personal preparation anchors, hypotheses, and clinical cues for this session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> Saved
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-charcoal text-white hover:bg-charcoal/90 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-sage" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 text-sage" />
                  <span>Save Prep Notes</span>
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={draftPrepNotes}
          onChange={(e) => setDraftPrepNotes(e.target.value)}
          placeholder="Jot down notes before the session begins: what to observe, key questions to ask, anchors to revisit..."
          className="w-full text-xs rounded-xl border border-beige bg-[#faf8f4] p-3 text-charcoal placeholder:text-warm-gray/60 focus:bg-white focus:border-sage focus:outline-hidden transition leading-relaxed font-sans mt-2"
        />
      </div>
    </div>
  );
};
