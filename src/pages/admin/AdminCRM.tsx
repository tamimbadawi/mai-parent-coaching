import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  Compass,
  Phone,
  Mail,
  Calendar,
  Clock,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Loader2,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { StatCard, EmptyPanel } from './components/AdminUI';
import { ClientDossierModal } from './components/ClientDossierModal';
import type { CustomerJourneyState, CRMLifecycleStage } from '../../types';
import { COUNTRIES } from '../../data/countries';

type FilterTab = 'all' | 'track_a' | 'track_b' | 'attention' | 'active_coaching' | 'opted_out_paused';

export const AdminCRM = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<CustomerJourneyState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Selected client for dossier modal
  const [selectedClient, setSelectedClient] = useState<CustomerJourneyState | null>(null);

  const fetchJourneyStates = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('customer_journey_state')
        .select('*')
        .order('last_engagement_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const items = (data || []) as CustomerJourneyState[];
      setClients(items);

      // Check if URL contains ?client=:id
      const targetClientId = searchParams.get('client');
      if (targetClientId) {
        const found = items.find((c) => c.client_id === targetClientId);
        if (found) setSelectedClient(found);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load customer journey states.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJourneyStates();
  }, []);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = clients.length;
    const trackA = clients.filter((c) => c.current_track === 'track_a').length;
    const trackB = clients.filter((c) => c.current_track === 'track_b').length;
    const attention = clients.filter(
      (c) =>
        c.lifecycle_stage === 'track_b_reengagement_due' ||
        c.lifecycle_stage === 'track_a_taper' ||
        c.lifecycle_stage === 'track_b_quiet'
    ).length;
    const optedOutOrPaused = clients.filter(
      (c) => c.engagement_status === 'opted_out' || c.engagement_status === 'paused'
    ).length;

    return { total, trackA, trackB, attention, optedOutOrPaused };
  }, [clients]);

  // Filter and search logic
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = client.parent_name?.toLowerCase().includes(q);
        const matchesEmail = client.email?.toLowerCase().includes(q);
        const matchesPhone = client.phone?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone) return false;
      }

      // 2. Tab filter
      if (activeTab === 'track_a') {
        return client.current_track === 'track_a';
      }
      if (activeTab === 'track_b') {
        return client.current_track === 'track_b';
      }
      if (activeTab === 'attention') {
        return (
          client.lifecycle_stage === 'track_b_reengagement_due' ||
          client.lifecycle_stage === 'track_a_taper' ||
          client.lifecycle_stage === 'track_b_quiet'
        );
      }
      if (activeTab === 'active_coaching') {
        return client.upcoming_sessions_count > 0;
      }
      if (activeTab === 'opted_out_paused') {
        return client.engagement_status === 'opted_out' || client.engagement_status === 'paused';
      }

      return true;
    });
  }, [clients, searchQuery, activeTab]);

  const handleOpenDossier = (client: CustomerJourneyState) => {
    setSelectedClient(client);
    setSearchParams({ client: client.client_id });
  };

  const handleCloseDossier = () => {
    setSelectedClient(null);
    setSearchParams({});
  };

  const handleClientUpdated = (updated: Partial<CustomerJourneyState>) => {
    setClients((prev) =>
      prev.map((c) => (c.client_id === updated.client_id ? { ...c, ...updated } : c))
    );
  };

  return (
    <AdminLayout
      title="Client Relationship Management (CRM)"
      subtitle="Two-track continuity engine, client lifecycle intelligence, and touchpoint timelines."
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchJourneyStates()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-beige bg-white px-4 py-2.5 text-sm font-medium text-charcoal hover:border-sage transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link
            to="/admin/whatsapp"
            className="inline-flex items-center gap-2 rounded-2xl bg-sage px-4 py-2.5 text-sm font-medium text-white hover:bg-sage-dark transition shadow-2xs"
          >
            <BookOpen className="h-4 w-4" /> Nurture Content Studio
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            icon={Users}
            label="Total Clients"
            value={stats.total}
            detail="Active registered parents"
            tone="sage"
          />
          <StatCard
            icon={Sparkles}
            label="Track A (Nurture)"
            value={stats.trackA}
            detail="Pre-first paid session taste content"
            tone="sky"
          />
          <StatCard
            icon={HeartHandshake}
            label="Track B (Continuity)"
            value={stats.trackB}
            detail="Post-paid session continuity care"
            tone="sage"
          />
          <StatCard
            icon={AlertTriangle}
            label="Needs Attention"
            value={stats.attention}
            detail="Re-engagement or taper windows"
            tone="amber"
          />
          <StatCard
            icon={AlertCircle}
            label="Opted Out / Paused"
            value={stats.optedOutOrPaused}
            detail="Non-active outreach preferences"
            tone="rose"
          />
        </div>

        {/* Error Alert */}
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Unable to load CRM data</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        ) : null}

        {/* Search and Filters Card */}
        <div className="rounded-2xl border border-beige/80 bg-white p-4 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
              <input
                type="text"
                placeholder="Search by parent name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-beige bg-[#faf8f4] pl-10 pr-4 py-2 text-sm text-charcoal outline-none transition focus:border-sage focus:bg-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#faf8f4] p-1 border border-beige/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === 'all'
                    ? 'bg-white text-charcoal shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                All Clients ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('track_a')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === 'track_a'
                    ? 'bg-white text-charcoal shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Track A ({stats.trackA})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('track_b')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === 'track_b'
                    ? 'bg-white text-charcoal shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Track B ({stats.trackB})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attention')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === 'attention'
                    ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Needs Attention ({stats.attention})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('active_coaching')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === 'active_coaching'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Upcoming Booked
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('opted_out_paused')}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === 'opted_out_paused'
                    ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                    : 'text-warm-gray hover:text-charcoal'
                }`}
              >
                Opted Out / Paused ({stats.optedOutOrPaused})
              </button>
            </div>
          </div>
        </div>

        {/* Client List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-warm-gray">
            <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
            <p className="text-sm font-medium">Loading customer journey states...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <EmptyPanel
            title="No matching clients found"
            description={
              searchQuery
                ? `No clients matched your search "${searchQuery}".`
                : 'No clients found in this category.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const country = COUNTRIES.find(
                (c) => c.iso === client.country || c.name.toLowerCase() === client.country?.toLowerCase()
              );

              return (
                <div
                  key={client.client_id}
                  className="rounded-2xl border border-beige/80 bg-white p-5 shadow-2xs transition hover:border-sage/50"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Client Info */}
                    <div className="min-w-0 flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#faf8f4] text-charcoal font-serif text-lg font-medium border border-beige">
                        {client.parent_name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-charcoal">{client.parent_name}</p>

                          {/* Track Badge */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${
                              client.current_track === 'track_b'
                                ? 'bg-sage text-white'
                                : 'bg-[#faf8f4] text-charcoal border border-beige'
                            }`}
                          >
                            {client.current_track === 'track_b' ? 'Track B: Continuity' : 'Track A: Nurture'}
                          </span>

                          {/* Lifecycle Badge */}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              client.engagement_status === 'opted_out'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : client.engagement_status === 'paused'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : client.lifecycle_stage === 'track_b_reengagement_due'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : client.lifecycle_stage === 'track_a_booked' || client.upcoming_sessions_count > 0
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {client.lifecycle_stage.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Contact info row */}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-warm-gray">
                          <span>{client.email}</span>
                          {client.phone ? (
                            <span className="flex items-center gap-1 font-mono text-charcoal">
                              <Phone className="h-3 w-3 text-sage-dark" />
                              {client.phone}
                            </span>
                          ) : (
                            <span className="text-rose-500 font-medium">No phone</span>
                          )}
                          {country ? (
                            <span className="flex items-center gap-1">
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                            </span>
                          ) : null}
                          <span>Joined {new Date(client.client_created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Next Step Recommendation Callout */}
                        <div className="mt-2.5 flex items-start gap-2 text-xs text-charcoal bg-[#faf8f4] p-2.5 rounded-xl border border-beige/60">
                          <Compass className="h-3.5 w-3.5 shrink-0 text-sage-dark mt-0.5" />
                          <span className="leading-relaxed">
                            <strong className="text-sage-dark font-medium">Next Step: </strong>
                            {client.next_step_recommendation}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics & Actions */}
                    <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 shrink-0">
                      {/* Session Stats */}
                      <div className="flex items-center gap-2 rounded-xl bg-[#faf8f4] px-3.5 py-2 border border-beige/60 text-xs">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-warm-gray">Paid Sessions</p>
                          <p className="font-semibold text-charcoal">{client.completed_paid_sessions_count}</p>
                        </div>
                        <div className="h-6 w-px bg-beige/80 mx-1" />
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-warm-gray">Last Touch</p>
                          <p className="font-semibold text-charcoal">{client.days_since_last_engagement}d ago</p>
                        </div>
                        {client.upcoming_sessions_count > 0 ? (
                          <>
                            <div className="h-6 w-px bg-beige/80 mx-1" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium">Upcoming</p>
                              <p className="font-semibold text-emerald-700">{client.upcoming_sessions_count}</p>
                            </div>
                          </>
                        ) : null}
                      </div>

                      {/* Open Dossier Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDossier(client)}
                        className="inline-flex items-center gap-2 rounded-xl bg-charcoal text-white px-4 py-2.5 text-xs font-medium hover:bg-black transition shadow-2xs"
                      >
                        <Compass className="h-4 w-4 text-sage" /> Open Dossier
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-Client Dossier Modal */}
      {selectedClient ? (
        <ClientDossierModal
          client={selectedClient}
          onClose={handleCloseDossier}
          onClientUpdated={handleClientUpdated}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminCRM;
