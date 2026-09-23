import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Calendar,
  UserRound,
  Check,
  Pencil,
  Copy,
  ExternalLink,
  CheckCircle2,
  Plus,
  Trash2,
  ListTodo,
  FileText,
  ShieldAlert,
  Heart,
  Tag,
  Flame,
  CheckSquare,
  Circle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  currentAge,
  roleLabel,
  type CaseSession,
  type Household,
  type HouseholdMember,
  type HouseholdMemberRole,
  type MemberStudyResult,
  type MemberNote,
  type MemberActionItem,
  type MemberNoteType,
  type MemberActionPriority,
} from '../../../types/family';

const ROLE_OPTIONS: HouseholdMemberRole[] = ['mother', 'father', 'child', 'guardian', 'other'];

// Placeholder suggestion lists per project-plan/client-interaction/decisions.md §6.
// To be updated once Mai provides the official clinical taxonomy.
const CONCERN_LEVEL_SUGGESTIONS = [
  'Primary concern',
  'Secondary concern',
  'Source of friction',
  'Supportive anchor',
  'Observational only',
];

// Placeholder suggestion lists per project-plan/client-interaction/decisions.md §6.
// To be updated once Mai provides the official clinical taxonomy.
const DYNAMIC_ROLE_SUGGESTIONS = [
  'Primary focus',
  'Core caregiver',
  'Co-regulator',
  'Anxious observer',
  'Withdrawn',
  'Secondary caregiver',
];

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
  const [activeTab, setActiveTab] = useState<'persona' | 'notes' | 'actions' | 'study' | 'attendance'>('persona');
  const [attendedSessionIds, setAttendedSessionIds] = useState<string[]>([]);

  // Persona State
  const [personaDraft, setPersonaDraft] = useState({
    persona_summary: member.persona_summary || '',
    concern_level: member.concern_level || '',
    family_dynamic_role: member.family_dynamic_role || '',
    temperament_traits: member.temperament_traits || [],
    known_triggers: member.known_triggers || [],
    strengths: member.strengths || [],
  });
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaSavedToast, setPersonaSavedToast] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);

  // Tag inputs
  const [newTraitInput, setNewTraitInput] = useState('');
  const [newTriggerInput, setNewTriggerInput] = useState('');
  const [newStrengthInput, setNewStrengthInput] = useState('');

  // Longitudinal Notes State (member_notes)
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteType, setNewNoteType] = useState<MemberNoteType>('observation');
  const [newNoteSessionId, setNewNoteSessionId] = useState<string>('');
  const [addingNote, setAddingNote] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Member Action Items ("What is required from him/her")
  const [actions, setActions] = useState<MemberActionItem[]>([]);
  const [newActionTask, setNewActionTask] = useState('');
  const [newActionPriority, setNewActionPriority] = useState<MemberActionPriority>('normal');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [addingAction, setAddingAction] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);

  // Study generation state
  const [runningStudy, setRunningStudy] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [studyResult, setStudyResult] = useState<MemberStudyResult | null>(cachedStudy ?? null);
  const [copied, setCopied] = useState(false);

  // Member base editing state inside modal header
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

  // Load attended session IDs, plus member_notes and member_action_items
  const loadMemberData = async () => {
    try {
      const [{ data: attendees, error: attErr }, { data: memberNotesData }, { data: memberActionsData }] =
        await Promise.all([
          supabase
            .from('session_attendees')
            .select('session_id')
            .eq('household_member_id', member.id),
          supabase
            .from('member_notes')
            .select('*')
            .eq('household_member_id', member.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('member_action_items')
            .select('*')
            .eq('household_member_id', member.id)
            .order('created_at', { ascending: false }),
        ]);

      if (attErr) throw attErr;

      const ids = (attendees ?? []).map((a) => a.session_id);
      setAttendedSessionIds(ids);
      setNotes((memberNotesData as MemberNote[]) || []);
      setActions((memberActionsData as MemberActionItem[]) || []);
    } catch (err: any) {
      console.error('Failed to load member session history:', err);
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

  // Save Persona Attributes
  const handleSavePersona = async () => {
    setSavingPersona(true);
    setPersonaError(null);
    try {
      const payload = {
        persona_summary: personaDraft.persona_summary || null,
        concern_level: personaDraft.concern_level || null,
        family_dynamic_role: personaDraft.family_dynamic_role || null,
        temperament_traits: personaDraft.temperament_traits,
        known_triggers: personaDraft.known_triggers,
        strengths: personaDraft.strengths,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('household_members')
        .update(payload)
        .eq('id', member.id)
        .select()
        .single();
      if (error) throw error;
      onMemberUpdated(data as HouseholdMember);
      setPersonaSavedToast(true);
      setTimeout(() => setPersonaSavedToast(false), 2500);
    } catch (err: any) {
      setPersonaError(err.message || 'Failed to save persona.');
    } finally {
      setSavingPersona(false);
    }
  };

  // Add Tag Handlers
  const handleAddTrait = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newTraitInput.trim();
    if (!val || personaDraft.temperament_traits.includes(val)) return;
    setPersonaDraft((prev) => ({ ...prev, temperament_traits: [...prev.temperament_traits, val] }));
    setNewTraitInput('');
  };
  const handleRemoveTrait = (trait: string) => {
    setPersonaDraft((prev) => ({
      ...prev,
      temperament_traits: prev.temperament_traits.filter((t) => t !== trait),
    }));
  };

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newTriggerInput.trim();
    if (!val || personaDraft.known_triggers.includes(val)) return;
    setPersonaDraft((prev) => ({ ...prev, known_triggers: [...prev.known_triggers, val] }));
    setNewTriggerInput('');
  };
  const handleRemoveTrigger = (trigger: string) => {
    setPersonaDraft((prev) => ({
      ...prev,
      known_triggers: prev.known_triggers.filter((t) => t !== trigger),
    }));
  };

  const handleAddStrength = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newStrengthInput.trim();
    if (!val || personaDraft.strengths.includes(val)) return;
    setPersonaDraft((prev) => ({ ...prev, strengths: [...prev.strengths, val] }));
    setNewStrengthInput('');
  };
  const handleRemoveStrength = (str: string) => {
    setPersonaDraft((prev) => ({
      ...prev,
      strengths: prev.strengths.filter((s) => s !== str),
    }));
  };

  // Note Handlers
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim()) return;
    setAddingNote(true);
    setNotesError(null);
    try {
      const { data, error } = await supabase
        .from('member_notes')
        .insert({
          household_member_id: member.id,
          note_type: newNoteType,
          session_id: newNoteSessionId || null,
          body: newNoteBody.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      setNotes((prev) => [data as MemberNote, ...prev]);
      setNewNoteBody('');
    } catch (err: any) {
      setNotesError(err.message || 'Failed to save note.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('member_notes').delete().eq('id', id);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      setNotesError(err.message || 'Failed to delete note.');
    }
  };

  // Action Item Handlers
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTask.trim()) return;
    setAddingAction(true);
    setActionsError(null);
    try {
      const { data, error } = await supabase
        .from('member_action_items')
        .insert({
          household_member_id: member.id,
          task: newActionTask.trim(),
          priority: newActionPriority,
          due_date: newActionDueDate || null,
          session_id: null,
          source: 'coach',
          status: 'open',
        })
        .select()
        .single();
      if (error) throw error;
      setActions((prev) => [data as MemberActionItem, ...prev]);
      setNewActionTask('');
      setNewActionDueDate('');
    } catch (err: any) {
      setActionsError(err.message || 'Failed to add action item.');
    } finally {
      setAddingAction(false);
    }
  };

  const handleToggleActionStatus = async (item: MemberActionItem) => {
    const nextStatus = item.status === 'done' ? 'open' : 'done';
    try {
      const { data, error } = await supabase
        .from('member_action_items')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .select()
        .single();
      if (error) throw error;
      setActions((prev) => prev.map((a) => (a.id === item.id ? (data as MemberActionItem) : a)));
    } catch (err: any) {
      setActionsError(err.message || 'Failed to update action status.');
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      const { error } = await supabase.from('member_action_items').delete().eq('id', id);
      if (error) throw error;
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      setActionsError(err.message || 'Failed to delete action.');
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
      void loadMemberData();
    } catch (err: any) {
      console.error('Error toggling attendance:', err);
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

  const openActionsCount = useMemo(() => actions.filter((a) => a.status === 'open').length, [actions]);

  const attendanceRate = useMemo(() => {
    return allHouseholdSessions.length > 0
      ? Math.round((attendedSessionIds.length / allHouseholdSessions.length) * 100)
      : 0;
  }, [allHouseholdSessions.length, attendedSessionIds.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-beige/60 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-beige/70 bg-[#faf8f4] flex items-start justify-between gap-4 shrink-0">
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
                    className="flex-1 min-w-[180px] rounded-lg border border-beige bg-white px-3 py-1.5 text-xs outline-none focus:border-sage font-medium"
                  />
                  <select
                    value={editDraft.role}
                    onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value as HouseholdMemberRole }))}
                    className="rounded-lg border border-beige bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sage"
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
                    placeholder="Birth year (e.g. 2018)"
                    className="w-32 rounded-lg border border-beige bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sage"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveMember}
                    disabled={savingMember || !editDraft.full_name.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal px-3 py-1 text-xs font-medium text-white hover:bg-charcoal/90 disabled:opacity-50"
                  >
                    {savingMember ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save Details
                  </button>
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
                    className="rounded-lg border border-beige px-2.5 py-1 text-xs text-warm-gray hover:text-charcoal"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-sage-dark bg-sage/15 px-2 py-0.5 rounded-md">
                    Family Member Dossier
                  </span>
                  <span className="text-xs text-warm-gray">· {household.family_name}</span>
                  {member.concern_level && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      <Flame className="w-2.5 h-2.5 text-amber-700" />
                      {member.concern_level}
                    </span>
                  )}
                  {member.family_dynamic_role && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-cream text-charcoal border border-beige">
                      <Tag className="w-2.5 h-2.5 text-warm-gray" />
                      {member.family_dynamic_role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-lg font-serif font-bold text-charcoal">{member.full_name}</h3>
                  <span className="text-xs font-medium text-warm-gray">
                    ({roleLabel(member.role)}
                    {member.birth_year ? ` · Age ${currentAge(member.birth_year)}` : ''})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingMember(true)}
                    className="p-1 text-warm-gray hover:text-charcoal rounded hover:bg-beige/40 transition"
                    title="Edit Name, Role or Age"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-warm-gray hover:text-charcoal rounded-xl hover:bg-beige/50 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-beige/60 bg-white flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('persona')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'persona'
                ? 'border-sage-dark text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <UserRound className="h-3.5 w-3.5 text-sage-dark" />
            Persona & Psychological Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-sage-dark text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-sage-dark" />
            Longitudinal Notes
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-beige/60 text-charcoal">
              {notes.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'actions'
                ? 'border-sage-dark text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <ListTodo className="h-3.5 w-3.5 text-sage-dark" />
            What is Required
            {openActionsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                {openActionsCount} open
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-beige/60 text-charcoal">
                {actions.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'study'
                ? 'border-sage-dark text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
            Observational Study
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-sage-dark text-charcoal'
                : 'border-transparent text-warm-gray hover:text-charcoal'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-sage-dark" />
            Session Attendance ({attendedSessions.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ==================================================== */}
          {/* TAB 1: PERSONA & PSYCHOLOGICAL PROFILE               */}
          {/* ==================================================== */}
          {activeTab === 'persona' && (
            <div className="space-y-6">
              {personaSavedToast && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Persona profile saved successfully.</span>
                </div>
              )}
              {personaError && (
                <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{personaError}</span>
                </div>
              )}

              {/* 1. Mai's Clinical Persona Summary */}
              <div className="bg-[#faf8f4] border border-beige/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <UserRound className="w-3.5 h-3.5 text-sage-dark" />
                    Mai's Psychological & Behavioral Persona Summary
                  </label>
                  <span className="text-[11px] text-warm-gray">Comprehensive portrait of this family member</span>
                </div>
                <textarea
                  value={personaDraft.persona_summary}
                  onChange={(e) => setPersonaDraft((d) => ({ ...d, persona_summary: e.target.value }))}
                  placeholder="Describe this member's core temperament, emotional regulation archetype, how they behave during stress, their interaction with the family..."
                  rows={4}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark leading-relaxed"
                />
              </div>

              {/* 2. Concern Level & Role in Family Dynamics */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[#faf8f4] border border-beige/80 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-700" />
                    Concern / Friction Level
                  </label>
                  <input
                    type="text"
                    value={personaDraft.concern_level}
                    onChange={(e) => setPersonaDraft((d) => ({ ...d, concern_level: e.target.value }))}
                    placeholder="e.g. Primary concern, Source of friction, Anchor"
                    className="w-full text-xs p-2.5 rounded-xl bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {CONCERN_LEVEL_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPersonaDraft((d) => ({ ...d, concern_level: suggestion }))}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-beige hover:border-sage text-charcoal/70"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#faf8f4] border border-beige/80 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-sage-dark" />
                    Role in Family Dynamic
                  </label>
                  <input
                    type="text"
                    value={personaDraft.family_dynamic_role}
                    onChange={(e) => setPersonaDraft((d) => ({ ...d, family_dynamic_role: e.target.value }))}
                    placeholder="e.g. Primary focus, Co-regulator, Anxious observer"
                    className="w-full text-xs p-2.5 rounded-xl bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {DYNAMIC_ROLE_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPersonaDraft((d) => ({ ...d, family_dynamic_role: suggestion }))}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-beige hover:border-sage text-charcoal/70"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Temperament Traits, Triggers & Strengths */}
              <div className="space-y-4">
                {/* Traits */}
                <div className="bg-white border border-beige/80 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                      Temperament & Personality Traits
                    </h4>
                    <span className="text-[11px] text-warm-gray">Behavioral tendencies</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {personaDraft.temperament_traits.length === 0 ? (
                      <p className="text-xs text-warm-gray italic">No traits tagged yet.</p>
                    ) : (
                      personaDraft.temperament_traits.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-sage/15 text-sage-dark border border-sage/30 font-medium"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTrait(t)}
                            className="hover:text-rose-600 ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddTrait} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newTraitInput}
                      onChange={(e) => setNewTraitInput(e.target.value)}
                      placeholder="+ Add trait (e.g. sensory-sensitive, perfectionist)..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-ivory border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                    />
                    <button
                      type="submit"
                      disabled={!newTraitInput.trim()}
                      className="px-3 py-1 text-xs font-medium bg-charcoal text-white rounded-lg hover:bg-charcoal/90 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Triggers */}
                <div className="bg-white border border-rose-200/80 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      Known Triggers & Friction Points
                    </h4>
                    <span className="text-[11px] text-rose-700/80">Sensitivities causing dysregulation</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {personaDraft.known_triggers.length === 0 ? (
                      <p className="text-xs text-warm-gray italic">No triggers recorded yet.</p>
                    ) : (
                      personaDraft.known_triggers.map((trig) => (
                        <span
                          key={trig}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-rose-50 text-rose-800 border border-rose-200 font-medium"
                        >
                          {trig}
                          <button
                            type="button"
                            onClick={() => handleRemoveTrigger(trig)}
                            className="hover:text-rose-950 ml-0.5 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddTrigger} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newTriggerInput}
                      onChange={(e) => setNewTriggerInput(e.target.value)}
                      placeholder="+ Add trigger (e.g. bedtime transitions, loud noises)..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-rose-50/40 border border-rose-200 focus:outline-hidden focus:border-rose-400"
                    />
                    <button
                      type="submit"
                      disabled={!newTriggerInput.trim()}
                      className="px-3 py-1 text-xs font-medium bg-rose-700 text-white rounded-lg hover:bg-rose-800 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Strengths */}
                <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-emerald-600" />
                      Strengths & Calming Anchors
                    </h4>
                    <span className="text-[11px] text-emerald-700/80">Resources, affinities & co-regulation hooks</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {personaDraft.strengths.length === 0 ? (
                      <p className="text-xs text-warm-gray italic">No strengths recorded yet.</p>
                    ) : (
                      personaDraft.strengths.map((str) => (
                        <span
                          key={str}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                        >
                          {str}
                          <button
                            type="button"
                            onClick={() => handleRemoveStrength(str)}
                            className="hover:text-emerald-950 ml-0.5 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddStrength} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newStrengthInput}
                      onChange={(e) => setNewStrengthInput(e.target.value)}
                      placeholder="+ Add strength (e.g. drawing, deep empathy, 1-on-1 time)..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50/40 border border-emerald-200 focus:outline-hidden focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      disabled={!newStrengthInput.trim()}
                      className="px-3 py-1 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* Save Persona Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePersona}
                  disabled={savingPersona}
                  className="inline-flex items-center gap-2 rounded-xl bg-sage-dark px-5 py-2.5 text-xs font-semibold text-white hover:bg-sage-dark/90 shadow-2xs disabled:opacity-50 transition"
                >
                  {savingPersona ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Persona Profile
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: LONGITUDINAL NOTES (member_notes)              */}
          {/* ==================================================== */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {notesError && (
                <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  {notesError}
                </div>
              )}

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="bg-[#faf8f4] border border-beige/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-sage-dark" />
                    Record Longitudinal Observation
                  </h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={newNoteType}
                      onChange={(e) => setNewNoteType(e.target.value as MemberNoteType)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-beige bg-white font-medium"
                    >
                      <option value="observation">Observation</option>
                      <option value="concern">Concern / Friction</option>
                      <option value="progress">Progress / Breakthrough</option>
                      <option value="follow_up">Follow-up Needed</option>
                    </select>

                    <select
                      value={newNoteSessionId}
                      onChange={(e) => setNewNoteSessionId(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-beige bg-white"
                    >
                      <option value="">General (No Session)</option>
                      {allHouseholdSessions.map((s, idx) => (
                        <option key={s.id} value={s.id}>
                          Session #{allHouseholdSessions.length - idx} ({new Date(s.session_date).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  placeholder="Document specific behavioral evolution, observed changes, how this member responded during or between sessions..."
                  rows={3}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark leading-relaxed"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !newNoteBody.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-charcoal/90 disabled:opacity-40 transition"
                  >
                    {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add Member Note
                  </button>
                </div>
              </form>

              {/* Notes Timeline List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                  Chronological Timeline ({notes.length})
                </h4>

                {notes.length === 0 ? (
                  <div className="p-8 text-center bg-[#faf8f4] border border-dashed border-beige rounded-2xl">
                    <FileText className="w-8 h-8 text-warm-gray/40 mx-auto mb-2" />
                    <p className="text-xs text-warm-gray">No clinical notes recorded for this member yet.</p>
                  </div>
                ) : (
                  notes.map((note) => {
                    const badgeStyles: Record<MemberNoteType, { bg: string; text: string; label: string }> = {
                      observation: { bg: 'bg-sage/15 border-sage/30', text: 'text-sage-dark', label: 'Observation' },
                      concern: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800', label: 'Concern / Friction' },
                      progress: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Progress' },
                      follow_up: { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-800', label: 'Follow-up' },
                    };
                    const badge = badgeStyles[note.note_type] || badgeStyles.observation;

                    return (
                      <div
                        key={note.id}
                        className="group bg-white border border-beige/80 rounded-2xl p-4 space-y-2 shadow-2xs hover:border-sage transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-[11px] text-warm-gray font-mono">
                              {new Date(note.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-warm-gray hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-charcoal/90 leading-relaxed whitespace-pre-wrap">
                          {note.body}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: WHAT IS REQUIRED (member_action_items)        */}
          {/* ==================================================== */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              {actionsError && (
                <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  {actionsError}
                </div>
              )}

              {/* Add Action Item Form */}
              <form onSubmit={handleAddAction} className="bg-[#faf8f4] border border-beige/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-sage-dark" />
                    Assign Requirement / Task to {member.full_name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={newActionPriority}
                      onChange={(e) => setNewActionPriority(e.target.value as MemberActionPriority)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-beige bg-white font-medium"
                    >
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <input
                      type="date"
                      value={newActionDueDate}
                      onChange={(e) => setNewActionDueDate(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-beige bg-white"
                      title="Due date"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={newActionTask}
                  onChange={(e) => setNewActionTask(e.target.value)}
                  placeholder="What is expected from this member? (e.g. Practice the 3-second somatic pause, handle bedtime on Thursdays...)"
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl bg-white border border-beige/80 focus:outline-hidden focus:border-sage-dark"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingAction || !newActionTask.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-charcoal/90 disabled:opacity-40 transition"
                  >
                    {addingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Assign Requirement
                  </button>
                </div>
              </form>

              {/* Action Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                  Requirements & Commitments Checklist ({actions.length})
                </h4>

                {actions.length === 0 ? (
                  <div className="p-8 text-center bg-[#faf8f4] border border-dashed border-beige rounded-2xl">
                    <CheckSquare className="w-8 h-8 text-warm-gray/40 mx-auto mb-2" />
                    <p className="text-xs text-warm-gray">No requirements assigned to this member yet.</p>
                  </div>
                ) : (
                  actions.map((item) => {
                    const isDone = item.status === 'done';
                    const isAi = item.source === 'ai';

                    return (
                      <div
                        key={item.id}
                        className={`group bg-white border rounded-2xl p-3.5 flex items-start gap-3 transition ${
                          isDone ? 'border-beige/50 bg-[#faf8f4]/60 opacity-75' : 'border-beige/80 shadow-2xs hover:border-sage'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleActionStatus(item)}
                          className="mt-0.5 text-sage-dark shrink-0 focus:outline-hidden"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-4 h-4 text-charcoal/35 hover:text-sage-dark" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs sm:text-sm font-medium ${
                              isDone ? 'line-through text-charcoal/50' : 'text-charcoal'
                            }`}
                          >
                            {item.task}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            {item.priority === 'high' && (
                              <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                                High Priority
                              </span>
                            )}
                            {isAi && (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-sage/15 text-sage-dark">
                                AI Suggested
                              </span>
                            )}
                            {item.due_date && (
                              <span className="text-[10px] text-warm-gray font-mono">
                                Due: {item.due_date}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAction(item.id)}
                          className="text-warm-gray hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-1"
                          title="Delete requirement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: OBSERVATIONAL STUDY (AI)                      */}
          {/* ==================================================== */}
          {activeTab === 'study' && (
            <div className="space-y-6">
              {/* Study Control Banner */}
              <div className="rounded-2xl border border-beige bg-[#faf8f4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sage-dark" />
                    <h4 className="text-sm font-serif font-bold text-charcoal">
                      Longitudinal Observational Study
                    </h4>
                  </div>
                  <p className="text-xs text-warm-gray mt-0.5">
                    Analyzes session recordings & notes across all {attendedSessions.length} sessions attended by{' '}
                    {member.full_name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunStudy}
                  disabled={runningStudy || attendedSessions.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-charcoal/90 disabled:opacity-50 transition shadow-2xs shrink-0"
                >
                  {runningStudy ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing Sessions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {studyResult ? 'Re-run Study' : 'Generate Study'}
                    </>
                  )}
                </button>
              </div>

              {studyError && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <p>{studyError}</p>
                </div>
              )}

              {/* Study Body */}
              {studyResult ? (
                <div className="rounded-2xl border border-beige bg-white p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-beige/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono font-medium text-sage-dark bg-sage/15 px-2 py-0.5 rounded">
                        {studyResult.sessionsAnalyzed} Sessions Analyzed
                      </span>
                      {studyResult.timestamp && (
                        <span className="text-[11px] text-warm-gray font-mono">
                          {new Date(studyResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyStudy}
                      className="inline-flex items-center gap-1.5 text-xs text-warm-gray hover:text-charcoal px-2.5 py-1 rounded-lg border border-beige hover:border-sage"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="prose prose-xs max-w-none text-xs sm:text-sm text-charcoal/85 leading-relaxed whitespace-pre-wrap font-sans">
                    {studyResult.text}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-beige p-8 text-center bg-[#faf8f4]">
                  <Sparkles className="h-8 w-8 text-warm-gray/40 mx-auto mb-2" />
                  <p className="text-xs text-warm-gray font-medium">No study generated for this member yet.</p>
                  <p className="text-[11px] text-warm-gray/70 mt-1">
                    Click &ldquo;Generate Study&rdquo; above to extract longitudinal patterns from attended sessions.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: SESSION ATTENDANCE                            */}
          {/* ==================================================== */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                    Session Attendance History
                  </h4>
                  <p className="text-xs text-warm-gray">
                    Toggle which family sessions {member.full_name} participated in.
                  </p>
                </div>
                {allHouseholdSessions.length > 0 && (
                  <span className="text-xs font-medium text-warm-gray bg-cream px-2.5 py-1 rounded-lg border border-beige">
                    {attendanceRate}% Attendance Rate
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {allHouseholdSessions.map((session, index) => {
                  const isAttending = attendedSessionIds.includes(session.id);
                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                        isAttending ? 'bg-white border-sage/60 shadow-2xs' : 'bg-[#faf8f4] border-beige/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isAttending}
                          onChange={() => handleToggleAttendance(session.id)}
                          className="h-4 w-4 rounded text-sage-dark focus:ring-sage border-beige cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-semibold text-charcoal">
                            Session #{allHouseholdSessions.length - index} ·{' '}
                            {new Date(session.session_date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <span className="text-[10px] text-warm-gray uppercase font-mono">
                            Status: {session.status}
                          </span>
                        </div>
                      </div>
                      <Link
                        to={`/admin/sessions?client=${household.primary_contact_profile_id}&session=${session.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-dark hover:underline"
                      >
                        <span>Workspace</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
