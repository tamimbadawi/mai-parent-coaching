import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Booking } from '../../../types';
import { appointmentTypes } from '../../../data/content';
import { cn } from '../../../lib/utils';
import { BookableMonthCalendar } from '../../../components/booking/BookableMonthCalendar';

interface BookingRescheduleModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onRescheduled: () => void;
}

export const BookingRescheduleModal = ({
  booking,
  isOpen,
  onClose,
  onRescheduled,
}: BookingRescheduleModalProps): JSX.Element | null => {
  const [newDate, setNewDate] = useState(booking.appointment_date);
  const [newTime, setNewTime] = useState('');
  const [timeZone] = useState(booking.time_zone || 'Africa/Cairo');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appointment = appointmentTypes.find((a) => a.id === booking.appointment_type_id);

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
            appointmentTypeId: booking.appointment_type_id,
            timeZone,
          },
        });

        if (!isCancelled) {
          if (fnError || data?.error) {
            setError(fnError?.message || data?.error || 'Could not fetch open slots.');
            setAvailableSlots([]);
          } else if (data?.availableSlots) {
            setAvailableSlots(data.availableSlots);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Availability lookup failed');
          setAvailableSlots([]);
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

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTime || submitting) return;

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
      setError(err instanceof Error ? err.message : 'Rescheduling failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl border border-beige bg-white p-4 sm:p-5 shadow-2xl flex flex-col justify-between">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-soft-gray transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-2.5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif text-base sm:text-lg font-semibold text-charcoal">Reschedule Appointment</h2>
            <p className="text-[11px] sm:text-xs text-warm-gray">
              {booking.parent_name} • {appointment?.title || booking.appointment_type_title}
            </p>
          </div>
        </div>

        {/* Current Info */}
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-900">
          <span className="font-semibold text-[11px]">Current Booking: </span>
          <span className="text-xs">
            {format(new Date(`${booking.appointment_date}T12:00:00`), 'EEE, MMM d, yyyy')} at{' '}
            <span className="font-semibold">{booking.appointment_time}</span> ({booking.time_zone})
          </span>
        </div>

        {error && (
          <div className="mb-2.5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold text-[11px]">Unable to reschedule</p>
              <p className="text-[11px] text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleReschedule} className="flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">New Date</label>
              <BookableMonthCalendar
                appointmentTypeId={booking.appointment_type_id || 'initial'}
                timeZone={timeZone}
                selectedDate={newDate}
                onSelectDate={(date) => {
                  setNewDate(date);
                  setNewTime('');
                }}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-charcoal">Select New Available Time</label>
                {loadingSlots && (
                  <div className="flex items-center gap-1 text-[10px] text-sage-dark">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Checking...</span>
                  </div>
                )}
              </div>

              {!loadingSlots && availableSlots.length === 0 ? (
                <p className="rounded-xl border border-beige bg-cream p-3 text-center text-xs text-soft-gray">
                  No open slots available on this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {availableSlots.map((slot) => {
                    const isSelected = newTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className={cn(
                          'flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition',
                          isSelected
                            ? 'bg-sage text-white shadow-xs ring-1 ring-sage/30'
                            : 'border border-beige bg-cream text-charcoal hover:border-sage/40'
                        )}
                      >
                        <Clock className="h-2.5 w-2.5 opacity-60" />
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2 border-t border-beige/80 pt-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-beige px-3.5 py-1.5 text-xs font-medium text-charcoal transition hover:bg-beige/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newDate || !newTime || submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3" />
                  <span>Confirm Reschedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
