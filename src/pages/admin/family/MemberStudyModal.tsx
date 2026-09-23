import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Info,
  Calendar,
  UserRound,
  Check,
  Pencil,
  Copy,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  currentAge,
  roleLabel,
  CONTENT_TYPE_LABELS,
  type CaseSession,
  type Household,
  type HouseholdMember,
  type HouseholdMemberRole,
  type MemberStudyResult,
  type SessionContent,
} from '../../../types/family';

const ROLE_OPTIONS: HouseholdMemberRole[] = ['mother', 'father', 'child', 'guardian', 'other'];

interface MemberStudyModalProps {
  member: HouseholdMember;
  household: Household;
  allHouseholdSessions: CaseSession[];
  cachedStudy?: MemberStudyResult | null;
  onClose: () => void;
  onMemberUpdated: (updated: HouseholdMember) => void;
  onStudyGenerated: (study: MemberStudyResult) => void;
  onAttendanceChanged?: () => void;
}

export const MemberStudyModal = ({
  member,
  household,
  allHouseholdSessions,
  cachedStudy,
  onClose,
  onMemberUpdated,
  onStudyGenerated,
  onAttendanceChanged,
}: MemberStudyModalProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<'study' | 'sessions' | 'attendance'>('study');
  const [attendedSessionIds, setAttendedSessionIds] = useState<string[]>([]);
  const [sessionContents, setSessionContents] = useState<SessionContent[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Study generation state
  const [runningStudy, setRunningStudy] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [studyResult, setStudyResult] = useState<MemberStudyResult | null>(cachedStudy ?? null);
  const [copied, setCopied] = useState(false);

  // Member editing state inside modal header
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editDraft, setEditDraft] = useState({
    full_name: member.full_name,
    role: member.role,
    birth_year: member.birth_year ? String(member.birth_year) : '',
    notes: member.notes || '',
  });
  const [savingMember, setSavingMember] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load attended session IDs & content
  const loadMemberData = async () => {
    setLoadingInitial(true);
    try {
      const { data: attendees, error: attErr } = await supabase
        .from('session_attendees')
        .select('session_id')
        .eq('household_member_id', member.id);
      if (attErr) throw attErr;

      const ids = (attendees ?? []).map((a) => a.session_id);
      setAttendedSessionIds(ids);

      if (ids.length > 0) {
        const { data: contents, error: contentErr } = await supabase
          .from('session_content')
          .select('*')
          .in('session_id', ids)
          .order('created_at', { ascending: false });
        if (contentErr) throw contentErr;
        setSessionContents(contents ?? []);
      } else {
        setSessionContents([]);
      }
    } catch (err: any) {
      console.error('Failed to load member session history:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    void loadMemberData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id]);

  // Handle member edit save
  const handleSaveMember = async () => {
    if (!editDraft.full_name.trim()) return;
    setSavingMember(true);
    setEditError(null);
    try {
      const updatedPayload = {
        full_name: editDraft.full_name.trim(),
        role: editDraft.role,
        birth_year: editDraft.birth_year ? Number(editDraft.birth_year) : null,
        notes: editDraft.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('household_members')
        .update(updatedPayload)
        .eq('id', member.id)
        .select()
        .single();
      if (error) throw error;
      onMemberUpdated(data as HouseholdMember);
      setIsEditingMember(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update member.');
    } finally {
      setSavingMember(false);
    }
  };

  // Toggle session attendance
  const handleToggleAttendance = async (sessionId: string) => {
    const isAttending = attendedSessionIds.includes(sessionId);
    try {
      if (isAttending) {
        setAttendedSessionIds((prev) => prev.filter((id) => id !== sessionId));
        await supabase
          .from('session_attendees')
          .delete()
          .eq('session_id', sessionId)
          .eq('household_member_id', member.id);
      } else {
        setAttendedSessionIds((prev) => [...prev, sessionId]);
        await supabase
          .from('session_attendees')
          .insert({ session_id: sessionId, household_member_id: member.id });
      }
      onAttendanceChanged?.();
      // Reload session content in background to keep history up to date
      void loadMemberData();
    } catch (err: any) {
      console.error('Error toggling attendance:', err);
      // Revert on error
      void loadMemberData();
    }
  };

  // Run AI Study
  const handleRunStudy = async () => {
    if (attendedSessionIds.length === 0) return;
    setRunningStudy(true);
    setStudyError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('family-member-study', {
        body: { householdId: household.id, memberId: member.id },
      });
      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);

      const res: MemberStudyResult = {
        text: data.text,
        frameworkConfigured: data.frameworkConfigured,
        sessionsAnalyzed: data.sessionsAnalyzed,
        memberName: member.full_name,
        timestamp: new Date().toISOString(),
      };
      setStudyResult(res);
      onStudyGenerated(res);
    } catch (err: any) {
      setStudyError(err.message || 'Failed to generate member study.');
    } finally {
      setRunningStudy(false);
    }
  };

  const handleCopyStudy = () => {
    if (!studyResult?.text) return;
    navigator.clipboard.writeText(studyResult.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Attended sessions sorted chronologically
  const attendedSessions = useMemo(() => {
    return allHouseholdSessions
      .filter((s) => attendedSessionIds.includes(s.id))
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }, [allHouseholdSessions, attendedSessionIds]);

  const firstAttended = attendedSessions[attendedSessions.length - 1];
  const lastAttended = attendedSessions[0];
  const attendanceRate = allHouseholdSessions.length > 0
    ? Math.round((attendedSessions.length / allHouseholdSessions.length) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-beige/60 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-beige/70 bg-[#faf8f4] flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            {isEditingMember ? (
              <div className="space-y-3 pt-1">
                {editError ? (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    {editError}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={editDraft.full_name}
                    onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))}
                    placeholder="Full name"
                    className="flex-1 min-w-[180px] rounded-lg border border-beige bg-white px-3 py-1.5 text-sm font-medium text-charcoal outline-none focus:border-sage"
                  />
                  <select
                    value={editDraft.role}
                    onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value as HouseholdMemberRole }))}
                    className="rounded-lg border border-beige bg-white px-3 py-1.5 text-xs font-medium text-charcoal outline-none focus:border-sage"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={editDraft.birth_year}
                    onChange={(e) => setEditDraft((d) => ({ ...d, birth_year: e.target.value }))}
                    placeholder="Birth year"
                    className="w-24 rounded-lg border border-beige bg-white px-3 py-1.5 text-xs text-charcoal outline-none focus:border-sage"
                  />
                </div>
                <textarea
                  value={editDraft.notes}
                  onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Clinical observations or member notes..."
                  rows={2}
                  className="w-full rounded-lg border border-beige bg-white px-3 py-1.5 text-xs text-charcoal outline-none focus:border-sage resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingMember(false);
                      setEditDraft({
                        full_name: member.full_name,
                        role: member.role,
                        birth_year: member.birth_year ? String(member.birth_year) : '',
                        notes: member.notes || '',
                      });
                    }}
                    className="rounded-lg px-3 py-1 text-xs text-warm-gray hover:text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMember}
                    disabled={savingMember || !editDraft.full_name.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
                  >
                    {savingMember ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center text-sage-dark shrink-0">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-charcoal tracking-tight">
                    {member.full_name}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-sage/20 border border-sage/40 px-2.5 py-0.5 text-xs font-medium text-sage-dark">
                    {roleLabel(member.role)}
                  </span>
                  {member.birth_year ? (
                    <span className="text-xs text-warm-gray">
                      Age {currentAge(member.birth_year)} (b. {member.birth_year})
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsEditingMember(true)}
                    className="p-1 text-warm-gray hover:text-charcoal hover:bg-beige/40 rounded-lg transition"
                    title="Edit member details"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                {member.notes ? (
                  <p className="mt-1.5 text-xs text-warm-gray leading-relaxed pl-10 max-w-2xl">
                    {member.notes}
                  </p>
                ) : null}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-warm-gray hover:text-charcoal rounded-xl hover:bg-beige/40 transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Stats Strip */}
        <div className="px-6 py-2.5 bg-cream/30 border-b border-beige/60 flex flex-wrap items-center gap-4 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray">Attended:</span>
            <span className="font-semibold text-charcoal">
              {attendedSessions.length} of {allHouseholdSessions.length} sessions ({attendanceRate}%)
            </span>
          </div>
          {firstAttended ? (
            <div className="flex items-center gap-1.5 text-warm-gray">
              <span className="text-[10px] font-semibold uppercase tracking-wider">First:</span>
              <span className="text-charcoal font-medium">
                {new Date(firstAttended.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          ) : null}
          {lastAttended ? (
            <div className="flex items-center gap-1.5 text-warm-gray">
              <span className="text-[10px] font-semibold uppercase tracking-wider">Most Recent:</span>
              <span className="text-charcoal font-medium">
                {new Date(lastAttended.session_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          ) : null}
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-beige/70 bg-white flex items-center gap-6 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`py-3 font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'study'
                ? 'border-sage-dark text-sage-dark'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Longitudinal Study
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`py-3 font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'border-sage-dark text-sage-dark'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Session Notes ({attendedSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'border-sage-dark text-sage-dark'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Attendance Editor
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: AI Study */}
          {activeTab === 'study' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-sage/30 bg-sage/5">
                <div>
                  <h4 className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-sage-dark" />
                    Individual Clinical Study
                  </h4>
                  <p className="text-xs text-warm-gray mt-0.5">
                    Gathers notes across all {attendedSessions.length} attended sessions to synthesize patterns, relational shifts, and continuity insights for {member.full_name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunStudy}
                  disabled={runningStudy || attendedSessions.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-xs font-medium text-white hover:bg-black disabled:opacity-50 transition shadow-2xs"
                >
                  {runningStudy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-sage" />
                      {studyResult ? 'Re-run Study' : 'Run Member Study'}
                    </>
                  )}
                </button>
              </div>

              {attendedSessions.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-beige/80 bg-[#faf8f4] text-xs text-warm-gray">
                  <UserRound className="h-8 w-8 text-warm-gray/40 mx-auto mb-2" />
                  No attended sessions are recorded for {member.full_name} yet. Mark sessions in the Attendance Editor to enable longitudinal analysis.
                </div>
              ) : null}

              {studyError ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <p>{studyError}</p>
                </div>
              ) : null}

              {studyResult ? (
                <div className="rounded-2xl border border-beige/80 bg-[#faf8f4] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-beige/60 pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-gray">
                      Study Output · {studyResult.sessionsAnalyzed} sessions analyzed
                      {studyResult.timestamp ? ` · ${new Date(studyResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyStudy}
                      className="inline-flex items-center gap-1.5 text-xs text-warm-gray hover:text-charcoal px-2.5 py-1 rounded-lg border border-beige bg-white hover:border-sage/60 transition"
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {!studyResult.frameworkConfigured ? (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-[11px] text-amber-900 leading-relaxed">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                      <p>
                        No clinical framework configured yet for this practice — this is a raw observational pattern summary based strictly on verbatim records, not a diagnostic assessment.
                      </p>
                    </div>
                  ) : null}

                  <div className="prose prose-sm max-w-none text-charcoal leading-relaxed whitespace-pre-wrap font-sans text-xs sm:text-sm">
                    {studyResult.text}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* TAB 2: Attended Session Notes */}
          {activeTab === 'sessions' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-warm-gray">
                <span>Showing notes from {attendedSessions.length} attended session{attendedSessions.length !== 1 ? 's' : ''}</span>
                <Link
                  to={`/admin/sessions?client=${household.primary_contact_profile_id}`}
                  className="inline-flex items-center gap-1 text-sage-dark hover:underline font-medium"
                >
                  Open Session Notes Workspace <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {loadingInitial ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-sage-dark" />
                </div>
              ) : attendedSessions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-beige/80 bg-[#faf8f4] text-xs text-warm-gray">
                  No sessions marked as attended for this member yet.
                </div>
              ) : (
                attendedSessions.map((session) => {
                  const contents = sessionContents.filter((c) => c.session_id === session.id);
                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-beige/70 bg-[#faf8f4] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-sage-dark" />
                          <span className="font-semibold text-sm text-charcoal">
                            {new Date(session.session_date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                              session.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : session.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <Link
                          to={`/admin/sessions?client=${household.primary_contact_profile_id}&session=${session.id}`}
                          className="text-xs text-warm-gray hover:text-charcoal hover:underline flex items-center gap-1"
                        >
                          Edit Notes <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>

                      {contents.length === 0 ? (
                        <p className="text-xs text-warm-gray italic pl-6">
                          No notes or transcript content recorded for this session.
                        </p>
                      ) : (
                        <div className="space-y-2.5 pl-6">
                          {contents.map((c) => (
                            <div key={c.id} className="rounded-xl border border-beige/60 bg-white p-3 space-y-1">
                              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-sage-dark bg-sage/10 rounded px-1.5 py-0.5">
                                {CONTENT_TYPE_LABELS[c.content_type] || c.content_type}
                              </span>
                              <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap">
                                {c.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {/* TAB 3: Attendance Editor */}
          {activeTab === 'attendance' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-beige/80 bg-cream/40 text-xs text-charcoal">
                Toggle which sessions <strong>{member.full_name}</strong> participated in. Changes take effect immediately and feed directly into the individual study synthesis.
              </div>

              {allHouseholdSessions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-beige/80 bg-[#faf8f4] text-xs text-warm-gray">
                  No sessions exist in this household yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {allHouseholdSessions.map((s) => {
                    const isAttending = attendedSessionIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-xl border border-beige/70 bg-[#faf8f4] px-4 py-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar className="h-4 w-4 text-sage-dark" />
                          <div>
                            <p className="text-xs font-medium text-charcoal">
                              {new Date(s.session_date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <span
                              className={`text-[10px] font-medium uppercase ${
                                s.status === 'completed'
                                  ? 'text-emerald-700'
                                  : s.status === 'cancelled'
                                  ? 'text-rose-700'
                                  : 'text-sky-700'
                              }`}
                            >
                              Status: {s.status}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(s.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                            isAttending
                              ? 'bg-sage text-white border border-sage hover:bg-sage-dark'
                              : 'bg-white text-warm-gray border border-beige hover:border-sage/60'
                          }`}
                        >
                          {isAttending ? <Check className="h-3 w-3" /> : null}
                          {isAttending ? 'Attended' : 'Not Attended'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-beige/70 bg-[#faf8f4] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-beige bg-white px-4 py-2 text-xs font-medium text-charcoal hover:border-sage transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
