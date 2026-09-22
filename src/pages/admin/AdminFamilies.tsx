import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Plus, Loader2, AlertCircle, ChevronRight, Baby, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { StatCard, EmptyPanel } from './components/AdminUI';
import type { Household, HouseholdMember, HouseholdStatus } from '../../types/family';

type HouseholdRow = Household & { household_members: Pick<HouseholdMember, 'id' | 'role'>[]; last_session_date: string | null };

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
  const [creating, setCreating] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');

  const linkedClientId = searchParams.get('client');
  const linkedName = searchParams.get('name');
  const linkedEmail = searchParams.get('email');

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

  // If deep-linked from a CRM client with no matching household yet, prefill the create form.
  useEffect(() => {
    if (linkedClientId && !loading) {
      const alreadyLinked = households.some((h) => h.primary_contact_profile_id === linkedClientId);
      if (!alreadyLinked && linkedName) {
        setCreating(true);
        setNewFamilyName(`${linkedName} Family`);
      } else if (alreadyLinked) {
        const match = households.find((h) => h.primary_contact_profile_id === linkedClientId);
        if (match) navigate(`/admin/families/${match.id}`, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedClientId, loading, households]);

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

  const handleCreate = async (): Promise<void> => {
    if (!newFamilyName.trim()) return;
    try {
      const { data, error: insertErr } = await supabase
        .from('households')
        .insert({
          family_name: newFamilyName.trim(),
          primary_contact_profile_id: linkedClientId || null,
          status: 'active',
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      setCreating(false);
      setNewFamilyName('');
      setSearchParams({});
      navigate(`/admin/families/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create family case.');
    }
  };

  return (
    <AdminLayout
      title="Family Cases"
      subtitle="Households, session history, and clinical case tracking."
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
        {linkedClientId && !creating ? (
          <div className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-sage/10 p-4 text-sm text-charcoal">
            <Users className="h-5 w-5 shrink-0 text-sage-dark" />
            <p>
              Looking for a family case linked to <strong>{linkedName || linkedEmail}</strong> — none found yet.{' '}
              <button type="button" className="underline font-medium" onClick={() => setCreating(true)}>
                Create one
              </button>
              .
            </p>
          </div>
        ) : null}

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
            description="Create your first family case to start tracking households, sessions, and clinical notes."
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg border border-beige/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-charcoal">New Family Case</h3>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewFamilyName('');
                }}
                className="p-1.5 text-warm-gray hover:text-charcoal rounded-lg hover:bg-beige/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-medium text-warm-gray mb-1.5">Family display name</label>
            <input
              type="text"
              autoFocus
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder="e.g. The Jenkins Family"
              className="w-full rounded-xl border border-beige bg-[#faf8f4] px-4 py-2.5 text-sm text-charcoal outline-none focus:border-sage focus:bg-white"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewFamilyName('');
                }}
                className="rounded-xl border border-beige px-4 py-2 text-sm text-charcoal hover:bg-beige/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newFamilyName.trim()}
                className="rounded-xl bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-dark disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminFamilies;
