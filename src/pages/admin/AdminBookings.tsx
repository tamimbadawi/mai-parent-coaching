import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarClock,
  Clock,
  Mail,
  Phone,
  Globe,
  Baby,
  FileText,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Search,
  Plus,
  LayoutList,
  Calendar as CalendarIcon,
  Video,
  Edit2,
  Calendar,
  XCircle,
  RotateCw,
  CalendarPlus,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { Booking } from '../../types';
import { EmptyPanel, Panel, StatCard } from './components/AdminUI';
import { BookingRescheduleModal } from './components/BookingRescheduleModal';
import { BookingEditModal } from './components/BookingEditModal';
import {
  AdminManualBookingModal,
  type AdminManualBookingInitialData,
} from './components/AdminManualBookingModal';
import { AdminAvailabilityModal } from './components/AdminAvailabilityModal';
import { AdminBookingsCalendarView } from './components/AdminBookingsCalendarView';
import {
  discoveryTopics,
  intakeNeeds,
  intakeDurations,
  coachingPackages,
} from '../../data/content';

/**
 * Helper to identify package bookings that have been reserved/purchased
 * but have not had their session dates and times scheduled on the calendar yet.
 * In this case, Mai's Assistant must reach out to the client and schedule them.
 */
export const isNeedsCalendarScheduling = (b: Booking): boolean => {
  if (b.status === 'cancelled') return false;
  if (b.status === 'pending_calendar_sync') return true;

  const isPackage =
    b.appointment_type_id?.startsWith('package') ||
    b.appointment_type_title?.toLowerCase().includes('package') ||
    b.appointment_type_title?.toLowerCase().includes('advisory') ||
    b.appointment_type_title?.toLowerCase().includes('sprint') ||
    b.appointment_type_title?.toLowerCase().includes('realignment') ||
    b.appointment_type_title?.toLowerCase().includes('reset') ||
    b.appointment_type_title?.toLowerCase().includes('concierge') ||
    b.notes?.includes('[Package') ||
    b.notes?.includes('Package Reservation');

  const isUnscheduled =
    b.appointment_time === 'Unscheduled' ||
    !b.appointment_time ||
    b.appointment_time.trim() === '' ||
    !b.google_calendar_event_id;

  return Boolean(isPackage && (b.status === 'pending' || isUnscheduled));
};

const statusConfig: Record<
  Booking['status'],
  { label: string; badge: string; selectTone: string }
> = {
  pending: {
    label: 'Pending Review',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    selectTone: 'text-amber-800',
  },
  confirmed: {
    label: 'Confirmed',
    badge: 'bg-sage/20 text-sage-dark border-sage/40',
    selectTone: 'text-sage-dark',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    selectTone: 'text-emerald-800',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-rose-100 text-rose-700 border-rose-300',
    selectTone: 'text-rose-700',
  },
  pending_calendar_sync: {
    label: 'Sync Needed',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    selectTone: 'text-purple-800',
  },
};

type DateFilter = 'all' | 'today' | 'this_week' | 'upcoming' | 'past';
type BookingFilterStatus = 'all' | 'needs_scheduling' | Booking['status'];

