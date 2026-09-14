import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Clock,
  User,
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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { Booking } from '../../types';
import { EmptyPanel, Panel, StatCard } from './admin-ui';

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

const AdminBookings = (): JSX.Element => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Booking['status']>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const updateStatus = async (
    id: string,
    newStatus: Booking['status']
  ): Promise<void> => {
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
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
        );
      }
    } catch (err: unknown) {
      console.error('Unexpected update error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

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
          title="Appointments & Consultations"
          eyebrow="Database Operations"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="flex rounded-2xl border border-beige bg-cream p-1 text-xs">
                {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-xl px-3 py-1.5 font-medium capitalize transition ${
                      statusFilter === tab
                        ? 'bg-white text-charcoal shadow-sm'
                        : 'text-warm-gray hover:text-charcoal'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void fetchBookings()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition hover:bg-white disabled:opacity-50"
                title="Refresh from Supabase"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          }
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-warm-gray">
              <Loader2 className="h-8 w-8 animate-spin text-sage-dark" />
              <p className="mt-3 text-sm">Loading bookings from Supabase...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <EmptyPanel
              title={statusFilter === 'all' ? 'No bookings recorded yet' : `No ${statusFilter} bookings found`}
              description="When parents book consultation sessions through the /booking portal, their appointment details, child info, and timestamps will appear here in real time."
            />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const config = statusConfig[booking.status] ?? statusConfig.pending;
                const isUpdating = updatingId === booking.id;

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
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 text-xs text-charcoal border border-beige">
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
                            <p className="leading-relaxed whitespace-pre-wrap">{booking.notes}</p>
                          </div>
                        )}
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
                            {booking.appointment_time}
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
    </AdminLayout>
  );
};

export default AdminBookings;
