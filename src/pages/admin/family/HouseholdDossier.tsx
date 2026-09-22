import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  Compass,
  UserRound,
  Phone,
  Mail,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../AdminLayout';
import { Panel, EmptyPanel, InsightChip } from '../components/AdminUI';
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

type ClientProfile = { id: string; full_name: string | null; email: string | null; phone: string | null };
type BookingRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  child_name: string | null;
};

export const HouseholdDossier = (): JSX.Element => {
  const { householdId } = useParams<{ householdId: string }>();
  const navigate = useNavigate();

  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [sessions, setSessions] = useState<CaseSession[]>([]);
  const [attendeesBySession, setAttendeesBySession] = useState<Record<string, string[]>>({});
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientBookings, setClientBookings] = useState<BookingRow[]>([]);
  const [journey, setJourney] = useState<{ upcoming_sessions_count: number; completed_paid_sessions_count: number; days_since_last_engagement: number } | null>(null);
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
      const { data: h, error: hErr } = await supabase.from('households').select('*').eq('id', householdId).single();
      if (hErr) throw hErr;
      setHousehold(h);
      setCaseDraft({
        presenting_issue: h.presenting_issue ?? '',
        working_plan: h.working_plan ?? '',
        next_step: h.next_step ?? '',
      });

      const [{ data: m, error: mErr }, { data: s, error: sErr }, { data: profile }, { data: bookings }, { data: journeyRow }] =
        await Promise.all([
          supabase.from('household_members').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
          supabase.from('case_sessions').select('*').eq('household_id', householdId).order('session_date', { ascending: false }),
          supabase.from('profiles').select('id, full_name, email, phone').eq('id', h.primary_contact_profile_id).maybeSingle(),
          supabase
            .from('bookings')
            .select('id, appointment_date, appointment_time, status, child_name')
            .eq('user_id', h.primary_contact_profile_id)
            .order('appointment_date', { ascending: false }),
          supabase
            .from('customer_journey_state')
            .select('upcoming_sessions_count, completed_paid_sessions_count, days_since_last_engagement')
            .eq('client_id', h.primary_contact_profile_id)
            .maybeSingle(),
        ]);
      if (mErr) throw mErr;
      if (sErr) throw sErr;
      setMembers(m ?? []);
      setSessions(s ?? []);
      setClientProfile(profile ?? null);
      setClientBookings(bookings ?? []);
      setJourney(journeyRow ?? null);

      const sessionIds = (s ?? []).map((row) => row.id);
      if (sessionIds.length > 0) {
        const { data: attendeeRows } = await supabase
          .from('session_attendees')
          .select('session_id, household_member_id')
          .in('session_id', sessionIds);
        const map: Record<string, string[]> = {};
        for (const row of attendeeRows ?? []) {
          map[row.session_id] = [...(map[row.session_id] ?? []), row.household_member_id];
        }
        setAttendeesBySession(map);
      } else {
        setAttendeesBySession({});
      }
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

  // Bookings for this client that haven't been turned into a case session yet -- the primary,
  // real-data way to add a session. A blank/manual session stays available as a fallback.
  const unconvertedBookings = useMemo(() => {
    const usedBookingIds = new Set(sessions.map((s) => s.booking_id).filter(Boolean));
    return clientBookings.filter((b) => !usedBookingIds.has(b.id));
  }, [sessions, clientBookings]);

  const handleCreateSessionFromBooking = async (booking: BookingRow): Promise<void> => {
    if (!household) return;
    const { data, error: insertErr } = await supabase
      .from('case_sessions')
      .insert({
        household_id: household.id,
        booking_id: booking.id,
        session_date: new Date(`${booking.appointment_date}T00:00:00`).toISOString(),
        status: booking.status === 'completed' ? 'completed' : 'scheduled',
      })
      .select()
      .single();
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    navigate(`/admin/families/${household.id}/sessions/${data.id}`);
  };

  const handleCreateBlankSession = async (): Promise<void> => {
    if (!household) return;
    const { data, error: insertErr } = await supabase
      .from('case_sessions')
      .insert({ household_id: household.id, session_date: new Date().toISOString(), status: 'scheduled' })
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

  const toggleAttendee = async (sessionId: string, memberId: string): Promise<void> => {
    const current = attendeesBySession[sessionId] ?? [];
    const attending = current.includes(memberId);
    if (attending) {
      await supabase.from('session_attendees').delete().eq('session_id', sessionId).eq('household_member_id', memberId);
      setAttendeesBySession((prev) => ({ ...prev, [sessionId]: (prev[sessionId] ?? []).filter((id) => id !== memberId) }));
    } else {
      await supabase.from('session_attendees').insert({ session_id: sessionId, household_member_id: memberId });
      setAttendeesBySession((prev) => ({ ...prev, [sessionId]: [...(prev[sessionId] ?? []), memberId] }));
    }
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
      subtitle="Household members, case overview, and session history — all traced back to the linked client account."
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

        {/* Client Account & Interactions */}
        <Panel
          title={clientProfile?.full_name || 'Linked Client'}
          eyebrow="Client account this case is a spinoff of"
          action={
            <Link
              to={`/admin/crm?client=${household.primary_contact_profile_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-beige px-3 py-1.5 text-xs font-medium text-charcoal hover:border-sage"
            >
              <Compass className="h-3.5 w-3.5 text-sage-dark" /> CRM Dossier
            </Link>
          }
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 text-xs text-warm-gray">
              {clientProfile?.email ? (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-sage-dark" /> {clientProfile.email}
                </p>
              ) : null}
              {clientProfile?.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-sage-dark" /> {clientProfile.phone}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {journey ? (
                  <>
                    <InsightChip label="Paid Sessions" value={String(journey.completed_paid_sessions_count)} />
                    <InsightChip label="Upcoming" value={String(journey.upcoming_sessions_count)} />
                    <InsightChip label="Last Touch" value={`${journey.days_since_last_engagement}d ago`} />
                  </>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray mb-1.5">
                All bookings ({clientBookings.length})
              </p>
              {clientBookings.length === 0 ? (
                <p className="text-xs text-warm-gray italic">No bookings on record for this client.</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {clientBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs text-charcoal">
                      <span>
                        {new Date(b.appointment_date).toLocaleDateString()} {b.child_name ? `· ${b.child_name}` : ''}
                      </span>
                      <span className="text-[10px] uppercase text-warm-gray">{b.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

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
          eyebrow="Chronological history — with real attendee connections"
          action={
            <div className="flex items-center gap-2">
              {unconvertedBookings.length > 0 ? (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                  {unconvertedBookings.length} booking{unconvertedBookings.length > 1 ? 's' : ''} not yet added as sessions
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleCreateBlankSession}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-2 text-xs font-medium text-white hover:bg-sage-dark"
              >
                <Plus className="h-3.5 w-3.5" /> Blank Session
              </button>
            </div>
          }
        >
          {unconvertedBookings.length > 0 ? (
            <div className="mb-4 space-y-1.5">
              {unconvertedBookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleCreateSessionFromBooking(b)}
                  className="w-full flex items-center justify-between rounded-xl border border-dashed border-sage/40 bg-sage/5 px-3.5 py-2.5 text-left hover:bg-sage/10"
                >
                  <span className="text-xs text-charcoal">
                    <Calendar className="inline h-3.5 w-3.5 text-sage-dark mr-1.5" />
                    Add session from booking on {new Date(b.appointment_date).toLocaleDateString()}
                    {b.child_name ? ` (${b.child_name})` : ''}
                  </span>
                  <Plus className="h-3.5 w-3.5 text-sage-dark" />
                </button>
              ))}
            </div>
          ) : null}

          {sessions.length === 0 ? (
            <p className="text-xs text-warm-gray italic">No sessions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const attendingIds = attendeesBySession[s.id] ?? [];
                return (
                  <div key={s.id} className="rounded-xl border border-beige/70 bg-[#faf8f4] px-3.5 py-2.5 space-y-2">
                    <div className="flex items-center gap-3">
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
                    {members.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pl-7">
                        <UserRound className="h-3 w-3 text-warm-gray" />
                        {members.map((m) => {
                          const attending = attendingIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleAttendee(s.id, m.id)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                                attending
                                  ? 'bg-sage text-white border-sage'
                                  : 'bg-white text-warm-gray border-beige hover:border-sage/50'
                              }`}
                              title={attending ? `${m.full_name} attended — click to remove` : `${m.full_name} did not attend — click to add`}
                            >
                              {m.full_name}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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
