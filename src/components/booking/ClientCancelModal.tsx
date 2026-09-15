import { useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Booking } from '../../types';
import { appointmentTypes } from '../../data/content';

interface ClientCancelModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export const ClientCancelModal = ({
  booking,
  isOpen,
  onClose,
  onCancelled,
}: ClientCancelModalProps): JSX.Element | null => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appointment = appointmentTypes.find((a) => a.id === booking.appointment_type_id);

  if (!isOpen) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'cancel',
          bookingId: booking.id,
          reason: reason.trim() || 'Cancelled by client',
        },
      });

      if (invokeErr || data?.error) {
        setError(invokeErr?.message || data?.error || 'Failed to cancel appointment.');
        return;
      }

      onCancelled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment. Please try again.');
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Cancel Session</h2>
            <p className="text-xs text-warm-gray">
              {appointment?.title || booking.appointment_type_title}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-beige bg-cream/70 p-3 text-xs text-charcoal">
          <p className="text-warm-gray">You are about to cancel this session:</p>
          <p className="mt-1 font-medium text-charcoal">
            <Calendar className="mr-1 inline-block h-3.5 w-3.5 text-soft-gray" />
            {format(new Date(`${booking.appointment_date}T12:00:00`), 'EEEE, MMMM d, yyyy')} at {booking.appointment_time}
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

        <form onSubmit={handleCancel} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-charcoal">
              Reason for cancelling <span className="font-normal text-soft-gray">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Schedule conflict, ill, etc..."
              className="w-full resize-none rounded-xl border border-beige bg-cream px-3 py-2 text-xs text-charcoal transition focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-beige/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-beige px-4 py-2 text-xs font-medium text-warm-gray transition hover:bg-beige/40 hover:text-charcoal"
            >
              Keep Booking
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
