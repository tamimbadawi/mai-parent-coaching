import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  Mail,
  Phone,
  Globe,
  Baby,
  FileText,
  AlertCircle,
  Loader2,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Search,
  Plus,
  CalendarOff,
  LayoutList,
  Calendar as CalendarIcon,
  Video,
  Edit2,
  Calendar,
  XCircle,
  RotateCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { Booking } from '../../types';
import { EmptyPanel, Panel, StatCard } from './admin-ui';
import { BookingRescheduleModal } from './components/BookingRescheduleModal';
import { BookingEditModal } from './components/BookingEditModal';
import { AdminManualBookingModal } from './components/AdminManualBookingModal';
import { AdminBlackoutsModal } from './components/AdminBlackoutsModal';
import { AdminBookingsCalendarView } from './components/AdminBookingsCalendarView';

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

const AdminBookings = (): JSX.Element => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Booking['status']>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modals state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isBlackoutsModalOpen, setIsBlackoutsModalOpen] = useState(false);

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
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;

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

  return (
    <AdminLayout title="Consultation Bookings">
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={CalendarDays}
            label="Total Bookings"
            value={totalCount}
            detail="All consultation and coaching sessions requested to date."
            tone="sage"
          />
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
                onClick={() => setIsManualModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-sage px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Booking</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBlackoutsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-beige bg-white px-3.5 py-2 text-xs font-medium text-charcoal shadow-sm transition hover:bg-cream"
              >
                <CalendarOff className="h-3.5 w-3.5 text-terracotta" />
                <span>Blackout Dates</span>
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
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
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
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const config = statusConfig[booking.status] ?? statusConfig.pending;
                const isUpdating = updatingId === booking.id;
                const isSyncing = syncingId === booking.id;

                return (
                  <article
                    key={booking.id}
                    className="rounded-[24px] border border-beige bg-cream/70 p-5 transition-all hover:bg-cream"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      {/* Left: Client & Session Info */}
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-lg font-semibold text-charcoal">
                            {booking.parent_name}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${config.badge}`}
                          >
                            {config.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-warm-gray">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-soft-gray" />
                            <a href={`mailto:${booking.email}`} className="text-charcoal hover:underline">
                              {booking.email}
                            </a>
                          </span>
                          {booking.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-soft-gray" />
                              <a href={`tel:${booking.phone}`} className="text-charcoal hover:underline">
                                {booking.phone}
                              </a>
                            </span>
                          )}
                          {booking.country && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5 text-soft-gray" />
                              {booking.country}
                            </span>
                          )}
                        </div>

                        {/* Session Type & Child Info */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
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

                        {/* Notes if present */}
                        {booking.notes && (
                          <div className="mt-2 flex items-start gap-2 rounded-xl border border-beige bg-white p-3 text-xs text-charcoal">
                            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warm-gray" />
                            <p className="whitespace-pre-wrap leading-relaxed">{booking.notes}</p>
                          </div>
                        )}

                        {/* Quick Action Triggers */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
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
                      </div>

                      {/* Right: Date, Time & Status Dropdown */}
                      <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                        <div className="rounded-2xl border border-beige bg-white px-4 py-2.5 text-left lg:text-right">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">
                            Appointment
                          </p>
                          <p className="mt-0.5 font-serif text-sm font-semibold text-charcoal">
                            {booking.appointment_date}
                          </p>
                          <p className="text-xs font-medium text-sage-dark">
                            {booking.appointment_time} ({booking.time_zone})
                          </p>
                        </div>

                        {/* Status Select */}
                        <div className="relative">
                          <select
                            disabled={isUpdating}
                            value={booking.status}
                            onChange={(e) =>
                              void updateStatus(booking.id, e.target.value as Booking['status'])
                            }
                            className="rounded-2xl border border-beige bg-white px-3.5 py-2 text-xs font-medium text-charcoal shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sage/30 disabled:opacity-50"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="pending_calendar_sync">Sync Needed</option>
                          </select>
                          {isUpdating && (
                            <Loader2 className="absolute right-2 top-2.5 h-3.5 w-3.5 animate-spin text-sage-dark" />
                          )}
                        </div>
                      </div>
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
        onClose={() => setIsManualModalOpen(false)}
        onCreated={() => void fetchBookings()}
      />

      <AdminBlackoutsModal
        isOpen={isBlackoutsModalOpen}
        onClose={() => setIsBlackoutsModalOpen(false)}
      />
    </AdminLayout>
  );
};

export default AdminBookings;
