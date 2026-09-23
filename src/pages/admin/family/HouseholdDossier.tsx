import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
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
  Sparkles,
  UserRound,
  Phone,
  Mail,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminLayout from '../AdminLayout';
import { Panel, EmptyPanel, InsightChip } from '../components/AdminUI';
import { ClientDossierModal } from '../components/ClientDossierModal';
import { MemberStudyModal } from './MemberStudyModal';
import type { CustomerJourneyState } from '../../../types';
import {
  currentAge,
  roleLabel,
  type CaseSession,
  type Household,
  type HouseholdMember,
  type HouseholdMemberRole,
  type MemberStudyResult,
} from '../../../types/family';

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
  const [journeyClient, setJourneyClient] = useState<CustomerJourneyState | null>(null);
  const [showDossierModal, setShowDossierModal] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingCase, setEditingCase] = useState(false);
  const [caseDraft, setCaseDraft] = useState({ presenting_issue: '', working_plan: '', next_step: '' });

  const [addingMember, setAddingMember] = useState(false);
  const [memberDraft, setMemberDraft] = useState({ full_name: '', role: 'child' as HouseholdMemberRole, birth_year: '', notes: '' });

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberEditDraft, setMemberEditDraft] = useState({ full_name: '', role: 'child' as HouseholdMemberRole, birth_year: '', notes: '' });
  const [savingMemberEdit, setSavingMemberEdit] = useState(false);
  const [studyCache, setStudyCache] = useState<Record<string, MemberStudyResult>>({});

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
          supabase
            .from('case_sessions')
            .select('*, session_content(id, content_type, content), session_attendees(household_member_id)')
            .eq('household_id', householdId)
            .order('session_date', { ascending: false }),
          supabase.from('profiles').select('id, full_name, email, phone').eq('id', h.primary_contact_profile_id).maybeSingle(),
          supabase
            .from('bookings')
            .select('id, appointment_date, appointment_time, status, child_name')
            .eq('user_id', h.primary_contact_profile_id)
            .order('appointment_date', { ascending: false }),
          supabase
            .from('customer_journey_state')
            .select('*')
            .eq('client_id', h.primary_contact_profile_id)
            .maybeSingle(),
        ]);
      if (mErr) throw mErr;
      if (sErr) throw sErr;
      setMembers(m ?? []);
      setSessions(s ?? []);
      setClientProfile(profile ?? null);
      setClientBookings(bookings ?? []);
      if (journeyRow) {
        setJourneyClient(journeyRow as CustomerJourneyState);
        setJourney({
          upcoming_sessions_count: journeyRow.upcoming_sessions_count ?? 0,
          completed_paid_sessions_count: journeyRow.completed_paid_sessions_count ?? 0,
          days_since_last_engagement: journeyRow.days_since_last_engagement ?? 0,
        });
      } else {
        setJourneyClient(null);
        setJourney(null);
      }

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

  const handleSaveMemberEdit = async (id: string): Promise<void> => {
    if (!memberEditDraft.full_name.trim()) return;
    setSavingMemberEdit(true);
    try {
      const updatedPayload = {
        full_name: memberEditDraft.full_name.trim(),
        role: memberEditDraft.role,
        birth_year: memberEditDraft.birth_year ? Number(memberEditDraft.birth_year) : null,
        notes: memberEditDraft.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error: updateErr } = await supabase
        .from('household_members')
        .update(updatedPayload)
        .eq('id', id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      setMembers((prev) => prev.map((m) => (m.id === id ? data : m)));
      setEditingMemberId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update member.');
    } finally {
      setSavingMemberEdit(false);
    }
  };

  const handleDeleteMember = async (id: string): Promise<void> => {
    const { error: delErr } = await supabase.from('household_members').delete().eq('id', id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    if (selectedMemberId === id) {
      setSelectedMemberId(null);
    }
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
    navigate(`/admin/sessions?client=${household.primary_contact_profile_id}&session=${data.id}`);
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
    navigate(`/admin/sessions?client=${household.primary_contact_profile_id}&session=${data.id}`);
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

  const selectedMember = useMemo(() => {
    return members.find((m) => m.id === selectedMemberId) ?? null;
  }, [members, selectedMemberId]);

  const clientForDossier: CustomerJourneyState | null = useMemo(() => {
    if (journeyClient) return journeyClient;
    if (!household?.primary_contact_profile_id) return null;
    return {
      client_id: household.primary_contact_profile_id,
      parent_name: clientProfile?.full_name || 'Client',
      email: clientProfile?.email || '',
      phone: clientProfile?.phone || null,
      country: null,
      role: 'student',
      client_created_at: new Date().toISOString(),
      engagement_status: 'active',
      engagement_cadence_days: 14,
      current_track: 'track_a',
      completed_paid_sessions_count: journey?.completed_paid_sessions_count ?? 0,
      completed_free_sessions_count: 0,
      upcoming_sessions_count: journey?.upcoming_sessions_count ?? 0,
      cancelled_sessions_count: 0,
      first_completed_paid_session_at: null,
      last_completed_paid_session_at: null,
      next_upcoming_session_at: null,
      last_engagement_at: new Date().toISOString(),
      days_since_last_engagement: journey?.days_since_last_engagement ?? 0,
      days_since_last_session: null,
      lifecycle_stage: 'track_a_active',
      next_step_recommendation: '',
    };
  }, [journeyClient, household?.primary_contact_profile_id, clientProfile, journey]);


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
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateBlankSession}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-1.5 text-xs font-medium text-white hover:bg-sage-dark transition shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" /> New Session
          </button>
          <Link
            to={`/admin/sessions?client=${household.primary_contact_profile_id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal hover:border-sage hover:bg-beige/20 transition shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-sage-dark" /> Session Notes
          </Link>
          <button
            type="button"
            onClick={() => setShowDossierModal(true)}
            disabled={!clientForDossier}
            className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white px-3.5 py-1.5 text-xs font-medium text-charcoal hover:border-sage hover:bg-beige/20 transition shadow-2xs disabled:opacity-50"
          >
            <Compass className="h-3.5 w-3.5 text-sage-dark" /> CRM Dossier
          </button>
        </div>
      }
      headerContent={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
          {/* Quick Metrics */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {journey ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-beige/70 bg-[#faf8f4] px-2.5 py-1 text-xs">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Paid Sessions</span>
                  <span className="font-semibold text-charcoal">{journey.completed_paid_sessions_count}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-beige/70 bg-[#faf8f4] px-2.5 py-1 text-xs">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Upcoming</span>
                  <span className="font-semibold text-charcoal">{journey.upcoming_sessions_count}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-beige/70 bg-[#faf8f4] px-2.5 py-1 text-xs">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">Last Touch</span>
                  <span className="font-semibold text-charcoal">{journey.days_since_last_engagement}d ago</span>
                </div>
              </>
            ) : null}
          </div>

          {/* All Bookings Promoted to Top */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray shrink-0">
              All bookings ({clientBookings.length}):
            </span>
            {clientBookings.length === 0 ? (
              <span className="text-xs text-warm-gray italic">No bookings on record</span>
            ) : (
              <div className="flex items-center gap-1.5">
                {clientBookings.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cream/80 border border-beige/80 px-2 py-0.5 text-[11px] text-charcoal shrink-0"
                  >
                    <span className="font-medium">{new Date(b.appointment_date).toLocaleDateString()}</span>
                    {b.child_name ? <span className="text-warm-gray">· {b.child_name}</span> : null}
                    <span className="text-[9px] uppercase font-mono font-medium text-sage-dark bg-sage/15 px-1 py-0.2 rounded">
                      {b.status}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : null}

        {unconvertedBookings.length > 0 ? (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-900">
                  {unconvertedBookings.length} Unconverted Booking{unconvertedBookings.length > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-amber-800/85">
                  These calendar bookings do not have linked case session records yet.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {unconvertedBookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleCreateSessionFromBooking(b)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/60 transition shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-800" />
                  Add Session ({new Date(b.appointment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{b.child_name ? ` · ${b.child_name}` : ''})
                </button>
              ))}
            </div>
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
                sortedMembers.map((m) => {
                  const isMain = Boolean(
                    (clientProfile?.full_name && m.full_name.trim().toLowerCase() === clientProfile.full_name.trim().toLowerCase()) ||
                    (!members.some((mem) => clientProfile?.full_name && mem.full_name.trim().toLowerCase() === clientProfile.full_name.trim().toLowerCase()) && (m.role === 'mother' || m.role === 'guardian'))
                  );
                  const isEditing = editingMemberId === m.id;

                  if (isEditing) {
                    return (
                      <div key={m.id} className="rounded-xl border border-sage/50 bg-sage/5 p-3 space-y-2">
                        <input
                          type="text"
                          value={memberEditDraft.full_name}
                          onChange={(e) => setMemberEditDraft((d) => ({ ...d, full_name: e.target.value }))}
                          placeholder="Full name"
                          className="w-full rounded-lg border border-beige bg-white px-3 py-1.5 text-xs outline-none focus:border-sage"
                        />
                        <div className="flex gap-2">
                          <select
                            value={memberEditDraft.role}
                            onChange={(e) => setMemberEditDraft((d) => ({ ...d, role: e.target.value as HouseholdMemberRole }))}
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
                            value={memberEditDraft.birth_year}
                            onChange={(e) => setMemberEditDraft((d) => ({ ...d, birth_year: e.target.value }))}
                            placeholder="Birth year"
                            className="w-28 rounded-lg border border-beige bg-white px-2 py-1.5 text-xs outline-none focus:border-sage"
                          />
                        </div>
                        <textarea
                          value={memberEditDraft.notes}
                          onChange={(e) => setMemberEditDraft((d) => ({ ...d, notes: e.target.value }))}
                          placeholder="Notes (optional)"
                          rows={2}
                          className="w-full rounded-lg border border-beige bg-white px-3 py-1.5 text-xs outline-none focus:border-sage resize-none"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingMemberId(null)}
                            className="rounded-lg px-2.5 py-1 text-xs text-warm-gray hover:text-charcoal"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMemberEdit(m.id)}
                            disabled={savingMemberEdit || !memberEditDraft.full_name.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-sage px-3 py-1 text-xs font-medium text-white hover:bg-sage-dark disabled:opacity-50"
                          >
                            {savingMemberEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMemberId(m.id)}
                      title="Click to view member clinical study & attendance history"
                      className="group flex items-center justify-between rounded-xl border border-beige/70 bg-[#faf8f4] hover:bg-cream/40 hover:border-sage/50 px-3.5 py-2.5 transition cursor-pointer"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-charcoal group-hover:text-sage-dark transition truncate">
                            {m.full_name}
                          </p>
                          {isMain ? (
                            <span className="inline-flex items-center rounded-md bg-sage/20 border border-sage/40 px-1.5 py-0.2 text-[10px] font-semibold text-sage-dark shrink-0">
                              [Main]
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-sage-dark/70 font-medium bg-sage/10 px-1.5 py-0.2 rounded group-hover:text-sage-dark shrink-0">
                            <Sparkles className="h-2.5 w-2.5" /> Study
                          </span>
                        </div>
                        <p className="text-[11px] text-warm-gray">
                          {roleLabel(m.role)}
                          {m.birth_year ? ` · Age ${currentAge(m.birth_year)}` : ''}
                        </p>
                        {m.notes ? <p className="mt-1 text-[11px] text-warm-gray/80 leading-relaxed line-clamp-2">{m.notes}</p> : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMemberId(m.id);
                            setMemberEditDraft({
                              full_name: m.full_name,
                              role: m.role,
                              birth_year: m.birth_year ? String(m.birth_year) : '',
                              notes: m.notes || '',
                            });
                          }}
                          className="p-1.5 text-warm-gray hover:text-charcoal rounded-lg hover:bg-beige/40 transition"
                          title="Edit member"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMember(m.id);
                          }}
                          className="p-1.5 text-warm-gray hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Delete member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="pl-1 text-warm-gray/50 group-hover:text-sage-dark group-hover:translate-x-0.5 transition">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })
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

        {/* Case Sessions & Clinical History Panel */}
        <Panel
          title="Case Sessions & Clinical History"
          eyebrow={`${sessions.length} session${sessions.length !== 1 ? 's' : ''} on record`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateBlankSession}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-dark transition shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5" /> New Session
              </button>
              <Link
                to={`/admin/sessions?client=${household.primary_contact_profile_id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:border-sage hover:bg-beige/20 transition shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-sage-dark" /> Session Workspace
              </Link>
            </div>
          }
        >
          {sessions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-beige/80 bg-[#faf8f4] text-xs text-warm-gray">
              No clinical sessions logged for this household yet. Click &quot;+ New Session&quot; to log a consultation or convert an intake booking.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const postNotes = sess.session_content?.find((c) => c.content_type === 'post_session_notes');
                const handNotes = sess.session_content?.find((c) => c.content_type === 'handwritten_notes');
                const attendeeIds = (sess.session_attendees ?? []).map((a) => a.household_member_id);
                const attendingMembers = members.filter((m) => attendeeIds.includes(m.id));

                return (
                  <div
                    key={sess.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-beige/70 bg-[#faf8f4] hover:bg-cream/30 hover:border-sage/50 p-4 transition shadow-2xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="h-4 w-4 text-sage-dark shrink-0" />
                        <span className="font-semibold text-sm text-charcoal">
                          {new Date(sess.session_date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                            sess.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : sess.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {sess.status}
                        </span>
                        {sess.duration_minutes ? (
                          <span className="text-xs text-warm-gray">
                            · {sess.duration_minutes}m
                          </span>
                        ) : null}
                      </div>

                      {/* Content tags & attendees */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-warm-gray">
                        {attendingMembers.length > 0 ? (
                          <span className="text-[11px] text-warm-gray">
                            Attendees: <strong className="font-medium text-charcoal">{attendingMembers.map((m) => m.full_name).join(', ')}</strong>
                          </span>
                        ) : null}

                        {postNotes?.content ? (
                          <span className="inline-flex items-center rounded-md bg-sage/15 border border-sage/30 px-1.5 py-0.2 text-[10px] font-semibold text-sage-dark">
                            Post-Session Write-up
                          </span>
                        ) : null}
                        {handNotes?.content ? (
                          <span className="inline-flex items-center rounded-md bg-amber-100/70 border border-amber-300 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                            Handwritten Notes
                          </span>
                        ) : null}
                      </div>

                      {/* Brief snippet */}
                      {postNotes?.content ? (
                        <p className="text-xs text-charcoal/80 line-clamp-1 italic">
                          {postNotes.content.replace(/^#+.*$/gm, '').trim()}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/admin/sessions?client=${household.primary_contact_profile_id}&session=${sess.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white hover:border-sage hover:bg-beige/20 px-3 py-1.5 text-xs font-semibold text-charcoal hover:text-sage-dark transition shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5 text-sage-dark" />
                        <span>Open Notes</span>
                        <ExternalLink className="h-3 w-3 text-warm-gray" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Per-Member Longitudinal Study Modal */}
      {selectedMemberId && selectedMember ? (
        <MemberStudyModal
          member={selectedMember}
          household={household}
          allHouseholdSessions={sessions}
          cachedStudy={studyCache[selectedMember.id]}
          onClose={() => setSelectedMemberId(null)}
          onMemberUpdated={(updated) => {
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          }}
          onStudyGenerated={(study) => {
            setStudyCache((prev) => ({ ...prev, [selectedMember.id]: study }));
          }}
          onAttendanceChanged={load}
        />
      ) : null}

      {/* Floating CRM Dossier Modal */}
      {showDossierModal && clientForDossier ? (
        <ClientDossierModal
          client={clientForDossier}
          onClose={() => setShowDossierModal(false)}
          onClientUpdated={(updated) => {
            setJourneyClient((prev) => (prev ? { ...prev, ...updated } : null));
          }}
        />
      ) : null}
    </AdminLayout>
  );
};

export default HouseholdDossier;
