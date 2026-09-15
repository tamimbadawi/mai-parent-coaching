import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import {
  createCalendarEvent,
  getCalendarFreeBusy,
} from '../_shared/google-calendar.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const APPOINTMENT_CONFIG: Record<string, { duration: number; buffer: number }> = {
  initial: { duration: 75, buffer: 15 },
  'coaching-60': { duration: 60, buffer: 15 },
  'intensive-90': { duration: 90, buffer: 30 },
  family: { duration: 75, buffer: 15 },
  'follow-up': { duration: 45, buffer: 15 },
};

interface BookingPayload {
  user_id?: string | null;
  appointment_type_id: string;
  appointment_type_title: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:mm
  parent_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  child_name?: string | null;
  child_age?: string | null;
  notes?: string | null;
  timeZone?: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase server configuration is missing.' }, 500);
    }

    const payload = (await request.json()) as BookingPayload;

    // ── 1. Validate Required Fields ─────────────────────────────────────────
    if (
      !payload.appointment_type_id ||
      !payload.appointment_type_title ||
      !payload.appointment_date ||
      !payload.appointment_time ||
      !payload.parent_name?.trim() ||
      !payload.email?.trim()
    ) {
      return json(
        {
          error:
            'Missing required booking fields (appointment_type_id, appointment_type_title, appointment_date, appointment_time, parent_name, email).',
        },
        400
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.appointment_date)) {
      return json({ error: 'Invalid appointment_date format. Expected YYYY-MM-DD.' }, 400);
    }

    const timeZone =
      payload.timeZone || Deno.env.get('BOOKING_TIMEZONE') || 'Africa/Cairo';

    const config =
      APPOINTMENT_CONFIG[payload.appointment_type_id] || { duration: 60, buffer: 15 };
    const durationMinutes = config.duration;
    const bufferMinutes = config.buffer;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 2. Database Anti-Collision Check ────────────────────────────────────
    const { data: existingBookings, error: checkError } = await supabaseAdmin
      .from('bookings')
      .select('id, appointment_time, status')
      .eq('appointment_date', payload.appointment_date)
      .eq('appointment_time', payload.appointment_time)
      .in('status', ['confirmed', 'pending', 'pending_calendar_sync']);

    if (checkError) {
      console.error('Error checking existing bookings:', checkError);
    } else if (existingBookings && existingBookings.length > 0) {
      return json(
        {
          error:
            'This appointment time slot is already reserved. Please select another time.',
        },
        409
      );
    }

    // ── 3. Google Calendar FreeBusy Conflict Check ──────────────────────────
    const [startHourStr, startMinuteStr] = payload.appointment_time.split(':');
    const startHour = parseInt(startHourStr, 10);
    const startMinute = parseInt(startMinuteStr, 10);

    const slotStart = new Date(`${payload.appointment_date}T${payload.appointment_time}:00`);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
    const slotEndWithBuffer = new Date(
      slotStart.getTime() + (durationMinutes + bufferMinutes) * 60 * 1000
    );

    let googleCalendarEnabled = false;

    if (
      Deno.env.get('GOOGLE_CLIENT_ID') &&
      Deno.env.get('GOOGLE_CLIENT_SECRET') &&
      Deno.env.get('GOOGLE_REFRESH_TOKEN')
    ) {
      try {
        const dayStartISO = new Date(`${payload.appointment_date}T00:00:00Z`).toISOString();
        const dayEndISO = new Date(`${payload.appointment_date}T23:59:59Z`).toISOString();

        const busyBlocks = await getCalendarFreeBusy(dayStartISO, dayEndISO, timeZone);
        googleCalendarEnabled = true;

        const hasConflict = busyBlocks.some((block) => {
          const blockStart = new Date(block.start);
          const blockEnd = new Date(block.end);
          return slotStart < blockEnd && slotEndWithBuffer > blockStart;
        });

        if (hasConflict) {
          return json(
            {
              error:
                'This time slot is no longer available on the coach’s calendar. Please pick another time.',
            },
            409
          );
        }
      } catch (calError) {
        console.warn('Google FreeBusy conflict check warning:', calError);
      }
    }

    // ── 4. Insert Booking Record into Postgres ──────────────────────────────
    const dbRecord = {
      user_id: payload.user_id || null,
      appointment_type_id: payload.appointment_type_id,
      appointment_type_title: payload.appointment_type_title,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      parent_name: payload.parent_name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone?.trim() || null,
      country: payload.country?.trim() || null,
      child_name: payload.child_name?.trim() || null,
      child_age: payload.child_age?.trim() || null,
      notes: payload.notes?.trim() || null,
      status: 'pending',
    };

    const { data: insertedBooking, error: insertError } = await supabaseAdmin
      .from('bookings')
      .insert([dbRecord])
      .select('*')
      .single();

    if (insertError || !insertedBooking) {
      console.error('Database insert error:', insertError);
      return json(
        {
          error: insertError?.message || 'Unable to save booking to database.',
        },
        500
      );
    }

    const bookingId = insertedBooking.id;

    // ── 5. Create Google Calendar Event ─────────────────────────────────────
    let calendarEvent = null;
    let finalStatus: 'confirmed' | 'pending_calendar_sync' = 'confirmed';

    if (googleCalendarEnabled) {
      try {
        const descriptionLines = [
          `Session: ${payload.appointment_type_title}`,
          `Parent: ${payload.parent_name}`,
          `Email: ${payload.email}`,
          payload.phone ? `Phone: ${payload.phone}` : null,
          payload.country ? `Country: ${payload.country}` : null,
          payload.child_name || payload.child_age
            ? `Child: ${payload.child_name || 'N/A'}${
                payload.child_age ? ` (Age: ${payload.child_age})` : ''
              }`
            : null,
          payload.notes ? `\nParent Notes:\n${payload.notes}` : null,
          `\nBooking ID: ${bookingId}`,
        ]
          .filter(Boolean)
          .join('\n');

        // Construct ISO format for start and end datetime
        const startISO = `${payload.appointment_date}T${payload.appointment_time}:00`;
        const endISO = new Date(
          new Date(`${payload.appointment_date}T${payload.appointment_time}:00`).getTime() +
            durationMinutes * 60 * 1000
        )
          .toTimeString()
          .split(' ')[0];
        const endDateTimeISO = `${payload.appointment_date}T${endISO}`;

        calendarEvent = await createCalendarEvent({
          summary: `${payload.appointment_type_title} — ${payload.parent_name}`,
          description: descriptionLines,
          startDateTime: startISO,
          endDateTime: endDateTimeISO,
          timeZone,
          clientName: payload.parent_name,
          clientEmail: payload.email,
        });

        finalStatus = 'confirmed';
      } catch (eventError) {
        console.error('Failed to write Google Calendar event:', eventError);
        finalStatus = 'pending_calendar_sync';
      }
    } else {
      // If Google credentials are not set up yet, keep record saved as confirmed in DB
      finalStatus = 'confirmed';
    }

    // ── 6. Update Final Status in DB ────────────────────────────────────────
    await supabaseAdmin
      .from('bookings')
      .update({ status: finalStatus })
      .eq('id', bookingId);

    return json(
      {
        success: true,
        bookingId,
        status: finalStatus,
        calendarEventId: calendarEvent?.id || null,
        hangoutLink: calendarEvent?.hangoutLink || null,
        message:
          finalStatus === 'confirmed'
            ? 'Booking confirmed successfully. A calendar invitation has been dispatched.'
            : 'Booking captured in system. Calendar sync is currently pending.',
      },
      200
    );
  } catch (err) {
    console.error('create-booking uncaught error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Internal server error while processing booking.',
      },
      500
    );
  }
});
