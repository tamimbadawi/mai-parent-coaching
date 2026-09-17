import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Booking } from '../../types';
import { cn } from '../../lib/utils';
import { ClientRescheduleModal } from '../../components/booking/ClientRescheduleModal';
import { ClientCancelModal } from '../../components/booking/ClientCancelModal';
import DashboardLayout from './DashboardLayout';

const statusBadgeClasses: Record<Booking['status'], { label: string; className: string; dot: string }> = {
  pending: { label: 'Pending Review', className: 'bg-amber-100/80 text-amber-800 border-amber-300/80', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', className: 'bg-sage/20 text-sage-dark border-sage/40', dot: 'bg-sage-dark' },
  completed: { label: 'Completed', className: 'bg-emerald-100/80 text-emerald-800 border-emerald-300/80', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-100/80 text-rose-700 border-rose-300/80', dot: 'bg-rose-400' },
  pending_calendar_sync: { label: 'Sync Pending', className: 'bg-purple-100/80 text-purple-800 border-purple-300/80', dot: 'bg-purple-500' },
};

const MySessions = (): JSX.Element => {
  const { user } = useAuth();
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');

  // Modals
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase() || ''}`)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (!error && data) {
        setUserBookings(data as Booking[]);
      }
    } catch (err) {
      console.warn('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  // Calendar dates computation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Map of date string YYYY-MM-DD to bookings
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of userBookings) {
      if (!b.appointment_date) continue;
      const dateStr = b.appointment_date;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(b);
    }
    return map;
  }, [userBookings]);

  // Selected date's bookings
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return bookingsByDate[dateStr] ?? [];
  }, [selectedDate, bookingsByDate]);

  // Filtered bookings for list view
  const filteredListBookings = useMemo(() => {
    return userBookings.filter((b) => {
      if (filter === 'upcoming') return b.status === 'confirmed' || b.status === 'pending' || b.status === 'pending_calendar_sync';
      if (filter === 'completed') return b.status === 'completed';
      if (filter === 'cancelled') return b.status === 'cancelled';
      return true;
    });
  }, [userBookings, filter]);

  const upcomingCount = useMemo(() => userBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'completed').length, [userBookings]);

  const headerAction = (
    <div className="flex items-center gap-2">
      {/* View Switcher Toggle */}
      <div className="flex rounded-full border border-beige/80 bg-cream/80 p-1">
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            viewMode === 'calendar' ? 'bg-sage text-white shadow-xs' : 'text-warm-gray hover:text-charcoal'
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>Calendar</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            viewMode === 'list' ? 'bg-sage text-white shadow-xs' : 'text-warm-gray hover:text-charcoal'
          )}
        >
          <List className="h-3.5 w-3.5" />
          <span>List View</span>
        </button>
      </div>

      <Link
        to="/booking"
        className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Book Session</span>
      </Link>
    </div>
  );

  return (
    <DashboardLayout
      activeTab="sessions"
      sessionCount={upcomingCount}
    >
      <div className="h-full flex flex-col justify-between min-h-0 gap-3 overflow-hidden">
        {/* Header Bar with Standard Fonts & Actions */}
        <div className="flex items-center justify-between rounded-2xl border border-beige/80 bg-white/90 px-4 py-2 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 text-sage-dark" />
            <h1 className="font-serif text-lg sm:text-xl text-charcoal font-medium">My Sessions</h1>
            <span className="hidden sm:inline-block rounded-full bg-sage/15 px-2.5 py-0.5 text-xs font-semibold text-sage-dark">
              {upcomingCount} upcoming
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switcher Toggle */}
            <div className="flex rounded-xl border border-beige/80 bg-cream/70 p-1">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition',
                  viewMode === 'calendar' ? 'bg-sage text-white shadow-xs' : 'text-warm-gray hover:text-charcoal'
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition',
                  viewMode === 'list' ? 'bg-sage text-white shadow-xs' : 'text-warm-gray hover:text-charcoal'
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
            </div>

            <Link
              to="/booking"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sage px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Book Session</span>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-beige/80 bg-white/90 p-8 text-sm text-warm-gray shadow-xs">
            <span>Loading coaching sessions...</span>
          </div>
        ) : viewMode === 'calendar' ? (
          /* ═══════════════════════════════════════════════════════════
             CALENDAR VIEW MODE (Strict zero-scroll, standard fonts)
             ═══════════════════════════════════════════════════════════ */
          <div className="grid gap-3 lg:grid-cols-12 flex-1 min-h-0 items-stretch overflow-hidden">
            {/* Main Calendar Month Grid */}
            <div className="lg:col-span-7 xl:col-span-8 rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs flex flex-col justify-between overflow-hidden">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between pb-2 border-b border-beige/60 shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg text-charcoal font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setSelectedDate(new Date());
                    }}
                    className="rounded-lg border border-beige/80 bg-cream/50 px-2 py-0.5 text-xs font-medium text-warm-gray hover:text-charcoal hover:bg-cream transition"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                    className="rounded-xl border border-beige/80 p-1.5 text-warm-gray hover:text-charcoal hover:bg-cream transition"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                    className="rounded-xl border border-beige/80 p-1.5 text-warm-gray hover:text-charcoal hover:bg-cream transition"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="my-1.5 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wider text-warm-gray shrink-0">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
                {calendarDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayBookings = bookingsByDate[dateStr] ?? [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isToday = isSameDay(day, new Date());
                  const hasBookings = dayBookings.length > 0;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'h-full min-h-[30px] rounded-lg p-1 flex flex-col justify-between items-center transition relative border text-left',
                        !isCurrentMonth && 'opacity-25 bg-cream/20 border-transparent',
                        isCurrentMonth && !isSelected && 'bg-white/80 border-beige/60 hover:border-sage/40 hover:bg-cream/40',
                        isSelected && 'bg-sage/15 border-sage text-sage-dark font-bold shadow-xs',
                        isToday && !isSelected && 'border-sage/60 font-semibold'
                      )}
                    >
                      <span className={cn('text-xs leading-none', isSelected ? 'text-sage-dark font-bold' : isToday ? 'text-sage font-bold' : 'text-charcoal')}>
                        {format(day, 'd')}
                      </span>

                      {/* Dot indicators for bookings */}
                      {hasBookings && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {dayBookings.slice(0, 3).map((b) => {
                            const badge = statusBadgeClasses[b.status] || statusBadgeClasses.pending;
                            return (
                              <span
                                key={b.id}
                                className={cn('h-1.5 w-1.5 rounded-full shadow-xs', badge.dot)}
                                title={`${b.appointment_type_title} (${badge.label})`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="pt-2 border-t border-beige/60 flex flex-wrap items-center gap-4 text-xs text-warm-gray shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sage-dark" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>Cancelled</span>
                </div>
              </div>
            </div>

            {/* Selected Date Sessions Sidebar Panel */}
            <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-beige/80 bg-white/90 backdrop-blur-md p-3.5 shadow-xs flex flex-col justify-between overflow-hidden">
              <div className="pb-2 border-b border-beige/60 shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base text-charcoal font-medium">
                    {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select date'}
                  </h3>
                  <p className="text-xs text-warm-gray">
                    {selectedDateBookings.length} {selectedDateBookings.length === 1 ? 'session' : 'sessions'}
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto my-2 space-y-2 pr-0.5">
                {selectedDateBookings.length > 0 ? (
                  selectedDateBookings.map((b) => {
                    const badge = statusBadgeClasses[b.status] || statusBadgeClasses.pending;
                    const canModify = b.status !== 'cancelled' && b.status !== 'completed';

                    return (
                      <div
                        key={b.id}
                        className="rounded-xl border border-beige/80 bg-cream/40 p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <h4 className="font-serif text-sm font-medium text-charcoal truncate">
                              {b.appointment_type_title}
                            </h4>
                            <p className="text-xs text-warm-gray">With Mai Elbadawy</p>
                          </div>
                          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', badge.className)}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-warm-gray">
                          <Clock className="h-3.5 w-3.5 text-sage-dark shrink-0" />
                          <span className="text-charcoal font-medium">{b.appointment_time}</span>
                          <span>({b.time_zone})</span>
                        </div>

                        {b.notes && (
                          <p className="text-xs text-warm-gray italic bg-white/80 p-1.5 rounded-lg border border-beige/50 line-clamp-1">
                            &ldquo;{b.notes}&rdquo;
                          </p>
                        )}

                        <div className="pt-2 border-t border-beige/60 flex items-center justify-between gap-1 text-xs">
                          {b.google_meet_url && b.status === 'confirmed' ? (
                            <a
                              href={b.google_meet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2.5 py-1 text-xs font-semibold text-sage-dark hover:bg-sage/30 transition"
                            >
                              <Video className="h-3 w-3" /> Join Meet
                            </a>
                          ) : (
                            <span className="text-xs text-warm-gray">
                              {b.status === 'pending' ? 'Pending review' : 'Scheduled'}
                            </span>
                          )}

                          {canModify && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setRescheduleBooking(b)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-charcoal border border-beige/80 hover:bg-sage hover:text-white transition shadow-xs"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelBooking(b)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition shadow-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center rounded-xl border border-dashed border-beige bg-cream/20 p-4 text-center">
                    <CalendarDays className="mb-2 h-6 w-6 text-sage/40" />
                    <p className="text-sm font-medium text-charcoal">No sessions on this date</p>
                    <p className="text-xs text-warm-gray mt-1">
                      Select another day or schedule a session with Mai.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-beige/60 shrink-0">
                <Link
                  to="/booking"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sage py-2 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Book New Session
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════
             LIST VIEW MODE (Strict fit, standard fonts)
             ═══════════════════════════════════════════════════════════ */
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-hidden">
            {/* Filter Tabs */}
            <div className="flex gap-1.5 rounded-xl border border-beige/80 bg-cream/70 p-1 w-fit shrink-0">
              {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFilter(opt)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-medium capitalize transition',
                    filter === opt ? 'bg-sage text-white shadow-xs' : 'text-warm-gray hover:text-charcoal'
                  )}
                >
                  {opt === 'all' ? 'All Sessions' : opt}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {filteredListBookings.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredListBookings.map((b) => {
                    const badge = statusBadgeClasses[b.status] || statusBadgeClasses.pending;
                    const canModify = b.status !== 'cancelled' && b.status !== 'completed';

                    return (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-beige/80 bg-white/90 p-3.5 shadow-xs space-y-2.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h3 className="font-serif text-sm font-medium text-charcoal truncate">
                              {b.appointment_type_title}
                            </h3>
                            <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', badge.className)}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-center gap-2 text-xs text-warm-gray">
                            <span className="flex items-center gap-1 font-medium text-charcoal">
                              <CalendarIcon className="h-3.5 w-3.5 text-sage-dark" />
                              {b.appointment_date}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-medium text-charcoal">
                              <Clock className="h-3.5 w-3.5 text-sage-dark" />
                              {b.appointment_time}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-beige/60 flex items-center justify-between gap-1 text-xs">
                          {b.google_meet_url && b.status === 'confirmed' ? (
                            <a
                              href={b.google_meet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-sage/20 px-2.5 py-1 text-xs font-semibold text-sage-dark transition hover:bg-sage/30"
                            >
                              <Video className="h-3 w-3" /> Join Meet
                            </a>
                          ) : (
                            <span className="text-xs text-warm-gray">Scheduled</span>
                          )}

                          {canModify && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setRescheduleBooking(b)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-charcoal border border-beige/80 hover:bg-sage hover:text-white transition"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelBooking(b)}
                                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-beige bg-white/80 p-8 text-center shadow-xs">
                  <CalendarDays className="mb-2 h-7 w-7 text-sage/50" />
                  <p className="text-sm font-medium text-charcoal">No sessions found in this filter</p>
                  <Link
                    to="/booking"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sage-dark transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Book Session
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {rescheduleBooking && (
        <ClientRescheduleModal
          booking={rescheduleBooking}
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          onRescheduled={async () => {
            await fetchBookings();
            setRescheduleBooking(null);
          }}
        />
      )}

      {cancelBooking && (
        <ClientCancelModal
          booking={cancelBooking}
          isOpen={Boolean(cancelBooking)}
          onClose={() => setCancelBooking(null)}
          onCancelled={async () => {
            await fetchBookings();
            setCancelBooking(null);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default MySessions;
