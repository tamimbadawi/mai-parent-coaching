import { useState } from 'react';
import { User, Mail, Phone, Globe, Baby, MessageSquare, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Booking } from '../../../types';
import { appointmentTypes } from '../../../data/content';

interface BookingEditModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const BookingEditModal = ({
  booking,
  isOpen,
  onClose,
  onUpdated,
}: BookingEditModalProps): JSX.Element | null => {
  const [formData, setFormData] = useState({
    parent_name: booking.parent_name,
    email: booking.email,
    phone: booking.phone || '',
    country: booking.country || '',
    child_name: booking.child_name || '',
    child_age: booking.child_age || '',
    notes: booking.notes || '',
    appointment_type_id: booking.appointment_type_id,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const chosenType = appointmentTypes.find((a) => a.id === formData.appointment_type_id);

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-booking-manager', {
        body: {
          action: 'edit-details',
          bookingId: booking.id,
          parent_name: formData.parent_name,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          child_name: formData.child_name,
          child_age: formData.child_age,
          notes: formData.notes,
          appointment_type_id: formData.appointment_type_id,
          appointment_type_title: chosenType?.title || booking.appointment_type_title,
        },
      });

      if (invokeErr || data?.error) {
        setError(invokeErr?.message || data?.error || 'Failed to update details.');
        return;
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-beige bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-soft-gray transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Edit Booking Details</h2>
            <p className="text-xs text-warm-gray">ID: {booking.id.slice(0, 8)}...</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Unable to update</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Parent / Client Name</label>
            <input
              type="text"
              required
              value={formData.parent_name}
              onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+20..."
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. Egypt, UAE, UK"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Session Type</label>
              <select
                value={formData.appointment_type_id}
                onChange={(e) => setFormData({ ...formData, appointment_type_id: e.target.value })}
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                {appointmentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.duration})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Child Name (optional)</label>
              <input
                type="text"
                value={formData.child_name}
                onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                placeholder="Child's name"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Child Age (optional)</label>
              <input
                type="text"
                value={formData.child_age}
                onChange={(e) => setFormData({ ...formData, child_age: e.target.value })}
                placeholder="e.g. 5 years"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Coach / Session Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Session notes, goals, or context..."
              className="w-full resize-none rounded-xl border border-beige bg-cream p-3 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
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
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
