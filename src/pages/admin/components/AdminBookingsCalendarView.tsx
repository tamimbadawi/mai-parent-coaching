import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Video, Calendar, Clock, User, Sparkles } from 'lucide-react';
import type { Booking } from '../../../types';

interface AdminBookingsCalendarViewProps {
  bookings: Booking[];
  onReschedule: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onApprove?: (booking: Booking) => Promise<void> | void;
  approvingId?: string | null;
}

const statusBadgeColors: Record<Booking['status'], string> = {
  pending: 'bg-amber-400 text-amber-950',
  confirmed: 'bg-sage text-white',
  completed: 'bg-emerald-500 text-white',
  cancelled: 'bg-rose-400 text-white',
  pending_calendar_sync: 'bg-purple-400 text-white',
};

export const AdminBookingsCalendarView = ({
  bookings,
  onReschedule,
  onEdit,
  onApprove,
  approvingId,
}: AdminBookingsCalendarViewProps): JSX.Element => {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [monthStart, monthEnd]);

  // Group bookings by appointment_date
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const list = map.get(b.appointment_date) || [];
      list.push(b);
      map.set(b.appointment_date, list);
    }
    return map;
  }, [bookings]);

  const selectedDayBookings = bookingsByDate.get(selectedDayKey) || [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Monthly Grid */}
      <div className="rounded-2xl border border-beige bg-white p-5 shadow-sm lg:col-span-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal transition hover:bg-beige/50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="font-serif text-base font-semibold text-charcoal">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal transition hover:bg-beige/50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1 text-[11px] font-semibold text-soft-gray">
              {d}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, currentMonth);
            const dayBookings = bookingsByDate.get(dateKey) || [];
            const isSelected = selectedDayKey === dateKey;
            const hasPending = dayBookings.some((b) => b.status === 'pending');

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDayKey(dateKey)}
                className={`relative flex min-h-[72px] flex-col items-start justify-between rounded-xl border p-1.5 text-left transition ${
                  !inMonth
                    ? 'border-transparent bg-cream/30 text-soft-gray/40'
                    : isSelected
                    ? 'border-sage bg-sage/10 text-charcoal ring-2 ring-sage/30'
                    : 'border-beige/60 bg-cream/50 hover:border-sage/40 hover:bg-cream'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-semibold ${
                        isToday(day)
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-sage text-white'
                          : 'text-charcoal'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {hasPending && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-amber-200" title="Has pending session" />
                    )}
                  </div>
                  {dayBookings.length > 0 && (
                    <span className="rounded-full bg-sage/20 px-1.5 py-0.2 text-[9px] font-bold text-sage-dark">
                      {dayBookings.length}
                    </span>
                  )}
                </div>

                <div className="w-full space-y-1">
                  {dayBookings.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      className={`truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight ${
                        statusBadgeColors[b.status] || 'bg-beige text-charcoal'
                      }`}
                    >
                      {b.appointment_time} {b.parent_name.split(' ')[0]}
                    </div>
                  ))}
                  {dayBookings.length > 2 && (
                    <p className="text-[8px] font-semibold text-soft-gray">
                      +{dayBookings.length - 2} more
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Sidebar */}
      <div className="flex flex-col rounded-2xl border border-beige bg-white p-5 shadow-sm lg:col-span-4">
        <div className="mb-4 border-b border-beige/80 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-warm-gray">Day Agenda</p>
          <h4 className="font-serif text-base font-bold text-charcoal">
            {format(new Date(`${selectedDayKey}T12:00:00`), 'EEEE, MMMM d, yyyy')}
          </h4>
          <p className="text-xs text-soft-gray">
            {selectedDayBookings.length === 0
              ? 'No appointments scheduled'
              : `${selectedDayBookings.length} session${selectedDayBookings.length > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px]">
          {selectedDayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="mb-2 h-8 w-8 text-soft-gray/40" />
              <p className="text-xs font-medium text-soft-gray">No sessions on this date</p>
            </div>
          ) : (
            selectedDayBookings.map((b) => {
              const isPending = b.status === 'pending';
              const isApproving = approvingId === b.id;

              return (
                <div
                  key={b.id}
                  className={`rounded-xl border p-3.5 transition ${
                    isPending
                      ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50'
                      : 'border-beige bg-cream/70 hover:border-sage/40 hover:bg-cream'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                        {b.appointment_time} ({b.time_zone})
                      </span>
                      <h5 className="mt-1 font-semibold text-charcoal">{b.parent_name}</h5>
                      <p className="text-xs text-warm-gray">{b.appointment_type_title}</p>
                      {b.email && <p className="text-[11px] text-soft-gray">{b.email}</p>}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        b.status === 'confirmed'
                          ? 'bg-sage text-white'
                          : b.status === 'pending'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : b.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {b.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {b.notes && (
                    <p className="mt-2 text-xs italic text-warm-gray line-clamp-2">
                      &ldquo;{b.notes}&rdquo;
                    </p>
                  )}

                  {b.google_meet_url && (
                    <a
                      href={b.google_meet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-dusty-blue/15 px-2.5 py-1 text-xs font-medium text-dusty-blue-dark transition hover:bg-dusty-blue/25"
                    >
                      <Video className="h-3 w-3" />
                      <span>Join Google Meet</span>
                    </a>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-beige/60 pt-2.5">
                    {isPending && onApprove && (
                      <button
                        type="button"
                        disabled={isApproving}
                        onClick={() => onApprove(b)}
                        className="inline-flex items-center gap-1 rounded-lg bg-sage px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:opacity-50"
                      >
                        {isApproving ? 'Approving...' : '✓ Approve'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onReschedule(b)}
                      className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal shadow-sm transition hover:bg-beige/40"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(b)}
                      className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal shadow-sm transition hover:bg-beige/40"
                    >
                      Edit Info
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

