import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createCalendarEvent, getCalendarFreeBusy, hasGoogleCalendarCredentials } from '../_shared/google-calendar.ts';
import {
  APPOINTMENT_CONFIG,
  candidateSlotsForClientDate,
  buildOpenIntervalsForCoachDate,
  type DbAvailabilityRule,
  intervalsOverlap,
  isValidDateKey,
  isValidTime,
  isValidTimeZone,
  zonedDateTimeToUtc,
  DISCOVERY_TOPIC_TITLES,
  INTAKE_NEED_LABELS,
  INTAKE_DURATION_LABELS,
  suggestPackageId,
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
  intake_topics?: unknown;
  intake_need?: unknown;
  intake_duration?: unknown;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed. Use POST.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Booking database configuration is missing.' }, 503);

    const payload = (await request.json()) as BookingPayload;
    if (!payload.appointment_type_id || !Object.hasOwn(APPOINTMENT_CONFIG, payload.appointment_type_id)) {
      return json({ error: 'Unknown appointment type.' }, 400);
    }
    const appointment = APPOINTMENT_CONFIG[payload.appointment_type_id];
    if (!isValidDateKey(payload.appointment_date) || !isValidTime(payload.appointment_time)) {
      return json({ error: 'Invalid appointment date or time.' }, 400);
    }
    if (!payload.parent_name?.trim() || payload.parent_name.trim().length > 120 || !EMAIL_PATTERN.test(payload.email?.trim() ?? '') || payload.email.trim().length > 254) {
      return json({ error: 'A valid name and email address are required.' }, 400);
    }

    const normalizedTime = payload.appointment_time.length === 4 ? `0${payload.appointment_time}` : payload.appointment_time;
    const clientTimeZone = (payload as Record<string, any>).time_zone || payload.timeZone || 'Africa/Cairo';
    const coachTimeZone = Deno.env.get('BOOKING_TIMEZONE') || 'Africa/Cairo';
    if (!isValidTimeZone(clientTimeZone) || !isValidTimeZone(coachTimeZone)) return json({ error: 'Invalid booking timezone.' }, 400);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Fetch active coach availability rules
    const { data: rulesData, error: rulesError } = await supabaseAdmin
      .from('coach_availability_rules')
      .select('*')
      .eq('is_active', true);
    if (rulesError) throw new Error(`Could not load availability rules: ${rulesError.message}`);
    const rules = (rulesData || []) as DbAvailabilityRule[];

    const openIntervalsProvider = (coachDate: string) =>
      buildOpenIntervalsForCoachDate(coachDate, coachTimeZone, rules, payload.appointment_type_id);

    const startsAt = zonedDateTimeToUtc(payload.appointment_date, normalizedTime, clientTimeZone);
    const endsAt = new Date(startsAt.getTime() + appointment.durationMinutes * 60_000);
    const reservedUntil = new Date(endsAt.getTime() + appointment.bufferMinutes * 60_000);
    if (startsAt <= new Date(Date.now() + 60 * 60_000)) return json({ error: 'Bookings require at least one hour of advance notice.' }, 400);

    const validSlot = candidateSlotsForClientDate({
      clientDate: payload.appointment_date,
      clientTimeZone,
      coachTimeZone,
      durationMinutes: appointment.durationMinutes,
      bufferMinutes: appointment.bufferMinutes,
      openIntervalsProvider,
    }).some((slot) => slot.startsAt.getTime() === startsAt.getTime());
    if (!validSlot) return json({ error: 'The selected time is outside open booking hours.' }, 400);

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

    if (hasGoogleCalendarCredentials()) {
      let busyBlocks;
      try {
        busyBlocks = await getCalendarFreeBusy(startsAt.toISOString(), reservedUntil.toISOString(), coachTimeZone);
      } catch (error) {
        console.error('Google Calendar validation failed:', error);
        return json({ error: 'Live calendar validation is temporarily unavailable. No booking was created.' }, 503);
      }
      if (busyBlocks.some((block) => intervalsOverlap(startsAt, reservedUntil, new Date(block.start), new Date(block.end)))) {
        return json({ error: 'This time is no longer available on the coach’s calendar.' }, 409);
      }
    }

    let intakeTopics: string[] | null = null;
    let intakeNeed: string | null = null;
    let intakeDuration: string | null = null;
    let intakeSuggestedPackage: string | null = null;

    if (payload.appointment_type_id === 'initial') {
      if (Array.isArray(payload.intake_topics)) {
        const validTopics = Array.from(new Set(
          payload.intake_topics
            .filter((t): t is string => typeof t === 'string' && Object.hasOwn(DISCOVERY_TOPIC_TITLES, t))
        ));
        intakeTopics = validTopics.length > 0 ? validTopics : null;
      }
      if (typeof payload.intake_need === 'string' && Object.hasOwn(INTAKE_NEED_LABELS, payload.intake_need)) {
        intakeNeed = payload.intake_need;
      }
      if (typeof payload.intake_duration === 'string' && Object.hasOwn(INTAKE_DURATION_LABELS, payload.intake_duration)) {
        intakeDuration = payload.intake_duration;
      }
      if (intakeNeed && intakeDuration) {
        intakeSuggestedPackage = suggestPackageId(intakeNeed, intakeDuration);
      }
    }

    const { data: booking, error: insertError } = await supabaseAdmin.from('bookings').insert({
      user_id: userId,
      appointment_type_id: payload.appointment_type_id,
      appointment_type_title: appointment.title,
      appointment_date: payload.appointment_date,
      appointment_time: normalizedTime,
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
      intake_topics: intakeTopics,
      intake_need: intakeNeed,
      intake_duration: intakeDuration,
      intake_suggested_package: intakeSuggestedPackage,
      status: 'pending',
    }).select('id').single();
    if (insertError) {
      if (insertError.code === '23P01') return json({ error: 'This appointment was just reserved. Please select another time.' }, 409);
      throw new Error(`Unable to save booking: ${insertError.message}`);
    }

    return json({
      success: true,
      bookingId: booking.id,
      status: 'pending',
      message: 'Booking request received and slot reserved. Pending admin confirmation.',
    });
  } catch (error) {
    console.error('create-booking error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to process booking.' }, 500);
  }
});
