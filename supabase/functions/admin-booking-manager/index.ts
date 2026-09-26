import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  hasGoogleCalendarCredentials,
  SESSION_COLOR_IDS,
} from '../_shared/google-calendar.ts';
import {
  isValidDateKey,
  isValidTime,
  isValidTimeZone,
  zonedDateTimeToUtc,
  DISCOVERY_TOPIC_TITLES,
  INTAKE_NEED_LABELS,
  INTAKE_DURATION_LABELS,
  PACKAGE_TITLES,
} from '../_shared/booking-scheduling.ts';

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
  initial: { duration: 30, buffer: 15 },
  'coaching-60': { duration: 60, buffer: 15 },
  'intensive-90': { duration: 90, buffer: 30 },
  family: { duration: 75, buffer: 15 },
  'follow-up': { duration: 45, buffer: 15 },
};

function buildCalendarEventText(booking: Record<string, any>): { summary: string; description: string } {
  const summary = `${booking.appointment_type_title} — ${booking.parent_name}`;

  const lines: string[] = [];

  if (booking.appointment_type_title) lines.push(`Session: ${booking.appointment_type_title}`);
  if (booking.parent_name) lines.push(`Parent: ${booking.parent_name}`);
  if (booking.email) lines.push(`Email: ${booking.email}`);
  if (booking.phone) lines.push(`Phone: ${booking.phone}`);
  if (booking.country) lines.push(`Country: ${booking.country}`);

  if (booking.child_name) {
    lines.push(`Child: ${booking.child_name}${booking.child_age ? ` (Age: ${booking.child_age})` : ''}`);
  } else if (booking.child_age) {
    lines.push(`Children's ages: ${booking.child_age}`);
  }

  const topics: string[] = Array.isArray(booking.intake_topics) ? booking.intake_topics : [];
  const validTopicTitles = topics
    .map((t) => DISCOVERY_TOPIC_TITLES[t] || t)
    .filter(Boolean);

  const hasIntake =
    validTopicTitles.length > 0 ||
    Boolean(booking.intake_need) ||
    Boolean(booking.intake_duration) ||
    Boolean(booking.intake_suggested_package);

  if (hasIntake) {
    lines.push('');
    if (validTopicTitles.length > 0) {
      lines.push('Bringing them here:');
      for (const title of validTopicTitles) {
        lines.push(`• ${title}`);
      }
    }
    if (booking.intake_need) {
      const needLabel = INTAKE_NEED_LABELS[booking.intake_need] || booking.intake_need;
      lines.push(`Wants: ${needLabel}`);
    }
    if (booking.intake_duration) {
      const durLabel = INTAKE_DURATION_LABELS[booking.intake_duration] || booking.intake_duration;
      lines.push(`Felt hard for: ${durLabel}`);
    }
    if (booking.intake_suggested_package) {
      const pkgTitle = PACKAGE_TITLES[booking.intake_suggested_package] || booking.intake_suggested_package;
      lines.push(`Suggested package: ${pkgTitle}`);
    }
  }

  if (booking.notes) {
    lines.push('');
    lines.push(`Parent Notes:\n${booking.notes}`);
  }

  return { summary, description: lines.join('\n') };
}

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

    // 1. Verify Authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRole = token === serviceRoleKey;

    let callerUser: { id: string; email?: string } | null = null;
    let isAdmin = isServiceRole;

    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return json({ error: 'Unauthorized: Invalid token' }, 401);
      }

      callerUser = user;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        isAdmin = true;
      }
    }

    // 2. Parse Request Body
    const body = await request.json();
    const action = body.action as string;

    if (!action) {
      return json({ error: 'Action parameter is required' }, 400);
    }

    // ── ACTION: APPROVE BOOKING (Admin Only) ────────────────────────────────
    if (action === 'approve') {
      if (!isAdmin) {
        return json({ error: 'Forbidden: Admin privileges required' }, 403);
      }
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

      let calendarEvent = null;
      let finalStatus: 'confirmed' | 'pending_calendar_sync' = 'confirmed';

      if (hasGoogleCalendarCredentials()) {
        try {
          const { summary, description } = buildCalendarEventText(booking);
          calendarEvent = await createCalendarEvent({
            summary,
            description,
            startDateTime: booking.starts_at,
            endDateTime: booking.ends_at,
            timeZone: booking.time_zone || 'Africa/Cairo',
            clientName: booking.parent_name,
            clientEmail: booking.email,
            colorId: SESSION_COLOR_IDS[booking.appointment_type_id],
          });
        } catch (calErr) {
          console.error('Google Calendar creation error during approval:', calErr);
          finalStatus = 'pending_calendar_sync';
        }
      }

      const { data: updatedBooking, error: updateErr } = await supabase
        .from('bookings')
        .update({
          status: finalStatus,
          google_calendar_event_id: calendarEvent?.id ?? booking.google_calendar_event_id ?? null,
          google_meet_url: calendarEvent?.hangoutLink ?? booking.google_meet_url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (updateErr) {
        return json({ error: `Failed to approve booking: ${updateErr.message}` }, 400);
      }

      // Trigger canonical WhatsApp Booking Confirmation if booking has phone number
      let whatsappDispatchResult = null;
      if (finalStatus === 'confirmed' && updatedBooking.phone) {
        try {
          const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              trigger: 'booking_confirmation',
              related_booking_id: bookingId,
            }),
          });
          whatsappDispatchResult = await dispatchRes.json();
        } catch (dispatchErr: any) {
          console.error('WhatsApp booking confirmation dispatch error:', dispatchErr);
          whatsappDispatchResult = { error: dispatchErr?.message || 'Dispatch call failed' };
        }
      }

      return json({
        success: true,
        booking: updatedBooking,
        calendarEventId: calendarEvent?.id ?? null,
        hangoutLink: calendarEvent?.hangoutLink ?? null,
        whatsappDispatch: whatsappDispatchResult,
      });
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

      // Check permissions: Admin or Owner
      if (!isAdmin) {
        if (!callerUser) {
          return json({ error: 'Unauthorized: You must be logged in to modify bookings' }, 401);
        }
        const isOwner =
          (booking.user_id && booking.user_id === callerUser.id) ||
          (booking.email && callerUser.email && booking.email.toLowerCase() === callerUser.email.toLowerCase());

        if (!isOwner) {
          return json({ error: 'Forbidden: You can only reschedule your own bookings' }, 403);
        }
      }

      const tz = timeZone || booking.time_zone || 'Africa/Cairo';
      if (!isValidDateKey(newDate) || !isValidTime(newTime) || !isValidTimeZone(tz)) {
        return json({ error: 'Invalid date, time, or timezone.' }, 400);
      }

      const config = APPOINTMENT_DURATIONS[booking.appointment_type_id] || { duration: 60, buffer: 15 };
      const durationMs = config.duration * 60 * 1000;
      const totalSpanMs = (config.duration + config.buffer) * 60 * 1000;

      // newDate and newTime are wall-clock values in the client's timezone (tz)
      const newStart = zonedDateTimeToUtc(newDate, newTime, tz);
      const newStartsAt = newStart.toISOString();
      const newEndsAt = new Date(newStart.getTime() + durationMs).toISOString();
      const newReservedUntil = new Date(newStart.getTime() + totalSpanMs).toISOString();

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
          const { summary, description } = buildCalendarEventText(updatedBooking);
          await updateCalendarEvent(booking.google_calendar_event_id, {
            summary,
            description,
            startDateTime: newStartsAt,
            endDateTime: newEndsAt,
            timeZone: tz,
            colorId: SESSION_COLOR_IDS[booking.appointment_type_id],
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

      // Check permissions: Admin or Owner
      if (!isAdmin) {
        if (!callerUser) {
          return json({ error: 'Unauthorized: You must be logged in to modify bookings' }, 401);
        }
        const isOwner =
          (booking.user_id && booking.user_id === callerUser.id) ||
          (booking.email && callerUser.email && booking.email.toLowerCase() === callerUser.email.toLowerCase());

        if (!isOwner) {
          return json({ error: 'Forbidden: You can only cancel your own bookings' }, 403);
        }
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

    // ── ACTION: EDIT BOOKING DETAILS (Admin Only) ───────────────────────────
    if (action === 'edit-details') {
      if (!isAdmin) {
        return json({ error: 'Forbidden: Admin privileges required' }, 403);
      }
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

    // ── ACTION: SYNC CALENDAR EVENT (Admin Only) ────────────────────────────
    if (action === 'sync-calendar') {
      if (!isAdmin) {
        return json({ error: 'Forbidden: Admin privileges required' }, 403);
      }
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

      const { summary, description } = buildCalendarEventText(booking);
      const event = await createCalendarEvent({
        summary,
        description,
        startDateTime: booking.starts_at,
        endDateTime: booking.ends_at,
        timeZone: booking.time_zone || 'Africa/Cairo',
        clientName: booking.parent_name,
        clientEmail: booking.email,
        colorId: SESSION_COLOR_IDS[booking.appointment_type_id],
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
