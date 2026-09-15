import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../_shared/google-calendar.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const APPOINTMENT_DURATIONS: Record<string, { duration: number; buffer: number }> = {
  initial: { duration: 75, buffer: 15 },
  'coaching-60': { duration: 60, buffer: 15 },
  'intensive-90': { duration: 90, buffer: 30 },
  family: { duration: 75, buffer: 15 },
  'follow-up': { duration: 45, buffer: 15 },
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfigured (missing Supabase credentials)' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify Admin Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: 'Unauthorized: Invalid token' }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return json({ error: 'Forbidden: Admin privileges required' }, 403);
    }

    // 2. Parse Request Body
    const body = await request.json();
    const action = body.action as string;

    if (!action) {
      return json({ error: 'Action parameter is required' }, 400);
    }

    // ── ACTION: RESCHEDULE BOOKING ──────────────────────────────────────────
    if (action === 'reschedule') {
      const { bookingId, newDate, newTime, timeZone } = body;
      if (!bookingId || !newDate || !newTime) {
        return json({ error: 'bookingId, newDate, and newTime are required' }, 400);
      }

      // Fetch existing booking
      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchErr || !booking) {
        return json({ error: 'Booking not found' }, 404);
      }

      const tz = timeZone || booking.time_zone || 'Africa/Cairo';
      const config = APPOINTMENT_DURATIONS[booking.appointment_type_id] || { duration: 60, buffer: 15 };
      const durationMs = config.duration * 60 * 1000;
      const totalSpanMs = (config.duration + config.buffer) * 60 * 1000;

      const newStartLocal = new Date(`${newDate}T${newTime}:00`);
      const newStartsAt = newStartLocal.toISOString();
      const newEndsAt = new Date(newStartLocal.getTime() + durationMs).toISOString();
      const newReservedUntil = new Date(newStartLocal.getTime() + totalSpanMs).toISOString();

      // Update in Supabase
      const { data: updatedBooking, error: updateErr } = await supabase
        .from('bookings')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          time_zone: tz,
          starts_at: newStartsAt,
          ends_at: newEndsAt,
          reserved_until: newReservedUntil,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (updateErr) {
        return json({ error: `Failed to reschedule in database: ${updateErr.message}` }, 400);
      }

      // Update in Google Calendar if event exists
      let calendarUpdated = false;
      if (booking.google_calendar_event_id) {
        try {
          await updateCalendarEvent(booking.google_calendar_event_id, {
            summary: `Coaching Session: ${booking.appointment_type_title} â€” ${booking.parent_name}`,
            startDateTime: newStartsAt,
            endDateTime: newEndsAt,
            timeZone: tz,
          });
          calendarUpdated = true;
        } catch (calErr) {
          console.warn('Google Calendar update warning:', calErr);
        }
      }

      return json({
        success: true,
        booking: updatedBooking,
        calendarUpdated,
      });
    }

    // ── ACTION: CANCEL BOOKING ──────────────────────────────────────────────
    if (action === 'cancel') {
      const { bookingId, reason } = body;
      if (!bookingId) {
        return json({ error: 'bookingId is required' }, 400);
      }

      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchErr || !booking) {
        return json({ error: 'Booking not found' }, 404);
      }

      const { data: updatedBooking, error: updateErr } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          notes: reason ? `${booking.notes || ''}\n[Cancellation Reason: ${reason}]`.trim() : booking.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (updateErr) {
        return json({ error: `Failed to cancel booking: ${updateErr.message}` }, 400);
      }

      // Delete from Google Calendar if event exists
      if (booking.google_calendar_event_id) {
        try {
          await deleteCalendarEvent(booking.google_calendar_event_id);
        } catch (calErr) {
          console.warn('Google Calendar deletion warning:', calErr);
        }
      }

      return json({
        success: true,
        booking: updatedBooking,
      });
    }

    // ── ACTION: EDIT BOOKING DETAILS ────────────────────────────────────────
    if (action === 'edit-details') {
      const {
        bookingId,
        parent_name,
        email,
        phone,
        country,
        child_name,
        child_age,
        notes,
        appointment_type_id,
        appointment_type_title,
      } = body;

      if (!bookingId) {
        return json({ error: 'bookingId is required' }, 400);
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (parent_name !== undefined) updatePayload.parent_name = parent_name.trim();
      if (email !== undefined) updatePayload.email = email.trim().toLowerCase();
      if (phone !== undefined) updatePayload.phone = phone ? phone.trim() : null;
      if (country !== undefined) updatePayload.country = country ? country.trim() : null;
      if (child_name !== undefined) updatePayload.child_name = child_name ? child_name.trim() : null;
      if (child_age !== undefined) updatePayload.child_age = child_age ? child_age.trim() : null;
      if (notes !== undefined) updatePayload.notes = notes ? notes.trim() : null;
      if (appointment_type_id !== undefined) updatePayload.appointment_type_id = appointment_type_id;
      if (appointment_type_title !== undefined) updatePayload.appointment_type_title = appointment_type_title;

      const { data: updatedBooking, error: updateErr } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', bookingId)
        .select('*')
        .single();

      if (updateErr) {
        return json({ error: `Failed to update booking: ${updateErr.message}` }, 400);
      }

      return json({
        success: true,
        booking: updatedBooking,
      });
    }

    // ── ACTION: SYNC CALENDAR EVENT ─────────────────────────────────────────
    if (action === 'sync-calendar') {
      const { bookingId } = body;
      if (!bookingId) {
        return json({ error: 'bookingId is required' }, 400);
      }

      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (fetchErr || !booking) {
        return json({ error: 'Booking not found' }, 404);
      }

      const event = await createCalendarEvent({
        summary: `Coaching Session: ${booking.appointment_type_title} â€” ${booking.parent_name}`,
        description: `Mai Coaching Session\nClient: ${booking.parent_name}\nEmail: ${booking.email}\nPhone: ${booking.phone || 'N/A'}\nChild: ${booking.child_name || 'N/A'} (${booking.child_age || 'N/A'})\nNotes: ${booking.notes || 'None'}`,
        startDateTime: booking.starts_at,
        endDateTime: booking.ends_at,
        timeZone: booking.time_zone || 'Africa/Cairo',
        clientName: booking.parent_name,
        clientEmail: booking.email,
      });

      const { data: updatedBooking, error: updateErr } = await supabase
        .from('bookings')
        .update({
          google_calendar_event_id: event.id,
          google_meet_url: event.hangoutLink || null,
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (updateErr) {
        return json({ error: `Calendar synced but failed to update DB: ${updateErr.message}` }, 500);
      }

      return json({
        success: true,
        booking: updatedBooking,
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('admin-booking-manager error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      500
    );
  }
});
