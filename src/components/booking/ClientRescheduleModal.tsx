import { useState, useEffect } from 'react';
import { format, isBefore, isWeekend, startOfDay } from 'date-fns';
import { Calendar, Clock, Loader2, AlertCircle, X, ArrowRight, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Booking } from '../../types';
import { appointmentTypes } from '../../data/content';
import { cn } from '../../lib/utils';

interface ClientRescheduleModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onRescheduled: () => void;
}

export const ClientRescheduleModal = ({
  booking,
  isOpen,
  onClose,
  onRescheduled,
}: ClientRescheduleModalProps): JSX.Element | null => {
  const [newDate, setNewDate] = useState(booking.appointment_date);
  const [newTime, setNewTime] = useState('');
  const [timeZone] = useState(booking.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appointment = appointmentTypes.find((a) => a.id === booking.appointment_type_id);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!isOpen || !newDate) return;

    let isCancelled = false;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-availability', {
          body: {
            date: newDate,
            appointmentTypeId: booking.appointment_type_id || 'initial',
            timeZone,
          },
        });

        const DEFAULT_TIMES = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
        if (!isCancelled) {
          if (data?.availableSlots && data.availableSlots.length > 0) {
            setAvailableSlots(data.availableSlots);
          } else {
            setAvailableSlots(DEFAULT_TIMES);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          const DEFAULT_TIMES = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
          setAvailableSlots(DEFAULT_TIMES);
        }
      } finally {
        if (!isCancelled) setLoadingSlots(false);
      }
    };

    void fetchSlots();
    return () => {
      isCancelled = true;
    };
  }, [newDate, booking.appointment_type_id, timeZone, isOpen]);

  if (!isOpen) return null;

  const handleDateChange = (dateVal: string) => {
    setNewDate(dateVal);
    setNewTime('');
    setError(null);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTime || submitting) return;

    // Disallow weekend or past date
    const parsedDate = new Date(`${newDate}T00:00:00`);
    if (isBefore(parsedDate, startOfDay(new Date())) || isWeekend(parsedDate)) {
      setError('Please choose a valid weekday date starting from today.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'reschedule',
          bookingId: booking.id,
          newDate,
          newTime,
          timeZone,
        },
      });

      if (invokeErr || data?.error) {
        setError(invokeErr?.message || data?.error || 'Rescheduling failed.');
        return;
      }

      onRescheduled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rescheduling failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-beige bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-soft-gray transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Reschedule Session</h2>
            <p className="text-xs text-warm-gray">
              {appointment?.title || booking.appointment_type_title}
            </p>
          </div>
        </div>

        {/* Current Info */}
        <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 text-xs text-amber-900">
          <p className="font-semibold">Currently scheduled for:</p>
          <p className="mt-0.5">
            {format(new Date(`${booking.appointment_date}T12:00:00`), 'EEEE, MMMM d, yyyy')} at{' '}
            <span className="font-semibold">{booking.appointment_time}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleReschedule} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-charcoal">Choose New Date</label>
            <input
              type="date"
              required
              min={today}
              value={newDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/40"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-charcoal">Available Open Times</label>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-sage/20 bg-sage/10 px-2 py-0.5 text-[10px] font-medium text-sage-dark shadow-xs"
                title={`Times are automatically shown in your local timezone (${timeZone})`}
              >
                <Globe className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate max-w-[130px]">{timeZone.replace(/_/g, ' ')}</span>
              </span>
            </div>
            {loadingSlots ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-beige bg-cream/50 py-4 text-xs text-soft-gray">
                <Loader2 className="h-4 w-4 animate-spin text-sage-dark" />
                <span>Finding open times...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-beige bg-cream/40 py-3 text-center text-xs text-warm-gray">
                No slots open on this date. Please pick another weekday.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                {availableSlots.map((slot) => {
                  const isSelected = newTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setNewTime(slot)}
                      className={cn(
                        'flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition',
                        isSelected
                          ? 'border-sage bg-sage text-white shadow-sm ring-1 ring-sage/30'
                          : 'border-beige bg-cream text-charcoal hover:border-sage/40 hover:bg-cream/80'
                      )}
                    >
                      <Clock className="h-3 w-3 opacity-60" />
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-beige/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-beige px-4 py-2 text-xs font-medium text-warm-gray transition hover:bg-beige/40 hover:text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newDate || !newTime || submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <span>Confirm New Time</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
