import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarOff, Trash2, Plus, Loader2, AlertCircle, X, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { BookingBlackout } from '../../../types';

interface AdminBlackoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBlackoutsModal = ({
  isOpen,
  onClose,
}: AdminBlackoutsModalProps): JSX.Element | null => {
  const [blackouts, setBlackouts] = useState<BookingBlackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New blackout form
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('Holiday / Out of Office');

  const fetchBlackouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('booking_blackouts')
        .select('*')
        .order('start_date', { ascending: true });

      if (fetchErr) throw fetchErr;
      setBlackouts((data as BookingBlackout[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blackout dates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchBlackouts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || submitting) return;

    if (startDate > endDate) {
      setError('Start date cannot be after end date.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from('booking_blackouts').insert([
        {
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim() || 'Unavailable',
        },
      ]);

      if (insertErr) throw insertErr;
      await fetchBlackouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add blackout date');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const { error: delErr } = await supabase.from('booking_blackouts').delete().eq('id', id);
      if (delErr) throw delErr;
      setBlackouts((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete blackout date');
    } finally {
      setDeletingId(null);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/20 text-terracotta-dark">
            <CalendarOff className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-charcoal">Blackout & Holiday Dates</h2>
            <p className="text-xs text-warm-gray">Block dates from being booked on the website</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Add Blackout Form */}
        <form onSubmit={handleAddBlackout} className="mb-5 rounded-xl border border-beige bg-cream/70 p-4">
          <p className="mb-3 text-xs font-semibold text-charcoal">Block New Date or Range</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-warm-gray">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-warm-gray">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
              />
            </div>
          </div>
          <div className="mt-2.5">
            <label className="mb-1 block text-[10px] font-medium text-warm-gray">Reason / Label</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Vacation, Holiday, Personal Time"
              className="w-full rounded-lg border border-beige bg-white px-2.5 py-1.5 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-sage py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Add Blockout Period</span>
          </button>
        </form>

        {/* Existing Blackouts List */}
        <div>
          <p className="mb-2 text-xs font-semibold text-charcoal">Active Blocked Periods ({blackouts.length})</p>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-sage" />
            </div>
          ) : blackouts.length === 0 ? (
            <p className="rounded-xl border border-beige bg-cream p-4 text-center text-xs text-soft-gray">
              No dates currently blocked. All open working hours remain available.
            </p>
          ) : (
            <div className="space-y-2">
              {blackouts.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-beige bg-white p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{b.reason}</p>
                    <p className="text-[11px] text-warm-gray">
                      {b.start_date === b.end_date
                        ? format(new Date(`${b.start_date}T12:00:00`), 'MMM d, yyyy')
                        : `${format(new Date(`${b.start_date}T12:00:00`), 'MMM d')} – ${format(
                            new Date(`${b.end_date}T12:00:00`),
                            'MMM d, yyyy'
                          )}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlackout(b.id)}
                    disabled={deletingId === b.id}
                    className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"
                    aria-label="Delete blackout"
                  >
                    {deletingId === b.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-beige/80 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-sage px-5 py-2 text-xs font-medium text-white transition hover:bg-sage-dark"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
