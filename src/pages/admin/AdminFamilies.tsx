import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLayout from './AdminLayout';
import type { HouseholdMemberRole } from '../../types/family';

type ClientResult = { id: string; full_name: string | null; email: string | null };
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

// A family case is always a spinoff of a real client account, so this page only ever
// makes sense reached from a client (e.g. "View Family Case" in the CRM dossier). It
// either redirects straight to that client's existing case, or — if none exists yet —
// shows the one-step wizard to create one from their real booking history.
export const AdminFamilies = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const linkedClientId = searchParams.get('client');
  const linkedName = searchParams.get('name');
  const linkedEmail = searchParams.get('email');
  const selectedClient: ClientResult | null = linkedClientId
    ? { id: linkedClientId, full_name: linkedName, email: linkedEmail }
    : null;

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientBookings, setClientBookings] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // No client context at all — nothing to show here, send back to the CRM hub.
  useEffect(() => {
    if (!linkedClientId) {
      navigate('/admin/crm', { replace: true });
    }
  }, [linkedClientId, navigate]);

  // If this client already has a family case, go straight to it instead of re-creating.
  useEffect(() => {
    if (!linkedClientId) return;
    setChecking(true);
    supabase
      .from('households')
      .select('id')
      .eq('primary_contact_profile_id', linkedClientId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          navigate(`/admin/families/${data.id}`, { replace: true });
        } else {
          setChecking(false);
        }
      });
  }, [linkedClientId, navigate]);

  // Pull the client's real booking history to seed household members/sessions from.
  useEffect(() => {
    if (!linkedClientId) return;
    setLoadingBookings(true);
    supabase
      .from('bookings')
      .select('id, appointment_date, appointment_time, parent_name, email, child_name, child_age, google_meet_url, status')
      .eq('user_id', linkedClientId)
      .order('appointment_date', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as BookingRow[];
        setClientBookings(rows);
        setSelectedBookingIds(rows.filter((b) => b.status === 'completed' || b.status === 'confirmed').map((b) => b.id));
        setLoadingBookings(false);
      });
  }, [linkedClientId]);

  const toggleBooking = (id: string): void => {
    setSelectedBookingIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const handleCreate = async (): Promise<void> => {
    if (!selectedClient) return;
    setSubmitting(true);
    setError(null);
    try {
      const familyName = `${selectedClient.full_name || selectedClient.email || 'New'} Family`;

      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({
          family_name: familyName,
          primary_contact_profile_id: selectedClient.id,
          status: 'active',
        })
        .select()
        .single();
      if (hErr) throw hErr;

      // Seed household members from the real booking data, then link every seeded
      // member to every seeded session so the connections are visible from creation.
      const bookingsToConvert = clientBookings.filter((b) => selectedBookingIds.includes(b.id));
      const memberIds: string[] = [];

      const parentName = bookingsToConvert[0]?.parent_name || selectedClient.full_name;
      if (parentName) {
        const { data: mother } = await supabase
          .from('household_members')
          .insert({ household_id: household.id, full_name: parentName, role: 'mother' as HouseholdMemberRole })
          .select()
          .single();
        if (mother) memberIds.push(mother.id);
      }

      const distinctChildren = new Map<string, string | null>();
      for (const b of bookingsToConvert) {
        if (b.child_name) distinctChildren.set(b.child_name, b.child_age);
      }
      for (const [childName, childAge] of distinctChildren) {
        const birthYear = childAge ? deriveBirthYear(childAge) : null;
        const { data: child } = await supabase
          .from('household_members')
          .insert({ household_id: household.id, full_name: childName, role: 'child' as HouseholdMemberRole, birth_year: birthYear })
          .select()
          .single();
        if (child) memberIds.push(child.id);
      }

      for (const booking of bookingsToConvert) {
        const { data: session } = await supabase
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
        if (session && memberIds.length > 0) {
          await supabase
            .from('session_attendees')
            .insert(memberIds.map((memberId) => ({ session_id: session.id, household_member_id: memberId })));
        }
      }

      navigate(`/admin/families/${household.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to create family case.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!linkedClientId || checking) {
    return (
      <AdminLayout title="Family Case" subtitle="Checking for an existing case...">
        <div className="flex flex-col items-center justify-center py-16 text-warm-gray">
          <Loader2 className="h-8 w-8 animate-spin text-sage-dark mb-3" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="New Family Case"
      subtitle={`A spinoff of ${selectedClient?.full_name || selectedClient?.email || 'this client'}'s real account — pick which of their bookings become case sessions.`}
    >
      <div className="max-w-lg mx-auto space-y-4">
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Unable to create family case</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-beige/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between rounded-xl border border-sage/40 bg-sage/10 px-3.5 py-2.5 mb-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-charcoal truncate">{selectedClient?.full_name || 'Unnamed'}</p>
              <p className="text-[11px] text-warm-gray truncate">{selectedClient?.email}</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray mb-1.5">
            Real bookings for this client — select which become case sessions
          </p>
          {loadingBookings ? (
            <div className="flex items-center gap-2 text-xs text-warm-gray py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading booking history...
            </div>
          ) : clientBookings.length === 0 ? (
            <p className="text-xs text-warm-gray italic py-2">
              No bookings found for this client yet. The case will be created with no sessions — add them later as real bookings come in.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {clientBookings.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl border border-beige/70 bg-[#faf8f4] px-3 py-2.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBookingIds.includes(b.id)}
                    onChange={() => toggleBooking(b.id)}
                    className="h-4 w-4 rounded border-beige text-sage-dark focus:ring-sage"
                  />
                  <Calendar className="h-3.5 w-3.5 text-sage-dark shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-charcoal">
                      {new Date(b.appointment_date).toLocaleDateString()} · {b.appointment_time}
                    </p>
                    <p className="text-[11px] text-warm-gray truncate">
                      {b.parent_name}
                      {b.child_name ? ` · with ${b.child_name}${b.child_age ? ` (${b.child_age})` : ''}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-md shrink-0 ${
                      b.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
                    }`}
                  >
                    {b.status}
                  </span>
                </label>
              ))}
            </div>
          )}

          <p className="mt-3 text-[11px] text-warm-gray leading-relaxed">
            Household members (parent, and any named child) will be created automatically from the selected bookings' data, and
            linked as attendees to each of those sessions.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/crm?client=${linkedClientId}`)}
              className="rounded-xl border border-beige px-4 py-2 text-sm text-charcoal hover:bg-beige/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Create Family Case
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

function deriveBirthYear(childAge: string): number | null {
  const num = parseInt(childAge, 10);
  if (Number.isNaN(num)) return null;
  return new Date().getFullYear() - num;
}

export default AdminFamilies;
