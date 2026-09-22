import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Plus, Loader2, AlertCircle, ChevronRight, Baby, X, Calendar, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { StatCard, EmptyPanel } from './components/AdminUI';
import type { Household, HouseholdMember, HouseholdMemberRole, HouseholdStatus } from '../../types/family';

type HouseholdRow = Household & { household_members: Pick<HouseholdMember, 'id' | 'role'>[]; last_session_date: string | null };
type ClientResult = { id: string; full_name: string | null; email: string | null };
type BookingRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  parent_name: string;
  email: string;
  child_name: string | null;
  child_age: string | null;
  google_meet_url: string | null;
  status: string;
};

const STATUS_TABS: { value: 'all' | HouseholdStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const AdminFamilies = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | HouseholdStatus>('all');

  // Creation wizard state: Step 1 pick the real client account this case is a spinoff of.
  // Step 2 confirm which of that client's real bookings become case sessions.
  const [creating, setCreating] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<ClientResult[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [clientBookings, setClientBookings] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const linkedClientId = searchParams.get('client');
  const linkedName = searchParams.get('name');
  const linkedEmail = searchParams.get('email');

  useEffect(() => {
    if (!clientSearch.trim() || clientSearch.trim().length < 2) {
      setClientResults([]);
      return;
    }
    setSearchingClients(true);
    const timeout = setTimeout(async () => {
      const q = clientSearch.trim();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setClientResults(data ?? []);
      setSearchingClients(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [clientSearch]);

  const fetchHouseholds = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('households')
        .select('*, household_members(id, role)')
        .order('updated_at', { ascending: false });
      if (fetchErr) throw fetchErr;

      const householdIds = (data ?? []).map((h) => h.id);
      let lastSessionByHousehold: Record<string, string> = {};
      if (householdIds.length > 0) {
        const { data: sessions } = await supabase
          .from('case_sessions')
          .select('household_id, session_date')
          .in('household_id', householdIds)
          .order('session_date', { ascending: false });
        for (const s of sessions ?? []) {
          if (!lastSessionByHousehold[s.household_id]) {
            lastSessionByHousehold[s.household_id] = s.session_date;
          }
        }
      }

      setHouseholds(
        (data ?? []).map((h) => ({
          ...h,
          last_session_date: lastSessionByHousehold[h.id] ?? null,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load family cases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHouseholds();
  }, []);

  // Deep-linked from a client record (CRM dossier or Clients & Users) with no matching case yet.
  useEffect(() => {
    if (linkedClientId && !loading) {
      const match = households.find((h) => h.primary_contact_profile_id === linkedClientId);
      if (match) {
        navigate(`/admin/families/${match.id}`, { replace: true });
      } else {
        setCreating(true);
        setSelectedClient({ id: linkedClientId, full_name: linkedName, email: linkedEmail });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedClientId, loading, households]);

  // Once a client is selected, pull their real booking history to seed sessions/members from.
  useEffect(() => {
    if (!selectedClient) {
      setClientBookings([]);
      setSelectedBookingIds([]);
      return;
    }
    setLoadingBookings(true);
    supabase
      .from('bookings')
      .select('id, appointment_date, appointment_time, parent_name, email, child_name, child_age, google_meet_url, status')
      .eq('user_id', selectedClient.id)
      .order('appointment_date', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as BookingRow[];
        setClientBookings(rows);
        setSelectedBookingIds(rows.filter((b) => b.status === 'completed' || b.status === 'confirmed').map((b) => b.id));
        setLoadingBookings(false);
      });
  }, [selectedClient]);

  const stats = useMemo(() => {
    const total = households.length;
    const active = households.filter((h) => h.status === 'active').length;
    const paused = households.filter((h) => h.status === 'paused').length;
    const totalChildren = households.reduce(
      (sum, h) => sum + h.household_members.filter((m) => m.role === 'child').length,
      0
    );
    return { total, active, paused, totalChildren };
  }, [households]);

  const filtered = useMemo(() => {
    return households.filter((h) => {
      if (statusTab !== 'all' && h.status !== statusTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!h.family_name.toLowerCase().includes(q) && !h.presenting_issue?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [households, statusTab, searchQuery]);

  const closeWizard = (): void => {
    setCreating(false);
    setSelectedClient(null);
    setClientSearch('');
    setClientBookings([]);
    setSelectedBookingIds([]);
    setSearchParams({});
  };

  const toggleBooking = (id: string): void => {
    setSelectedBookingIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const handleCreate = async (): Promise<void> => {
    if (!selectedClient) return;
    setSubmitting(true);
    setError(null);
    try {
      const familyName = `${selectedClient.full_name || selectedClient.email || 'New'} Family`;

      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({
          family_name: familyName,
          primary_contact_profile_id: selectedClient.id,
          status: 'active',
        })
        .select()
        .single();
      if (hErr) throw hErr;

      // Seed household members from the real booking data, then link every seeded
      // member to every seeded session so the connections are visible from creation.
      const bookingsToConvert = clientBookings.filter((b) => selectedBookingIds.includes(b.id));
      const memberIds: string[] = [];

      const parentName = bookingsToConvert[0]?.parent_name || selectedClient.full_name;
      if (parentName) {
        const { data: mother } = await supabase
          .from('household_members')
          .insert({ household_id: household.id, full_name: parentName, role: 'mother' as HouseholdMemberRole })
          .select()
          .single();
        if (mother) memberIds.push(mother.id);
      }

      const distinctChildren = new Map<string, string | null>();
      for (const b of bookingsToConvert) {
        if (b.child_name) distinctChildren.set(b.child_name, b.child_age);
      }
      for (const [childName, childAge] of distinctChildren) {
        const birthYear = childAge ? deriveBirthYear(childAge) : null;
        const { data: child } = await supabase
          .from('household_members')
          .insert({ household_id: household.id, full_name: childName, role: 'child' as HouseholdMemberRole, birth_year: birthYear })
          .select()
          .single();
        if (child) memberIds.push(child.id);
      }

      for (const booking of bookingsToConvert) {
        const { data: session } = await supabase
          .from('case_sessions')
          .insert({
            household_id: household.id,
            booking_id: booking.id,
            session_date: new Date(`${booking.appointment_date}T00:00:00`).toISOString(),
            google_meet_url: booking.google_meet_url,
            status: booking.status === 'completed' ? 'completed' : 'scheduled',
          })
          .select()
          .single();
        if (session && memberIds.length > 0) {
          await supabase
            .from('session_attendees')
            .insert(memberIds.map((memberId) => ({ session_id: session.id, household_member_id: memberId })));
        }
      }

      closeWizard();
      navigate(`/admin/families/${household.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create family case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Family Cases"
      subtitle="Every case is a spinoff of a real client account — households, sessions, and members all trace back to Clients & Users."
      action={
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-2.5 text-sm font-medium text-white hover:bg-sage-dark transition shadow-2xs cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Family Case
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total Families" value={stats.total} detail="Households on record" tone="sage" />
          <StatCard icon={Users} label="Active" value={stats.active} detail="Currently in coaching" tone="sky" />
          <StatCard icon={Users} label="Paused" value={stats.paused} detail="Temporarily inactive" tone="amber" />
          <StatCard icon={Baby} label="Children Tracked" value={stats.totalChildren} detail="Across all households" tone="sage" />
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Unable to load family cases</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-beige/80 bg-white p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
              <input
                type="text"
                placeholder="Search by family name or presenting issue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-beige bg-[#faf8f4] pl-10 pr-4 py-2 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#faf8f4] p-1 border border-beige/60 text-xs">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusTab(tab.value)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${
                    statusTab === tab.value ? 'bg-white text-charcoal shadow-2xs font-semibold' : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-warm-gray">
            <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
            <p className="text-sm font-medium">Loading family cases...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyPanel
            title="No family cases yet"
            description="Every case starts from a real client account. Pick one from Clients & Users to spin up their family case."
            action={
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-charcoal text-white px-4 py-2.5 text-xs font-medium hover:bg-black transition"
              >
                <Plus className="h-4 w-4" /> New Family Case
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((h) => {
              const mother = h.household_members.some((m) => m.role === 'mother');
              const father = h.household_members.some((m) => m.role === 'father');
              const childCount = h.household_members.filter((m) => m.role === 'child').length;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => navigate(`/admin/families/${h.id}`)}
                  className="w-full text-left rounded-2xl border border-beige/80 bg-white p-5 shadow-2xs transition hover:border-sage/50 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#faf8f4] text-charcoal font-serif text-lg font-medium border border-beige">
                        {h.family_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-charcoal">{h.family_name}</p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                              h.status === 'active'
                                ? 'bg-sage text-white'
                                : h.status === 'paused'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-beige/60 text-charcoal'
                            }`}
                          >
                            {h.status}
                          </span>
                          {mother && <span className="text-[11px] text-warm-gray">Mother</span>}
                          {father && <span className="text-[11px] text-warm-gray">· Father</span>}
                          {childCount > 0 && (
                            <span className="text-[11px] text-warm-gray">
                              · {childCount} child{childCount > 1 ? 'ren' : ''}
                            </span>
                          )}
                        </div>
                        {h.presenting_issue ? (
                          <p className="mt-1 text-xs text-warm-gray line-clamp-1">{h.presenting_issue}</p>
                        ) : (
                          <p className="mt-1 text-xs text-warm-gray/60 italic">No presenting issue recorded</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-warm-gray">
                      {h.last_session_date ? (
                        <span>Last session {new Date(h.last_session_date).toLocaleDateString()}</span>
                      ) : (
                        <span className="italic">No sessions yet</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-warm-gray" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg border border-beige/80 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-charcoal">New Family Case</h3>
              <button type="button" onClick={closeWizard} className="p-1.5 text-warm-gray hover:text-charcoal rounded-lg hover:bg-beige/40">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!selectedClient ? (
              <>
                <p className="text-xs text-warm-gray mb-3">
                  A family case is a spinoff of a real client account — pick one from Clients &amp; Users to begin. Everything below
                  (members, sessions) is pulled from their real booking history.
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-gray" />
                  <input
                    type="text"
                    autoFocus
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search Clients & Users by name or email..."
                    className="w-full rounded-xl border border-beige bg-[#faf8f4] pl-9 pr-4 py-2.5 text-sm text-charcoal outline-none focus:border-sage focus:bg-white"
                  />
                </div>
                {clientSearch.trim().length >= 2 ? (
                  <div className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-beige bg-white shadow-xs">
                    {searchingClients ? (
                      <p className="px-3.5 py-2.5 text-xs text-warm-gray">Searching...</p>
                    ) : clientResults.length === 0 ? (
                      <p className="px-3.5 py-2.5 text-xs text-warm-gray italic">No matching clients found.</p>
                    ) : (
                      clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClient(c)}
                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[#faf8f4] border-b border-beige/50 last:border-0"
                        >
                          <p className="font-medium text-charcoal">{c.full_name || 'Unnamed'}</p>
                          <p className="text-warm-gray">{c.email}</p>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-sage/40 bg-sage/10 px-3.5 py-2.5 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{selectedClient.full_name || 'Unnamed'}</p>
                    <p className="text-[11px] text-warm-gray truncate">{selectedClient.email}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedClient(null)} className="p-1 text-warm-gray hover:text-rose-600 shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray mb-1.5">
                  Real bookings for this client — select which become case sessions
                </p>
                {loadingBookings ? (
                  <div className="flex items-center gap-2 text-xs text-warm-gray py-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading booking history...
                  </div>
                ) : clientBookings.length === 0 ? (
                  <p className="text-xs text-warm-gray italic py-2">
                    No bookings found for this client yet. The case will be created with no sessions — add them later as real bookings come in.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {clientBookings.map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-3 rounded-xl border border-beige/70 bg-[#faf8f4] px-3 py-2.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.includes(b.id)}
                          onChange={() => toggleBooking(b.id)}
                          className="h-4 w-4 rounded border-beige text-sage-dark focus:ring-sage"
                        />
                        <Calendar className="h-3.5 w-3.5 text-sage-dark shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-charcoal">
                            {new Date(b.appointment_date).toLocaleDateString()} · {b.appointment_time}
                          </p>
                          <p className="text-[11px] text-warm-gray truncate">
                            {b.parent_name}
                            {b.child_name ? ` · with ${b.child_name}${b.child_age ? ` (${b.child_age})` : ''}` : ''}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                            b.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-[11px] text-warm-gray leading-relaxed">
                  Household members (parent, and any named child) will be created automatically from the selected bookings' data, and
                  linked as attendees to each of those sessions.
                </p>

                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={closeWizard} className="rounded-xl border border-beige px-4 py-2 text-sm text-charcoal hover:bg-beige/30">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-dark disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Create Family Case
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
};

function deriveBirthYear(childAge: string): number | null {
  const num = parseInt(childAge, 10);
  if (Number.isNaN(num)) return null;
  return new Date().getFullYear() - num;
}

export default AdminFamilies;
