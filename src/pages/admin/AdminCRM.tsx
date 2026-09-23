import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Sparkles,
  Compass,
  Phone,
  Loader2,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Plus,
  Home,
  Edit3,
  Trash2,
  MoreVertical,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import { EmptyPanel } from './components/AdminUI';
import { ClientDossierModal } from './components/ClientDossierModal';
import ContentLibraryStudio from './components/ContentLibraryStudio';
import { UserComposerModal } from './components/UserComposerModal';
import type { CustomerJourneyState } from '../../types';
import { COUNTRIES } from '../../data/countries';

type FilterTab = 'all' | 'clients' | 'admins' | 'track_a' | 'track_b' | 'attention' | 'active_coaching';

export const AdminCRM = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<CustomerJourneyState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Selected client for dossier modal
  const [selectedClient, setSelectedClient] = useState<CustomerJourneyState | null>(null);

  // Show client journey details for admin accounts (toggle, OFF by default)
  const [showAdminJourney, setShowAdminJourney] = useState(false);

  // Section switcher: 'clients' vs 'studio'
  const sectionParam = searchParams.get('section') || searchParams.get('tab') || searchParams.get('view');
  const [activeSection, setActiveSection] = useState<'clients' | 'studio'>(
    sectionParam === 'studio' ? 'studio' : 'clients'
  );

  // User management modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserData, setEditingUserData] = useState<{
    id: string;
    email: string;
    full_name?: string | null;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    address?: string | null;
    role?: 'student' | 'admin' | string;
  } | null>(null);

  // Card dropdown menu state & action in progress
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get('section') || searchParams.get('tab') || searchParams.get('view');
    if (s === 'studio') {
      setActiveSection('studio');
    } else if (s === 'clients') {
      setActiveSection('clients');
    }
  }, [searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeDropdownId && !(e.target as HTMLElement).closest('.client-actions-dropdown')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeDropdownId]);

  const fetchJourneyStates = async (): Promise<void> => {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to load customer journey states.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJourneyStates();
  }, []);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = clients.length; // Everyone (clients + admins)
    const clientUsers = clients.filter((c) => c.role === 'student');
    const adminUsers = clients.filter((c) => c.role === 'admin');

    const totalClients = clientUsers.length;
    const totalAdmins = adminUsers.length;

    // Track and lifecycle counts: CLIENTS ONLY (admins excluded from nurture tracks)
    const trackA = clientUsers.filter((c) => c.current_track === 'track_a').length;
    const trackB = clientUsers.filter((c) => c.current_track === 'track_b').length;
    const attention = clientUsers.filter(
      (c) =>
        c.lifecycle_stage === 'track_b_reengagement_due' ||
        c.lifecycle_stage === 'track_a_taper' ||
        c.lifecycle_stage === 'track_b_quiet'
    ).length;
    const activeCoaching = clientUsers.filter((c) => c.upcoming_sessions_count > 0).length;

    return {
      total,
      totalClients,
      totalAdmins,
      trackA,
      trackB,
      attention,
      activeCoaching,
      admins: totalAdmins,
    };
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
      if (activeTab === 'clients') {
        return client.role === 'student';
      }
      if (activeTab === 'admins') {
        return client.role === 'admin';
      }
      // Track and lifecycle tabs count and show CLIENTS ONLY (admins excluded from nurture tracks)
      if (activeTab === 'track_a') {
        return client.role === 'student' && client.current_track === 'track_a';
      }
      if (activeTab === 'track_b') {
        return client.role === 'student' && client.current_track === 'track_b';
      }
      if (activeTab === 'attention') {
        return (
          client.role === 'student' &&
          (client.lifecycle_stage === 'track_b_reengagement_due' ||
            client.lifecycle_stage === 'track_a_taper' ||
            client.lifecycle_stage === 'track_b_quiet')
        );
      }
      if (activeTab === 'active_coaching') {
        return client.role === 'student' && client.upcoming_sessions_count > 0;
      }

      return true;
    });
  }, [clients, searchQuery, activeTab]);

  const handleOpenDossier = (client: CustomerJourneyState): void => {
    setSelectedClient(client);
    setSearchParams({ client: client.client_id });
  };

  const handleCloseDossier = (): void => {
    setSelectedClient(null);
    setSearchParams({});
  };

  const handleClientUpdated = (updated: Partial<CustomerJourneyState>): void => {
    setClients((prev) =>
      prev.map((c) => (c.client_id === updated.client_id ? { ...c, ...updated } : c))
    );
  };

  const handleOpenCreateUser = (): void => {
    setEditingUserData(null);
    setUserModalOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleOpenEditUser = async (client: CustomerJourneyState): Promise<void> => {
    setActiveDropdownId(null);
    setError(null);
    setSuccess(null);

    try {
      // Fetch full profile to get city and address fields if set
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', client.client_id)
        .single();

      setEditingUserData({
        id: client.client_id,
        email: client.email,
        full_name: profile?.full_name ?? client.parent_name,
        phone: profile?.phone ?? client.phone,
        country: profile?.country ?? client.country,
        city: profile?.city ?? null,
        address: profile?.address ?? null,
        role: profile?.role ?? client.role,
      });
      setUserModalOpen(true);
    } catch {
      // Fallback to data present in journey state
      setEditingUserData({
        id: client.client_id,
        email: client.email,
        full_name: client.parent_name,
        phone: client.phone,
        country: client.country,
        role: client.role,
      });
      setUserModalOpen(true);
    }
  };

  const invokeUserManager = async (payload: Record<string, unknown>): Promise<{ error?: string }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        return { error: 'No active session. Please log out and back in.' };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const functionUrl = `${supabaseUrl}/functions/v1/admin-user-manager`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(responseText);
          errMsg = parsed.error ?? parsed.message ?? errMsg;
        } catch {
          // not JSON
        }
        return { error: errMsg };
      }

      try {
        const data = JSON.parse(responseText);
        if (data.error) return { error: data.error };
        return data;
      } catch {
        return { error: `Could not parse response: ${responseText}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Network error: ${msg}` };
    }
  };

  const handleToggleRole = async (client: CustomerJourneyState): Promise<void> => {
    setActiveDropdownId(null);
    const newRole = client.role === 'admin' ? 'student' : 'admin';
    const confirmMsg =
      newRole === 'admin'
        ? `Grant administrator privileges to ${client.email}? They will have full access to admin panels.`
        : `Remove administrator privileges for ${client.email}? They will become a standard student/client.`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingUserId(client.client_id);
    setError(null);
    setSuccess(null);

    try {
      const result = await invokeUserManager({
        action: 'updateUser',
        userId: client.client_id,
        email: client.email,
        fullName: client.parent_name,
        phone: client.phone,
        country: client.country,
        role: newRole,
        approvalStatus: 'approved',
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`User role updated to ${newRole}.`);
        await fetchJourneyStates();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Role update failed: ${msg}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (client: CustomerJourneyState): Promise<void> => {
    setActiveDropdownId(null);
    const confirmMsg = `Permanently delete ${client.parent_name} (${client.email})? This removes their auth user account and profile data.`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingUserId(client.client_id);
    setError(null);
    setSuccess(null);

    try {
      const result = await invokeUserManager({
        action: 'deleteUser',
        userId: client.client_id,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('User account successfully deleted.');
        await fetchJourneyStates();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Delete failed: ${msg}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <AdminLayout
      title={activeSection === 'studio' ? 'Nurture Content Studio' : 'Users CRM'}
      subtitle={
        activeSection === 'studio'
          ? 'Author, preview, and manage Track A & Track B nurture templates, worksheets, and prompts.'
          : 'Two-track continuity engine, client lifecycle intelligence, and touchpoint timelines.'
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Section Switcher Tabs */}
          <div className="inline-flex rounded-2xl border border-beige/90 bg-[#faf8f4] p-1 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveSection('clients');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('view');
                  next.delete('section');
                  next.delete('tab');
                  return next;
                });
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-medium transition cursor-pointer ${
                activeSection === 'clients'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'text-charcoal hover:bg-white/80'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Client Journeys</span>
              {stats.totalClients > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                    activeSection === 'clients' ? 'bg-white/20 text-white' : 'bg-beige/60 text-charcoal'
                  }`}
                >
                  {stats.totalClients}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('studio');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('view', 'studio');
                  return next;
                });
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-medium transition cursor-pointer ${
                activeSection === 'studio'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'text-charcoal hover:bg-white/80'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Nurture Content Studio</span>
            </button>
          </div>

          {/* Add User Button (Styled matching the mint/teal button in screenshot) */}
          <button
            type="button"
            onClick={handleOpenCreateUser}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[#5aa59e] hover:bg-[#4a928b] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add user</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Success Feedback Alert */}
        {success && (
          <div className="flex items-center justify-between rounded-2xl border border-sage/30 bg-sage/10 p-3.5 text-xs text-sage-dark animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-sage-dark" />
              <span className="font-medium">{success}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="text-warm-gray hover:text-charcoal cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Feedback Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeSection === 'studio' ? (
          <ContentLibraryStudio />
        ) : (
          <>
            {/* Top Summary 4-Stat Cards (Compact horizontal layout matching user suggestion) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Card 1: Total Users (Everyone) */}
              <div className="rounded-2xl border border-beige/80 bg-white px-3.5 py-2.5 shadow-2xs transition hover:border-beige flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf5f3] text-[#4d8b82]">
                  <Users className="h-4 w-4" />
                </div>
                <div className="h-8 w-px bg-beige/80 shrink-0" />
                <span className="font-serif text-2xl lg:text-3xl text-charcoal font-normal shrink-0">
                  {stats.total}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/80 truncate">
                    TOTAL USERS
                  </p>
                  <p className="text-[11px] text-warm-gray truncate leading-tight mt-0.5">
                    Clients and admins
                  </p>
                </div>
              </div>

              {/* Card 2: Track A (Nurture) */}
              <div className="rounded-2xl border border-beige/80 bg-white px-3.5 py-2.5 shadow-2xs transition hover:border-beige flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef6fc] text-[#3b82f6]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="h-8 w-px bg-beige/80 shrink-0" />
                <span className="font-serif text-2xl lg:text-3xl text-charcoal font-normal shrink-0">
                  {stats.trackA}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/80 truncate">
                    TRACK A (NURTURE)
                  </p>
                  <p className="text-[11px] text-warm-gray truncate leading-tight mt-0.5">
                    Pre-first paid session taste
                  </p>
                </div>
              </div>

              {/* Card 3: Track B (Continuity) */}
              <div className="rounded-2xl border border-beige/80 bg-white px-3.5 py-2.5 shadow-2xs transition hover:border-beige flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef8f4] text-[#10b981]">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div className="h-8 w-px bg-beige/80 shrink-0" />
                <span className="font-serif text-2xl lg:text-3xl text-charcoal font-normal shrink-0">
                  {stats.trackB}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/80 truncate">
                    TRACK B (CONTINUITY)
                  </p>
                  <p className="text-[11px] text-warm-gray truncate leading-tight mt-0.5">
                    Post-paid session care
                  </p>
                </div>
              </div>

              {/* Card 4: Needs Attention */}
              <div className="rounded-2xl border border-beige/80 bg-white px-3.5 py-2.5 shadow-2xs transition hover:border-beige flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fffbeb] text-[#f59e0b]">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="h-8 w-px bg-beige/80 shrink-0" />
                <span className="font-serif text-2xl lg:text-3xl text-charcoal font-normal shrink-0">
                  {stats.attention}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-charcoal/80 truncate">
                    NEEDS ATTENTION
                  </p>
                  <p className="text-[11px] text-warm-gray truncate leading-tight mt-0.5">
                    Re-engagement or taper
                  </p>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar Matching Screenshot */}
            <div className="rounded-2xl border border-beige/80 bg-white p-3.5 shadow-2xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-gray" />
                  <input
                    type="text"
                    placeholder="Search by parent name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-beige/70 bg-[#faf8f4] pl-10 pr-4 py-2 text-xs text-charcoal outline-none transition focus:border-sage focus:bg-white"
                  />
                </div>

                {/* Filter Pills and Toggle */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#faf8f4] p-1 border border-beige/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                        activeTab === 'all'
                          ? 'bg-white text-charcoal shadow-2xs font-semibold'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      All ({stats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clients')}
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                        activeTab === 'clients'
                          ? 'bg-white text-charcoal shadow-2xs font-semibold'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      Clients ({stats.totalClients})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('admins')}
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                        activeTab === 'admins'
                          ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      Admins ({stats.totalAdmins})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('track_a')}
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
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
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
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
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
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
                      className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                        activeTab === 'active_coaching'
                          ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                          : 'text-warm-gray hover:text-charcoal'
                      }`}
                    >
                      Upcoming Booked
                    </button>
                  </div>

                  {/* Toggle: Show client journey for admins */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-charcoal/80 hover:text-charcoal px-3 py-2 rounded-xl border border-beige/70 bg-[#faf8f4] transition hover:bg-white">
                    <input
                      type="checkbox"
                      checked={showAdminJourney}
                      onChange={(e) => setShowAdminJourney(e.target.checked)}
                      className="rounded border-beige text-[#5aa59e] focus:ring-[#5aa59e] h-3.5 w-3.5 cursor-pointer accent-[#5aa59e]"
                    />
                    <span className="font-medium whitespace-nowrap">Show client journey for admins</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Clients List */}
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
                  const isAdmin = client.role === 'admin';
                  const showJourney = !isAdmin || showAdminJourney;

                  return (
                    <div
                      key={client.client_id}
                      className="rounded-2xl border border-beige/80 bg-white p-5 shadow-2xs transition hover:border-sage/50"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Client Info */}
                        <div className="min-w-0 flex items-start gap-3.5">
                          {/* Initial Avatar Circle */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#faf8f4] text-charcoal font-serif text-lg font-semibold border border-beige/80">
                            {client.parent_name ? client.parent_name.charAt(0).toUpperCase() : 'P'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-charcoal">{client.parent_name}</p>

                              {/* Track Badge (Hidden for admins unless showAdminJourney is ON) */}
                              {showJourney && (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                    client.current_track === 'track_b'
                                      ? 'bg-[#6b9080] text-white'
                                      : 'bg-[#faf8f4] text-charcoal border border-beige/80'
                                  }`}
                                >
                                  {client.current_track === 'track_b' ? 'TRACK B: CONTINUITY' : 'TRACK A: NURTURE'}
                                </span>
                              )}

                              {/* Lifecycle Stage Badge (Hidden for admins unless showAdminJourney is ON) */}
                              {showJourney && (
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
                                      : 'bg-[#edf7f1] text-[#2c6e49] border border-[#cbe8d6]'
                                  }`}
                                >
                                  {client.lifecycle_stage.replace(/_/g, ' ')}
                                </span>
                              )}

                              {/* Role Badge if Admin */}
                              {client.role === 'admin' && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
                                  Admin
                                </span>
                              )}
                            </div>

                            {/* Contact Info Row */}
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

                            {/* Next Step Recommendation Callout (Hidden for admins unless showAdminJourney is ON) */}
                            {showJourney && (
                              <div className="mt-2.5 flex items-start sm:items-center gap-2 text-xs text-charcoal bg-[#faf8f4] p-2.5 rounded-xl border border-beige/70">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4d8b82] mt-0.5 sm:mt-0" />
                                <span className="leading-relaxed">
                                  <strong className="text-charcoal font-semibold">Next Step: </strong>
                                  {client.next_step_recommendation}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Metrics & Actions */}
                        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
                          {/* Session Stats Box (Hidden for admins unless showAdminJourney is ON) */}
                          {showJourney && (
                            <div className="flex items-center gap-3 rounded-xl bg-[#faf8f4] px-3.5 py-2 border border-beige/60 text-xs">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-warm-gray">Paid Sessions</p>
                                <p className="font-semibold text-charcoal text-center">
                                  {client.completed_paid_sessions_count}
                                </p>
                              </div>
                              <div className="h-6 w-px bg-beige/80" />
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-warm-gray">Last Touch</p>
                                <p className="font-semibold text-charcoal text-center">
                                  {client.days_since_last_engagement}d ago
                                </p>
                              </div>
                              {client.upcoming_sessions_count > 0 && (
                                <>
                                  <div className="h-6 w-px bg-beige/80" />
                                  <div>
                                    <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium">
                                      Upcoming
                                    </p>
                                    <p className="font-semibold text-emerald-700 text-center">
                                      {client.upcoming_sessions_count}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Action: Open Dossier (Hidden for admins unless showAdminJourney is ON) */}
                          {showJourney && (
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(client)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-charcoal text-white px-3.5 py-2 text-xs font-medium hover:bg-black transition shadow-2xs cursor-pointer"
                            >
                              <Compass className="h-3.5 w-3.5 text-sage" />
                              <span>Open Dossier</span>
                            </button>
                          )}

                          {/* Secondary Action: Family Case Link (Hidden for admins unless showAdminJourney is ON) */}
                          {showJourney && (
                            <Link
                              to={`/admin/families?client=${client.client_id}&name=${encodeURIComponent(
                                client.parent_name
                              )}&email=${encodeURIComponent(client.email)}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-[#faf8f4] text-charcoal px-3 py-2 text-xs font-medium hover:border-sage hover:text-sage-dark transition shadow-2xs"
                              title="Open Family Case"
                            >
                              <Home className="h-3.5 w-3.5 text-sage-dark" />
                              <span className="hidden sm:inline">Family Case</span>
                            </Link>
                          )}

                          {/* Secondary Action: Session Notes Link (Hidden for admins unless showAdminJourney is ON) */}
                          {showJourney && (
                            <Link
                              to={`/admin/sessions?client=${client.client_id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-[#faf8f4] text-charcoal px-3 py-2 text-xs font-medium hover:border-sage hover:text-sage-dark transition shadow-2xs"
                              title="Open Session Notes"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-sage-dark" />
                              <span className="hidden sm:inline">Session Notes</span>
                            </Link>
                          )}

                          {/* More Options Dropdown Menu for User Management (Always Kept) */}
                          <div className="relative client-actions-dropdown">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(
                                  activeDropdownId === client.client_id ? null : client.client_id
                                );
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-beige bg-white text-warm-gray hover:text-charcoal hover:border-sage transition cursor-pointer"
                              title="Account Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeDropdownId === client.client_id && (
                              <div className="absolute right-0 z-30 mt-1 w-48 rounded-2xl border border-beige bg-white p-1.5 shadow-xl animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => void handleOpenEditUser(client)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-charcoal hover:bg-[#faf8f4] transition text-left cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-sage-dark" />
                                  <span>Edit user details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleToggleRole(client)}
                                  disabled={updatingUserId === client.client_id}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-charcoal hover:bg-[#faf8f4] transition text-left cursor-pointer disabled:opacity-50"
                                >
                                  {client.role === 'admin' ? (
                                    <>
                                      <ShieldCheck className="h-3.5 w-3.5 text-warm-gray" />
                                      <span>Demote to student</span>
                                    </>
                                  ) : (
                                    <>
                                      <Crown className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Promote to admin</span>
                                    </>
                                  )}
                                </button>

                                <div className="my-1 border-t border-beige/60" />

                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUser(client)}
                                  disabled={
                                    updatingUserId === client.client_id ||
                                    client.email === 'admin@admin.com'
                                  }
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition text-left cursor-pointer disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete account</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Per-Client Dossier Modal */}
      {selectedClient && (
        <ClientDossierModal
          client={selectedClient}
          onClose={handleCloseDossier}
          onClientUpdated={handleClientUpdated}
        />
      )}

      {/* User Composer Modal (Add User & Edit User) */}
      <UserComposerModal
        isOpen={userModalOpen}
        editingUser={editingUserData}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUserData(null);
        }}
        onSaved={(msg) => {
          setSuccess(msg);
          void fetchJourneyStates();
        }}
      />
    </AdminLayout>
  );
};

export default AdminCRM;
