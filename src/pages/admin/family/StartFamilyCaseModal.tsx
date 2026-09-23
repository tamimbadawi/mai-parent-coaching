import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Loader2, AlertCircle, Users, Sparkles, Home } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { HouseholdMemberRole } from '../../../types/family';

export interface StartFamilyCaseClient {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

interface StartFamilyCaseModalProps {
  client: StartFamilyCaseClient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (householdId: string, clientId: string) => void;
}

type BookingRow = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  parent_name: string;
  email: string;
  child_name: string | null;
  child_age: string | null;
  google_meet_url: string | null;
  status: string;
};

function deriveBirthYear(childAge: string): number | null {
  const num = parseInt(childAge, 10);
  if (Number.isNaN(num)) return null;
  return new Date().getFullYear() - num;
}

export const StartFamilyCaseModal: React.FC<StartFamilyCaseModalProps> = ({
  client,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState('');
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !client) return;

    const defaultName = `${client.full_name || client.email || 'New'} Family`.trim();
    setFamilyName(defaultName);
    setError(null);
    setLoadingBookings(true);

    supabase
      .from('bookings')
      .select('id, appointment_date, appointment_time, parent_name, email, child_name, child_age, google_meet_url, status')
      .eq('user_id', client.id)
      .order('appointment_date', { ascending: false })
      .then(({ data, error: bErr }) => {
        setLoadingBookings(false);
        if (bErr) {
          setError(bErr.message);
          return;
        }
        const rows = (data ?? []) as BookingRow[];
        setBookings(rows);
        // Pre-select completed and confirmed bookings
        setSelectedBookingIds(
          rows
            .filter((b) => b.status === 'completed' || b.status === 'confirmed')
            .map((b) => b.id)
        );
      });
  }, [isOpen, client]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Preview seeded children from selected bookings
  const previewChildren = useMemo(() => {
    const selected = bookings.filter((b) => selectedBookingIds.includes(b.id));
    const map = new Map<string, string | null>();
    selected.forEach((b) => {
      if (b.child_name) {
        map.set(b.child_name, b.child_age);
      }
    });
    return Array.from(map.entries());
  }, [bookings, selectedBookingIds]);

  const toggleBooking = (id: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!client || !familyName.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create household row
      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({
          family_name: familyName.trim(),
          primary_contact_profile_id: client.id,
          status: 'active',
        })
        .select()
        .single();

      if (hErr) throw hErr;

      // 2. Seed members
      const bookingsToConvert = bookings.filter((b) => selectedBookingIds.includes(b.id));
      const memberIds: string[] = [];

      const parentName = bookingsToConvert[0]?.parent_name || client.full_name || 'Mother';
      const { data: mother, error: mErr } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          full_name: parentName,
          role: 'mother' as HouseholdMemberRole,
        })
        .select()
        .single();

      if (mErr) throw mErr;
      if (mother) memberIds.push(mother.id);

      // Seed distinct children
      const distinctChildren = new Map<string, string | null>();
      for (const b of bookingsToConvert) {
        if (b.child_name) distinctChildren.set(b.child_name, b.child_age);
      }
      for (const [childName, childAge] of distinctChildren) {
        const birthYear = childAge ? deriveBirthYear(childAge) : null;
        const { data: child, error: cErr } = await supabase
          .from('household_members')
          .insert({
            household_id: household.id,
            full_name: childName,
            role: 'child' as HouseholdMemberRole,
            birth_year: birthYear,
          })
          .select()
          .single();

        if (cErr) throw cErr;
        if (child) memberIds.push(child.id);
      }

      // 3. Seed case sessions from selected bookings
      for (const booking of bookingsToConvert) {
        const { data: session, error: sErr } = await supabase
          .from('case_sessions')
          .insert({
            household_id: household.id,
            booking_id: booking.id,
            session_date: new Date(`${booking.appointment_date}T00:00:00`).toISOString(),
            google_meet_url: booking.google_meet_url,
            status: booking.status === 'completed' ? 'completed' : 'scheduled',
          })
          .select()
          .single();

        if (sErr) throw sErr;
        if (session && memberIds.length > 0) {
          await supabase.from('session_attendees').insert(
            memberIds.map((memberId) => ({
              session_id: session.id,
              household_member_id: memberId,
            }))
          );
        }
      }

      onClose();
      if (onSuccess) {
        onSuccess(household.id, client.id);
      } else {
        navigate(`/admin/sessions?client=${client.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create family case:', err);
      setError(err.message || 'Failed to create family case.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-beige/80 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-beige/70 bg-[#faf8f4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sage/20 border border-sage/40 flex items-center justify-center text-sage-dark shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-charcoal">
                Start Family Case
              </h3>
              <p className="text-xs text-warm-gray">
                {client.full_name || client.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-warm-gray hover:text-charcoal rounded-xl hover:bg-beige/40 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Family Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sage-dark" />
              Family Name
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. Al-Mansoor Family"
              className="w-full text-sm p-3 rounded-xl bg-[#faf8f4] border border-beige/80 focus:bg-white focus:outline-hidden focus:border-sage-dark font-medium"
            />
          </div>

          {/* Seeded Members Preview */}
          <div className="p-3 rounded-xl bg-[#faf8f4] border border-beige/70 space-y-2">
            <span className="text-[11px] font-semibold text-charcoal/70 uppercase tracking-wider">
              Automatic Member Seeding
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-white border border-beige text-charcoal font-medium">
                {client.full_name || 'Parent'} (Mother)
              </span>
              {previewChildren.map(([cName, cAge]) => (
                <span
                  key={cName}
                  className="px-2 py-0.5 rounded-md bg-white border border-beige text-charcoal font-medium"
                >
                  {cName} (Child{cAge ? `, age ${cAge}` : ''})
                </span>
              ))}
            </div>
          </div>

          {/* Booking History Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sage-dark" />
                Seed from Past Bookings ({bookings.length})
              </label>
              <span className="text-[11px] text-warm-gray">
                {selectedBookingIds.length} selected
              </span>
            </div>

            {loadingBookings ? (
              <div className="py-6 text-center text-xs text-warm-gray flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-dark" />
                <span>Loading bookings...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-beige bg-[#faf8f4] text-center text-xs text-warm-gray">
                No bookings found for this client. A blank active family case will be initialized.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {bookings.map((b) => {
                  const isChecked = selectedBookingIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer text-xs ${
                        isChecked
                          ? 'border-sage/60 bg-sage/5 text-charcoal'
                          : 'border-beige/70 bg-[#faf8f4] text-warm-gray hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBooking(b.id)}
                        className="mt-0.5 rounded text-sage-dark focus:ring-sage"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-charcoal">
                            {b.appointment_date} · {b.appointment_time}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white border border-beige">
                            {b.status}
                          </span>
                        </div>
                        {b.child_name && (
                          <p className="text-[11px] text-warm-gray mt-0.5">
                            Child: {b.child_name} {b.child_age ? `(${b.child_age} yrs)` : ''}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-beige/70 bg-[#faf8f4] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-beige bg-white text-charcoal hover:bg-beige/30 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting || !familyName.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-charcoal text-white hover:bg-charcoal/90 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sage" />
                <span>Initializing Case...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sage" />
                <span>Create Family Case</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartFamilyCaseModal;
