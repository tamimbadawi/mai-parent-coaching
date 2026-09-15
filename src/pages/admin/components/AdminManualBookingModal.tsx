import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { appointmentTypes } from '../../../data/content';

interface AdminManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const AdminManualBookingModal = ({
  isOpen,
  onClose,
  onCreated,
}: AdminManualBookingModalProps): JSX.Element | null => {
  const [selectedType, setSelectedType] = useState('initial');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('');
  const [timeZone, setTimeZone] = useState('Africa/Cairo');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    childName: '',
    childAge: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAppointment = appointmentTypes.find((a) => a.id === selectedType);

  useEffect(() => {
    if (!isOpen || !date) return;

    let isCancelled = false;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-availability', {
          body: {
            date,
            appointmentTypeId: selectedType,
            timeZone,
          },
        });

        if (!isCancelled) {
          if (fnError || data?.error) {
            setError(fnError?.message || data?.error || 'Could not fetch availability.');
            setAvailableSlots([]);
          } else if (data?.availableSlots) {
            setAvailableSlots(data.availableSlots);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Availability error');
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
  }, [date, selectedType, timeZone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !formData.name || !formData.email || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('create-booking', {
        body: {
          appointment_type_id: selectedType,
          appointment_type_title: selectedAppointment?.title || 'Initial Consultation',
          appointment_date: date,
          appointment_time: time,
          timeZone,
          parent_name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          country: formData.country.trim() || null,
          child_name: formData.childName.trim() || null,
          child_age: formData.childAge.trim() || null,
          notes: formData.notes.trim() || null,
        },
      });

      if (invokeErr || data?.error) {
        setError(invokeErr?.message || data?.error || 'Failed to create booking.');
        return;
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-beige bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-soft-gray transition hover:bg-beige/50 hover:text-charcoal"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage/20 text-sage-dark">
            <CalendarPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Add Manual Booking</h2>
            <p className="text-xs text-warm-gray">Schedule a session for phone or direct clients</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Booking could not be created</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Session Type</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setTime('');
                }}
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                {appointmentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.duration})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime('');
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-charcoal">Time Slot</label>
              {loadingSlots && (
                <div className="flex items-center gap-1 text-[10px] text-sage-dark">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading open times...</span>
                </div>
              )}
            </div>

            {!loadingSlots && availableSlots.length === 0 ? (
              <p className="rounded-xl border border-beige bg-cream p-3 text-center text-xs text-soft-gray">
                No slots available on this date.
              </p>
            ) : (
              <div className="grid max-h-32 grid-cols-4 gap-1.5 overflow-y-auto p-1">
                {availableSlots.map((slot) => {
                  const isSelected = time === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-medium transition ${
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

          <div className="grid grid-cols-2 gap-3 border-t border-beige/80 pt-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Parent / Client Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Parent's full name"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Phone (optional)</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+20..."
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Country (optional)</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g. Egypt"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Child Name (optional)</label>
              <input
                type="text"
                value={formData.childName}
                onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                placeholder="Child's name"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-charcoal">Child Age (optional)</label>
              <input
                type="text"
                value={formData.childAge}
                onChange={(e) => setFormData({ ...formData, childAge: e.target.value })}
                placeholder="e.g. 4 years"
                className="w-full rounded-xl border border-beige bg-cream px-3 py-2 text-xs font-medium text-charcoal transition focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-charcoal">Notes (optional)</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Session details..."
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
              disabled={!date || !time || !formData.name || !formData.email || submitting}
              className="inline-flex items-center gap-1.5 rounded-full bg-sage px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Booking...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Create Booking & Sync</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
