import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createCalendarEvent, getCalendarFreeBusy } from '../_shared/google-calendar.ts';
import {
  APPOINTMENT_CONFIG,
  candidateSlotsForClientDate,
  intervalsOverlap,
  isValidDateKey,
  isValidTime,
  isValidTimeZone,
  parseWorkingHours,
  zonedDateTimeToUtc,
} from '../_shared/booking-scheduling.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BookingPayload {
  appointment_type_id: string;
  appointment_date: string;
  appointment_time: string;
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
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed. Use POST.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Booking database configuration is missing.' }, 503);

    const payload = (await request.json()) as BookingPayload;
    const appointment = APPOINTMENT_CONFIG[payload.appointment_type_id];
    if (!appointment) return json({ error: 'Unknown appointment type.' }, 400);
    if (!isValidDateKey(payload.appointment_date) || !isValidTime(payload.appointment_time)) {
      return json({ error: 'Invalid appointment date or time.' }, 400);
    }
    if (!payload.parent_name?.trim() || payload.parent_name.trim().length > 120 || !EMAIL_PATTERN.test(payload.email?.trim() ?? '') || payload.email.trim().length > 254) {
      return json({ error: 'A valid name and email address are required.' }, 400);
    }

    const clientTimeZone = payload.timeZone || 'Africa/Cairo';
    const coachTimeZone = Deno.env.get('BOOKING_TIMEZONE') || 'Africa/Cairo';
    if (!isValidTimeZone(clientTimeZone) || !isValidTimeZone(coachTimeZone)) return json({ error: 'Invalid booking timezone.' }, 400);
    const workingHours = parseWorkingHours(Deno.env.get('BOOKING_WORKING_HOURS'));
    const startsAt = zonedDateTimeToUtc(payload.appointment_date, payload.appointment_time, clientTimeZone);
    const endsAt = new Date(startsAt.getTime() + appointment.durationMinutes * 60_000);
    const reservedUntil = new Date(endsAt.getTime() + appointment.bufferMinutes * 60_000);
    if (startsAt <= new Date(Date.now() + 60 * 60_000)) return json({ error: 'Bookings require at least one hour of advance notice.' }, 400);

    const validSlot = candidateSlotsForClientDate({
      clientDate: payload.appointment_date,
      clientTimeZone,
      coachTimeZone,
      durationMinutes: appointment.durationMinutes,
      bufferMinutes: appointment.bufferMinutes,
      workingHours,
    }).some((slot) => slot.startsAt.getTime() === startsAt.getTime());
    if (!validSlot) return json({ error: 'The selected time is outside booking hours.' }, 400);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    let userId: string | null = null;
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authorization.slice(7));
      userId = user?.id ?? null;
    }

    const { data: conflicts, error: conflictError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .in('status', ['pending', 'confirmed', 'pending_calendar_sync'])
      .lt('starts_at', reservedUntil.toISOString())
      .gt('reserved_until', startsAt.toISOString())
      .limit(1);
    if (conflictError) throw new Error(`Could not validate reservations: ${conflictError.message}`);
    if (conflicts?.length) return json({ error: 'This appointment overlaps another reservation. Please select another time.' }, 409);

    let googleCalendarEnabled = false;
    if (Deno.env.get('GOOGLE_CLIENT_ID') && Deno.env.get('GOOGLE_CLIENT_SECRET') && Deno.env.get('GOOGLE_REFRESH_TOKEN')) {
      let busyBlocks;
      try {
        busyBlocks = await getCalendarFreeBusy(startsAt.toISOString(), reservedUntil.toISOString(), coachTimeZone);
        googleCalendarEnabled = true;
      } catch (error) {
        console.error('Google Calendar validation failed:', error);
        return json({ error: 'Live calendar validation is temporarily unavailable. No booking was created.' }, 503);
      }
      if (busyBlocks.some((block) => intervalsOverlap(startsAt, reservedUntil, new Date(block.start), new Date(block.end)))) {
        return json({ error: 'This time is no longer available on the coach’s calendar.' }, 409);
      }
    }

    const { data: booking, error: insertError } = await supabaseAdmin.from('bookings').insert({
      user_id: userId,
      appointment_type_id: payload.appointment_type_id,
      appointment_type_title: appointment.title,
      appointment_date: payload.appointment_date,
      appointment_time: payload.appointment_time,
      time_zone: clientTimeZone,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reserved_until: reservedUntil.toISOString(),
      parent_name: payload.parent_name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone?.trim().slice(0, 50) || null,
      country: payload.country?.trim().slice(0, 100) || null,
      child_name: payload.child_name?.trim().slice(0, 120) || null,
      child_age: payload.child_age?.trim().slice(0, 30) || null,
      notes: payload.notes?.trim().slice(0, 2_000) || null,
      status: 'pending',
    }).select('id').single();
    if (insertError) {
      if (insertError.code === '23P01') return json({ error: 'This appointment was just reserved. Please select another time.' }, 409);
      throw new Error(`Unable to save booking: ${insertError.message}`);
    }

    let finalStatus: 'confirmed' | 'pending_calendar_sync' = 'confirmed';
    let calendarEvent = null;
    if (googleCalendarEnabled) {
      try {
        calendarEvent = await createCalendarEvent({
          summary: `${appointment.title} — ${payload.parent_name.trim()}`,
          description: [
            `Session: ${appointment.title}`,
            `Parent: ${payload.parent_name.trim()}`,
            `Email: ${payload.email.trim().toLowerCase()}`,
            payload.phone ? `Phone: ${payload.phone.trim()}` : null,
            payload.country ? `Country: ${payload.country.trim()}` : null,
            payload.child_name || payload.child_age ? `Child: ${payload.child_name?.trim() || 'N/A'}${payload.child_age ? ` (Age: ${payload.child_age.trim()})` : ''}` : null,
            payload.notes ? `\nParent Notes:\n${payload.notes.trim().slice(0, 2_000)}` : null,
            `\nBooking ID: ${booking.id}`,
          ].filter(Boolean).join('\n'),
          startDateTime: startsAt.toISOString(),
          endDateTime: endsAt.toISOString(),
          timeZone: coachTimeZone,
          clientName: payload.parent_name.trim(),
          clientEmail: payload.email.trim().toLowerCase(),
        });
      } catch (error) {
        console.error('Calendar event creation failed:', error);
        finalStatus = 'pending_calendar_sync';
      }
    }

    const { error: statusError } = await supabaseAdmin.from('bookings').update({
      status: finalStatus,
      google_calendar_event_id: calendarEvent?.id ?? null,
      google_meet_url: calendarEvent?.hangoutLink ?? null,
    }).eq('id', booking.id);
    if (statusError) console.error('Booking saved but final status update failed:', statusError);

    return json({
      success: true,
      bookingId: booking.id,
      status: statusError ? 'pending' : finalStatus,
      calendarEventId: calendarEvent?.id ?? null,
      hangoutLink: calendarEvent?.hangoutLink ?? null,
      message: finalStatus === 'confirmed' ? 'Booking confirmed successfully.' : 'Booking saved; calendar synchronization is pending.',
    });
  } catch (error) {
    console.error('create-booking error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to process booking.' }, 500);
  }
});