const AdminBookings = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingFilterStatus>(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'needs_scheduling') return 'needs_scheduling';
    if (
      filterParam &&
      ['pending', 'confirmed', 'completed', 'cancelled', 'pending_calendar_sync'].includes(
        filterParam
      )
    ) {
      return filterParam as Booking['status'];
    }
    return 'all';
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modals state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualBookingInitialData, setManualBookingInitialData] =
    useState<AdminManualBookingInitialData | null>(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'needs_scheduling') {
      setStatusFilter('needs_scheduling');
    }
  }, [searchParams]);

  const fetchBookings = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('bookings')
        .select('*')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (queryError) {
        console.error('Error querying bookings:', queryError);
        setError(queryError.message);
      } else {
        setBookings((data as Booking[]) ?? []);
      }
    } catch (err: unknown) {
      console.error('Unexpected error loading bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBookings();
  }, []);

  const updateStatus = async (id: string, newStatus: Booking['status']): Promise<void> => {
    setUpdatingId(id);
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) {
        console.error('Failed to update booking status:', updateError);
        alert(`Could not update status: ${updateError.message}`);
      } else {
        setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
      }
    } catch (err: unknown) {
      console.error('Unexpected update error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveBooking = async (bookingId: string): Promise<void> => {
    setUpdatingId(bookingId);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'approve',
          bookingId,
        },
      });

      if (invokeErr || data?.error) {
        alert(`Approval error: ${invokeErr?.message || data?.error}`);
      } else {
        await fetchBookings();
      }
    } catch (err) {
      console.error('Approve booking error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelBooking = async (booking: Booking): Promise<void> => {
    const reason = window.prompt(
      `Cancel booking for ${booking.parent_name} on ${booking.appointment_date}?\nOptional reason:`,
      'Client request'
    );
    if (reason === null) return; // User pressed Cancel

    setUpdatingId(booking.id);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'cancel',
          bookingId: booking.id,
          reason,
        },
      });

      if (invokeErr || data?.error) {
        alert(`Could not cancel: ${invokeErr?.message || data?.error}`);
      } else {
        await fetchBookings();
      }
    } catch (err) {
      console.error('Cancel booking error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSyncCalendar = async (bookingId: string): Promise<void> => {
    setSyncingId(bookingId);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'sync-calendar',
          bookingId,
        },
      });

      if (invokeErr || data?.error) {
        alert(`Sync failed: ${invokeErr?.message || data?.error}`);
      } else {
        await fetchBookings();
      }
    } catch (err) {
      console.error('Calendar sync error:', err);
    } finally {
      setSyncingId(null);
    }
  };

  // Filter Bookings by Status, Date Range, and Search Query
  const filteredBookings = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return bookings.filter((b) => {
      // 1. Status Filter
      if (statusFilter === 'needs_scheduling') {
        if (!isNeedsCalendarScheduling(b)) return false;
      } else if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      // 2. Date Filter
      if (dateFilter === 'today' && b.appointment_date !== todayStr) return false;
      if (dateFilter === 'upcoming' && b.appointment_date < todayStr) return false;
      if (dateFilter === 'past' && b.appointment_date >= todayStr) return false;
      if (dateFilter === 'this_week') {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        const startStr = startOfWeek.toISOString().split('T')[0];
        const endStr = endOfWeek.toISOString().split('T')[0];
        if (b.appointment_date < startStr || b.appointment_date > endStr) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = b.parent_name.toLowerCase().includes(query);
        const matchesEmail = b.email.toLowerCase().includes(query);
        const matchesChild = b.child_name?.toLowerCase().includes(query);
        const matchesNotes = b.notes?.toLowerCase().includes(query);
        const matchesType = b.appointment_type_title.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesChild && !matchesNotes && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, statusFilter, dateFilter, searchQuery]);

  const totalCount = bookings.length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const unscheduledBookings = useMemo(
    () => bookings.filter(isNeedsCalendarScheduling),
    [bookings]
  );
  const unscheduledCount = unscheduledBookings.length;

  return (
    <AdminLayout title="Consultation Bookings">
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div
          className={`grid gap-4 sm:grid-cols-2 ${
            unscheduledCount > 0 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
          }`}
        >
          <StatCard
            icon={CalendarDays}
            label="Total Bookings"
            value={totalCount}
            detail="All consultation and coaching sessions requested to date."
            tone="sage"
          />
          {unscheduledCount > 0 && (
            <StatCard
              icon={AlertTriangle}
              label="Needs Scheduling"
              value={unscheduledCount}
              detail="Client packages booked without calendar dates assigned."
              tone="amber"
            />
          )}
          <StatCard
            icon={Clock}
            label="Pending Review"
            value={pendingCount}
            detail="Bookings awaiting confirmation or Google Calendar sync."
            tone="amber"
          />
          <StatCard
            icon={CalendarCheck}
            label="Confirmed Sessions"
            value={confirmedCount}
            detail="Upcoming confirmed appointments ready on schedule."
            tone="sky"
          />
        </div>

        {/* Unscheduled Action Banner for Mai's Assistant */}
        {unscheduledCount > 0 && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 via-cream to-amber-50/70 p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-100 text-amber-800 shadow-2xs">
                  <AlertTriangle className="h-5 w-5 text-amber-700 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                      Assistant Action Required
                    </span>
                    <span className="text-xs font-semibold text-amber-800">
                      {unscheduledCount} {unscheduledCount === 1 ? 'Package' : 'Packages'} Pending Calendar Times
                    </span>
                  </div>
                  <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">
                    Client Consultation Times Not Booked
                  </h3>
                  <p className="mt-0.5 text-xs text-warm-gray max-w-2xl leading-relaxed">
                    Clients have enrolled in coaching packages, but session dates and times are not yet booked on the calendar. Mai's Assistant must reach out to coordinate client availability and lock in their consultation sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                {statusFilter === 'needs_scheduling' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchParams({});
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100/50 transition"
                  >
                    <span>Showing Unscheduled</span>
                    <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[11px] font-bold">
                      {unscheduledCount}
                    </span>
                    <span className="text-[11px] text-warm-gray ml-1">✕ Clear</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('needs_scheduling');
                      setSearchParams({ filter: 'needs_scheduling' });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-900 transition active:scale-95"
                  >
                    <span>Filter Unscheduled</span>
                    <span className="rounded-full bg-amber-600 px-1.5 py-0.2 text-[11px] font-bold text-white">
                      {unscheduledCount}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-900">Failed to load bookings from database</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void fetchBookings()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 shadow-sm transition hover:bg-rose-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Main Panel */}
        <Panel
          title="Appointments & Schedule Operations"
          eyebrow="Booking Management"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setManualBookingInitialData(null);
                  setIsManualModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-sage px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Booking</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAvailabilityModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-beige bg-white px-3.5 py-2 text-xs font-medium text-charcoal shadow-sm transition hover:bg-cream"
              >
                <CalendarClock className="h-3.5 w-3.5 text-sage-dark" />
                <span>Manage Availability</span>
              </button>
              <button
                type="button"
                onClick={() => void fetchBookings()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-white disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          }
        >
          {/* Controls Bar: Search, Date Filter, Status Filter, View Toggle */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft-gray" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by client, child, email, or notes..."
                  className="w-full rounded-2xl border border-beige bg-cream/60 py-2 pl-9 pr-4 text-xs font-medium text-charcoal transition focus:border-sage focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage/20"
                />
              </div>

              {/* View Switcher */}
              <div className="flex rounded-2xl border border-beige bg-cream p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition ${
                    viewMode === 'list'
                      ? 'bg-white text-charcoal shadow-sm'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span>List View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition ${
                    viewMode === 'calendar'
                      ? 'bg-white text-charcoal shadow-sm'
                      : 'text-warm-gray hover:text-charcoal'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Calendar View</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-beige/60 pt-3">
              {/* Date Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="mr-1 text-[11px] font-semibold text-soft-gray">Date:</span>
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'today', label: 'Today' },
                    { id: 'this_week', label: 'This Week' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'past', label: 'Past' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDateFilter(tab.id)}
                    className={`rounded-xl px-2.5 py-1 font-medium transition ${
                      dateFilter === tab.id
                        ? 'bg-sage text-white shadow-sm'
                        : 'bg-cream text-warm-gray hover:bg-beige/50 hover:text-charcoal'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="mr-1 text-[11px] font-semibold text-soft-gray">Status:</span>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchParams({});
                  }}
                  className={`rounded-xl px-2.5 py-1 font-medium transition ${
                    statusFilter === 'all'
                      ? 'bg-charcoal text-white shadow-sm'
                      : 'bg-cream text-warm-gray hover:bg-beige/50 hover:text-charcoal'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('needs_scheduling');
                    setSearchParams({ filter: 'needs_scheduling' });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 font-medium transition ${
                    statusFilter === 'needs_scheduling'
                      ? 'bg-amber-800 text-white shadow-sm'
                      : unscheduledCount > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold hover:bg-amber-200'
                      : 'bg-cream text-warm-gray hover:bg-beige/50 hover:text-charcoal'
                  }`}
                >
                  <span>Needs Scheduling</span>
                  {unscheduledCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        statusFilter === 'needs_scheduling'
                          ? 'bg-amber-950 text-white'
                          : 'bg-amber-800 text-white'
                      }`}
                    >
                      {unscheduledCount}
                    </span>
                  )}
                </button>
                {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab);
                      setSearchParams({ filter: tab });
                    }}
                    className={`rounded-xl px-2.5 py-1 font-medium capitalize transition ${
                      statusFilter === tab
                        ? 'bg-charcoal text-white shadow-sm'
                        : 'bg-cream text-warm-gray hover:bg-beige/50 hover:text-charcoal'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-warm-gray">
              <Loader2 className="h-8 w-8 animate-spin text-sage-dark" />
              <p className="mt-3 text-sm">Loading bookings from Supabase...</p>
            </div>
          ) : viewMode === 'calendar' ? (
            <AdminBookingsCalendarView
              bookings={filteredBookings}
              onReschedule={(b) => setRescheduleBooking(b)}
              onEdit={(b) => setEditBooking(b)}
              onApprove={async (b) => {
                await handleApproveBooking(b.id);
              }}
              approvingId={updatingId}
            />
          ) : filteredBookings.length === 0 ? (
            <EmptyPanel
              title={
                searchQuery
                  ? 'No matching bookings found'
                  : statusFilter === 'all'
                  ? 'No bookings recorded yet'
                  : `No ${statusFilter} bookings found`
              }
              description="Appointment details, child info, and timestamps will appear here in real time."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredBookings.map((booking) => {
                const config = statusConfig[booking.status] ?? statusConfig.pending;
                const isUpdating = updatingId === booking.id;
                const isSyncing = syncingId === booking.id;
                const needsScheduling = isNeedsCalendarScheduling(booking);

                return (
                  <article
                    key={booking.id}
                    className={`flex flex-col justify-between rounded-[24px] border p-5 transition-all hover:shadow-xs ${
                      needsScheduling
                        ? 'border-amber-300 bg-amber-50/30 hover:bg-amber-50/50'
                        : 'border-beige bg-cream/70 hover:bg-cream'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Client Info & Appointment Time */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif text-lg font-semibold text-charcoal">
                              {booking.parent_name}
                            </h3>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${config.badge}`}
                            >
                              {config.label}
                            </span>
                            {needsScheduling && (
                              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                ⚠️ Needs Scheduling
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-warm-gray">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-soft-gray shrink-0" />
                              <a href={`mailto:${booking.email}`} className="text-charcoal hover:underline truncate max-w-[200px]">
                                {booking.email}
                              </a>
                            </span>
                            {booking.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 text-soft-gray shrink-0" />
                                <a href={`tel:${booking.phone}`} className="text-charcoal hover:underline">
                                  {booking.phone}
                                </a>
                              </span>
                            )}
                            {booking.country && (
                              <span className="flex items-center gap-1">
                                <Globe className="h-3.5 w-3.5 text-soft-gray shrink-0" />
                                {booking.country}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Appointment Time Badge */}
                        <div
                          className={`shrink-0 rounded-2xl border px-3.5 py-2 text-right shadow-2xs ${
                            needsScheduling
                              ? 'border-amber-300 bg-amber-50/80'
                              : 'border-beige bg-white'
                          }`}
                        >
                          <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">
                            Appointment
                          </p>
                          <p className="font-serif text-sm font-semibold text-charcoal">
                            {booking.appointment_date}
                          </p>
                          <p
                            className={`text-xs font-semibold ${
                              needsScheduling ? 'text-amber-800' : 'text-sage-dark'
                            }`}
                          >
                            {booking.appointment_time === 'Unscheduled'
                              ? '⚠️ Time Unscheduled'
                              : booking.appointment_time}{' '}
                            <span className="text-[10px] text-warm-gray">({booking.time_zone})</span>
                          </p>
                        </div>
                      </div>

                      {/* Urgent Assistant Scheduling Notice */}
                      {needsScheduling && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                            <div>
                              <span className="font-semibold text-amber-900">
                                Calendar Times Not Booked
                              </span>
                              <span className="text-amber-800 ml-1 hidden sm:inline">
                                — Assistant needs to coordinate & book session times
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setManualBookingInitialData({
                                bookingId: booking.id,
                                name: booking.parent_name,
                                email: booking.email,
                                phone: booking.phone || '',
                                country: booking.country || '',
                                childName: booking.child_name || '',
                                childAge: booking.child_age || '',
                                appointmentTypeId: booking.appointment_type_id || 'initial',
                                notes: booking.notes || '',
                              });
                              setIsManualModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-800 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-amber-900 transition active:scale-95"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            <span>Schedule on Calendar</span>
                          </button>
                        </div>
                      )}

                      {/* Middle Row: Session Type, Child Info & Status Select */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage-dark">
                            <Sparkles className="h-3 w-3" />
                            {booking.appointment_type_title}
                          </span>

                          {(booking.child_name || booking.child_age) && (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-beige bg-white px-2.5 py-1 text-xs text-charcoal">
                              <Baby className="h-3 w-3 text-warm-gray" />
                              {booking.child_name ? booking.child_name : 'Child'}
                              {booking.child_age ? ` (${booking.child_age})` : ''}
                            </span>
                          )}
                        </div>

                        {/* Status Select */}
                        <div className="relative">
                          <select
                            disabled={isUpdating}
                            value={booking.status}
                            onChange={(e) =>
                              void updateStatus(booking.id, e.target.value as Booking['status'])
                            }
                            className="rounded-xl border border-beige bg-white px-3 py-1 text-xs font-semibold text-charcoal shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-sage/30 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="pending_calendar_sync">Sync Needed</option>
                          </select>
                          {isUpdating && (
                            <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-sage-dark" />
                          )}
                        </div>
                      </div>

                      {/* Discovery Intake Answers if present */}
                      {(Boolean(booking.intake_topics?.length) ||
                        Boolean(booking.intake_need) ||
                        Boolean(booking.intake_duration) ||
                        Boolean(booking.intake_suggested_package)) && (
                        <div className="space-y-1.5 rounded-xl border border-sage/30 bg-sage/5 p-2.5 text-xs text-charcoal">
                          {booking.intake_topics && booking.intake_topics.length > 0 && (
                            <div>
                              <span className="font-semibold text-warm-gray block mb-1">
                                Bringing them here:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {booking.intake_topics.map((topicId) => {
                                  const topic = discoveryTopics.find((t) => t.id === topicId);
                                  return (
                                    <span
                                      key={topicId}
                                      className="inline-block rounded-full bg-sage/20 px-2 py-0.5 text-[11px] font-semibold text-sage-dark"
                                    >
                                      {topic?.title || topicId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {booking.intake_need && (
                            <div>
                              <span className="font-semibold text-warm-gray">Wants: </span>
                              <span>
                                {intakeNeeds.find((n) => n.id === booking.intake_need)?.label ||
                                  booking.intake_need}
                              </span>
                            </div>
                          )}
                          {booking.intake_duration && (
                            <div>
                              <span className="font-semibold text-warm-gray">Felt hard for: </span>
                              <span>
                                {intakeDurations.find((d) => d.id === booking.intake_duration)?.label ||
                                  booking.intake_duration}
                              </span>
                            </div>
                          )}
                          {booking.intake_suggested_package && (
                            <div>
                              <span className="font-semibold text-warm-gray">Suggested: </span>
                              <span className="font-semibold text-terracotta">
                                {coachingPackages.find((p) => p.id === booking.intake_suggested_package)?.title ||
                                  booking.intake_suggested_package}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes if present */}
                      {booking.notes && (
                        <div className="flex items-start gap-2 rounded-xl border border-beige bg-white p-2.5 text-xs text-charcoal">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-gray" />
                          <p className="whitespace-pre-wrap leading-relaxed">{booking.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Action Triggers */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-beige/60 pt-3">
                      {needsScheduling && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualBookingInitialData({
                              bookingId: booking.id,
                              name: booking.parent_name,
                              email: booking.email,
                              phone: booking.phone || '',
                              country: booking.country || '',
                              childName: booking.child_name || '',
                              childAge: booking.child_age || '',
                              appointmentTypeId: booking.appointment_type_id || 'initial',
                              notes: booking.notes || '',
                            });
                            setIsManualModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark active:scale-95"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          <span>Schedule on Calendar</span>
                        </button>
                      )}
                      {booking.phone && (
                        <a
                          href={`https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${booking.parent_name}, this is Mai's assistant reaching out regarding your ${booking.appointment_type_title}. I am coordinating consultation dates and times for you with Mai. What days and times work best for your first session?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 shadow-2xs transition hover:bg-emerald-100"
                          title="Message client on WhatsApp to coordinate consultation dates"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp Client</span>
                        </a>
                      )}
                      {booking.status === 'pending' && !needsScheduling && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleApproveBooking(booking.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarCheck className="h-3.5 w-3.5" />}
                          <span>Approve Booking</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setRescheduleBooking(booking)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-charcoal shadow-sm transition hover:bg-beige/40"
                      >
                        <Calendar className="h-3.5 w-3.5 text-sage-dark" />
                        <span>Reschedule</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditBooking(booking)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-charcoal shadow-sm transition hover:bg-beige/40"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-warm-gray" />
                        <span>Edit Info</span>
                      </button>
                      {booking.google_meet_url && (
                        <a
                          href={booking.google_meet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-dusty-blue/15 px-3 py-1.5 text-xs font-medium text-dusty-blue-dark transition hover:bg-dusty-blue/25"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Join Google Meet</span>
                        </a>
                      )}
                      {(booking.status === 'pending_calendar_sync' || !booking.google_calendar_event_id) && (
                        <button
                          type="button"
                          onClick={() => void handleSyncCalendar(booking.id)}
                          disabled={isSyncing}
                          className="inline-flex items-center gap-1 rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-200 disabled:opacity-50"
                        >
                          <RotateCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>Sync Calendar</span>
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => void handleCancelBooking(booking)}
                          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Modals */}
      {rescheduleBooking && (
        <BookingRescheduleModal
          booking={rescheduleBooking}
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={() => void fetchBookings()}
        />
      )}

      {editBooking && (
        <BookingEditModal
          booking={editBooking}
          isOpen={Boolean(editBooking)}
          onClose={() => setEditBooking(null)}
          onUpdated={() => void fetchBookings()}
        />
      )}

      <AdminManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setManualBookingInitialData(null);
        }}
        onCreated={() => void fetchBookings()}
        initialData={manualBookingInitialData}
      />

      <AdminAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        onUpdated={() => void fetchBookings()}
      />
    </AdminLayout>
  );
};

export default AdminBookings;
