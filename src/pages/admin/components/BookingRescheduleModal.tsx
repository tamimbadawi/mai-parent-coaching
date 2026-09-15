import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Booking } from '../../../types';
import { appointmentTypes } from '../../../data/content';

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
  const [timeZone, setTimeZone] = useState(booking.time_zone || 'Africa/Cairo');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-beige bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-soft-gray transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Reschedule Appointment</h2>
            <p className="text-xs text-warm-gray">
              {booking.parent_name} • {appointment?.title || booking.appointment_type_title}
            </p>
          </div>
        </div>

        {/* Current Info */}
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
          <p className="font-semibold">Current Booking:</p>
          <p className="mt-0.5">
            {format(new Date(`${booking.appointment_date}T12:00:00`), 'EEEE, MMMM d, yyyy')} at{' '}
            <span className="font-semibold">{booking.appointment_time}</span> ({booking.time_zone})
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Unable to reschedule</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleReschedule} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">New Date</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setNewTime('');
              }}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-charcoal">Select New Available Time</label>
              {loadingSlots && (
                <div className="flex items-center gap-1 text-[10px] text-sage-dark">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Checking open slots...</span>
                </div>
              )}
            </div>

            {!loadingSlots && availableSlots.length === 0 ? (
              <p className="rounded-xl border border-beige bg-cream p-3 text-center text-xs text-soft-gray">
                No open slots available on this date. Please pick another date.
              </p>
            ) : (
              <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = newTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setNewTime(slot)}
                      className={`flex items-center justify-center rounded-lg py-2 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-sage text-white shadow-sm ring-1 ring-sage/30'
                          : 'border border-beige bg-cream text-charcoal hover:border-sage/40'
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-beige/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-beige px-4 py-2 text-xs font-medium text-charcoal transition hover:bg-beige/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newDate || !newTime || submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
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
