import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Check,
  X,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../AdminLayout';
import { Panel, EmptyPanel } from '../components/AdminUI';
import {
  currentAge,
  roleLabel,
  type CaseSession,
  type Household,
  type HouseholdMember,
  type HouseholdMemberRole,
} from '../../../types/family';
import { MultiSessionAnalysisPanel } from './MultiSessionAnalysisPanel';

const ROLE_OPTIONS: HouseholdMemberRole[] = ['mother', 'father', 'child', 'guardian', 'other'];

export const HouseholdDossier = (): JSX.Element => {
  const { householdId } = useParams<{ householdId: string }>();
  const navigate = useNavigate();

  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [sessions, setSessions] = useState<CaseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingCase, setEditingCase] = useState(false);
  const [caseDraft, setCaseDraft] = useState({ presenting_issue: '', working_plan: '', next_step: '' });

  const [addingMember, setAddingMember] = useState(false);
  const [memberDraft, setMemberDraft] = useState({ full_name: '', role: 'child' as HouseholdMemberRole, birth_year: '', notes: '' });

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const load = async (): Promise<void> => {
    if (!householdId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: h, error: hErr }, { data: m, error: mErr }, { data: s, error: sErr }] = await Promise.all([
        supabase.from('households').select('*').eq('id', householdId).single(),
        supabase.from('household_members').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
        supabase.from('case_sessions').select('*').eq('household_id', householdId).order('session_date', { ascending: false }),
      ]);
      if (hErr) throw hErr;
      if (mErr) throw mErr;
      if (sErr) throw sErr;
      setHousehold(h);
      setMembers(m ?? []);
      setSessions(s ?? []);
      setCaseDraft({
        presenting_issue: h.presenting_issue ?? '',
        working_plan: h.working_plan ?? '',
        next_step: h.next_step ?? '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load family case.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const handleSaveCase = async (): Promise<void> => {
    if (!household) return;
    const { error: updateErr } = await supabase
      .from('households')
      .update({
        presenting_issue: caseDraft.presenting_issue || null,
        working_plan: caseDraft.working_plan || null,
        next_step: caseDraft.next_step || null,
      })
      .eq('id', household.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setHousehold({ ...household, ...caseDraft });
    setEditingCase(false);
  };

  const handleAddMember = async (): Promise<void> => {
    if (!household || !memberDraft.full_name.trim()) return;
    const { data, error: insertErr } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        full_name: memberDraft.full_name.trim(),
        role: memberDraft.role,
        birth_year: memberDraft.birth_year ? Number(memberDraft.birth_year) : null,
        notes: memberDraft.notes || null,
      })
      .select()
      .single();
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setMembers((prev) => [...prev, data]);
    setAddingMember(false);
    setMemberDraft({ full_name: '', role: 'child', birth_year: '', notes: '' });
  };

  const handleDeleteMember = async (id: string): Promise<void> => {
    const { error: delErr } = await supabase.from('household_members').delete().eq('id', id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCreateSession = async (): Promise<void> => {
    if (!household) return;
    const { data, error: insertErr } = await supabase
      .from('case_sessions')
      .insert({
        household_id: household.id,
        session_date: new Date().toISOString(),
        status: 'scheduled',
      })
      .select()
      .single();
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    navigate(`/admin/families/${household.id}/sessions/${data.id}`);
  };

  const toggleSessionSelection = (id: string): void => {
    setSelectedSessionIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const sortedMembers = useMemo(() => {
    const order: Record<HouseholdMemberRole, number> = { mother: 0, father: 1, guardian: 2, child: 3, other: 4 };
    return [...members].sort((a, b) => order[a.role] - order[b.role]);
  }, [members]);

  if (loading) {
    return (
      <AdminLayout title="Family Case" subtitle="Loading...">
        <div className="flex flex-col items-center justify-center py-16 text-warm-gray">
          <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
        </div>
      </AdminLayout>
    );
  }

  if (!household) {
    return (
      <AdminLayout title="Family Case" subtitle="Not found">
        <EmptyPanel title="Family case not found" description="This household may have been deleted." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={household.family_name}
      subtitle="Household members, case overview, and session history."
      action={
        <button
          type="button"
          onClick={() => navigate('/admin/families')}
          className="inline-flex items-center gap-2 rounded-2xl border border-beige bg-white px-4 py-2.5 text-sm font-medium text-charcoal hover:border-sage transition"
        >
          <ArrowLeft className="h-4 w-4" /> All Families
        </button>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Household Members */}
          <Panel
            title="Household"
            eyebrow="Members"
            className="lg:col-span-1"
            action={
              <button
                type="button"
                onClick={() => setAddingMember(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-beige px-3 py-1.5 text-xs font-medium text-charcoal hover:border-sage"
              >
                <Plus className="h-3.5 w-3.5" /> Add Member
              </button>
            }
          >
            <div className="space-y-2.5">
              {sortedMembers.length === 0 ? (
                <p className="text-xs text-warm-gray italic">No members added yet.</p>
              ) : (
                sortedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-beige/70 bg-[#faf8f4] px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-charcoal">{m.full_name}</p>
                      <p className="text-[11px] text-warm-gray">
                        {roleLabel(m.role)}
                        {m.birth_year ? ` · Age ${currentAge(m.birth_year)}` : ''}
                      </p>
                      {m.notes ? <p className="mt-1 text-[11px] text-warm-gray/80 leading-relaxed">{m.notes}</p> : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id)}
                      className="p-1.5 text-warm-gray hover:text-rose-600 rounded-lg hover:bg-rose-50 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}

              {addingMember ? (
                <div className="rounded-xl border border-sage/40 bg-sage/5 p-3 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Full name"
                    value={memberDraft.full_name}
                    onChange={(e) => setMemberDraft((d) => ({ ...d, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-beige bg-white px-3 py-1.5 text-xs outline-none focus:border-sage"
                  />
                  <div className="flex gap-2">
                    <select
                      value={memberDraft.role}
                      onChange={(e) => setMemberDraft((d) => ({ ...d, role: e.target.value as HouseholdMemberRole }))}
                      className="flex-1 rounded-lg border border-beige bg-white px-2 py-1.5 text-xs outline-none focus:border-sage"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Birth year"
                      value={memberDraft.birth_year}
                      onChange={(e) => setMemberDraft((d) => ({ ...d, birth_year: e.target.value }))}
                      className="w-28 rounded-lg border border-beige bg-white px-2 py-1.5 text-xs outline-none focus:border-sage"
                    />
                  </div>
                  <textarea
                    placeholder="Notes (optional)"
                    value={memberDraft.notes}
                    onChange={(e) => setMemberDraft((d) => ({ ...d, notes: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-beige bg-white px-3 py-1.5 text-xs outline-none focus:border-sage resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingMember(false)}
                      className="rounded-lg px-2.5 py-1 text-xs text-warm-gray hover:text-charcoal"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddMember}
                      disabled={!memberDraft.full_name.trim()}
                      className="rounded-lg bg-sage px-2.5 py-1 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>

          {/* Case Overview */}
          <Panel
            title="Case Overview"
            eyebrow="Clinical picture"
            className="lg:col-span-2"
            action={
              editingCase ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveCase}
                    className="inline-flex items-center gap-1 rounded-xl bg-sage px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-dark"
                  >
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCase(false);
                      setCaseDraft({
                        presenting_issue: household.presenting_issue ?? '',
                        working_plan: household.working_plan ?? '',
                        next_step: household.next_step ?? '',
                      });
                    }}
                    className="p-1.5 text-warm-gray hover:text-charcoal rounded-lg hover:bg-beige/40"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingCase(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-beige px-3 py-1.5 text-xs font-medium text-charcoal hover:border-sage"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )
            }
          >
            <div className="space-y-4">
              {(['presenting_issue', 'working_plan', 'next_step'] as const).map((field) => (
                <div key={field}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray mb-1.5">
                    {field === 'presenting_issue' ? 'Presenting Issue' : field === 'working_plan' ? 'Working Plan' : 'Next Step'}
                  </p>
                  {editingCase ? (
                    <textarea
                      value={caseDraft[field]}
                      onChange={(e) => setCaseDraft((d) => ({ ...d, [field]: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-beige bg-[#faf8f4] px-3.5 py-2.5 text-sm outline-none focus:border-sage focus:bg-white resize-none"
                    />
                  ) : (
                    <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">
                      {household[field] || <span className="italic text-warm-gray">Not recorded yet</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Sessions */}
        <Panel
          title="Sessions"
          eyebrow="Chronological history"
          action={
            <button
              type="button"
              onClick={handleCreateSession}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-2 text-xs font-medium text-white hover:bg-sage-dark"
            >
              <Plus className="h-3.5 w-3.5" /> New Session
            </button>
          }
        >
          {sessions.length === 0 ? (
            <p className="text-xs text-warm-gray italic">No sessions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-beige/70 bg-[#faf8f4] px-3.5 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedSessionIds.includes(s.id)}
                    onChange={() => toggleSessionSelection(s.id)}
                    className="h-4 w-4 rounded border-beige text-sage-dark focus:ring-sage"
                    title="Select for multi-session analysis"
                  />
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/families/${household.id}/sessions/${s.id}`)}
                    className="flex-1 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-sm text-charcoal">
                      <Calendar className="h-3.5 w-3.5 text-sage-dark" />
                      {new Date(s.session_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-warm-gray" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Multi-Session Analysis */}
        <Panel title="Pattern Analysis" eyebrow="AI-assisted">
          <MultiSessionAnalysisPanel
            householdId={household.id}
            allSessions={sessions}
            selectedSessionIds={selectedSessionIds}
            onSelectedSessionIdsChange={setSelectedSessionIds}
          />
        </Panel>
      </div>
    </AdminLayout>
  );
};

export default HouseholdDossier;
