import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { getCalendarFreeBusy, type FreeBusyBlock } from '../_shared/google-calendar.ts';
import {
  APPOINTMENT_CONFIG,
  candidateSlotsForClientDate,
  intervalsOverlap,
  isValidDateKey,
  isValidTimeZone,
  parseWorkingHours,
} from '../_shared/booking-scheduling.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

interface AvailabilityQuery {
  date?: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  appointmentTypeId?: string;
  timeZone?: string;
}
interface BusyInterval { startsAt: Date; reservedUntil: Date }

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function slotsForDate(options: {
  dateKey: string;
  clientTimeZone: string;
  coachTimeZone: string;
  durationMinutes: number;
  bufferMinutes: number;
  workingHours: ReturnType<typeof parseWorkingHours>;
  busyIntervals: BusyInterval[];
  now: Date;
}): string[] {
  const slots = candidateSlotsForClientDate({
    clientDate: options.dateKey,
    clientTimeZone: options.clientTimeZone,
    coachTimeZone: options.coachTimeZone,
    durationMinutes: options.durationMinutes,
    bufferMinutes: options.bufferMinutes,
    workingHours: options.workingHours,
  });
  const oneHourFromNow = new Date(options.now.getTime() + 60 * 60_000);
  return slots
    .filter((slot) => slot.startsAt > oneHourFromNow)
    .filter((slot) => !options.busyIntervals.some((busy) =>
      intervalsOverlap(slot.startsAt, slot.reservedUntil, busy.startsAt, busy.reservedUntil)
    ))
    .map((slot) => slot.label);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    let query: AvailabilityQuery;
    if (request.method === 'GET') {
      const url = new URL(request.url);
      query = {
        date: url.searchParams.get('date') || undefined,
        month: url.searchParams.get('month') || undefined,
        startDate: url.searchParams.get('startDate') || undefined,
        endDate: url.searchParams.get('endDate') || undefined,
        appointmentTypeId: url.searchParams.get('appointmentTypeId') || undefined,
        timeZone: url.searchParams.get('timeZone') || undefined,
      };
    } else {
      query = (await request.json()) as AvailabilityQuery;
    }

    const appointmentTypeId = query.appointmentTypeId || 'initial';
    const appointment = APPOINTMENT_CONFIG[appointmentTypeId] || APPOINTMENT_CONFIG.initial;
    const clientTimeZone = query.timeZone || 'Africa/Cairo';
    const coachTimeZone = Deno.env.get('BOOKING_TIMEZONE') || 'Africa/Cairo';
    if (!isValidTimeZone(clientTimeZone)) return json({ error: 'Invalid IANA timezone.' }, 400);
    if (!isValidTimeZone(coachTimeZone)) return json({ error: 'Server booking timezone is invalid.' }, 500);
    const workingHours = parseWorkingHours(Deno.env.get('BOOKING_WORKING_HOURS'));

    let startDate = query.startDate;
    let endDate = query.endDate;
    if (query.date) startDate = endDate = query.date;
    if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
      const [year, month] = query.month.split('-').map(Number);
      startDate = `${query.month}-01`;
      endDate = `${query.month}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;
    }
    if (!startDate || !endDate || !isValidDateKey(startDate) || !isValidDateKey(endDate) || startDate > endDate) {
      return json({ error: 'Provide a valid date, month, or date range.' }, 400);
    }
    const rangeDays = Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1;
    if (rangeDays > 42) return json({ error: 'Availability ranges are limited to 42 days.' }, 400);

    const rangeStart = new Date(`${addDays(startDate, -2)}T00:00:00Z`);
    const rangeEnd = new Date(`${addDays(endDate, 2)}T00:00:00Z`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Booking database configuration is missing.' }, 503);
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('starts_at, reserved_until')
      .in('status', ['pending', 'confirmed', 'pending_calendar_sync'])
      .lt('starts_at', rangeEnd.toISOString())
      .gt('reserved_until', rangeStart.toISOString());
    if (bookingsError) throw new Error(`Could not read booking reservations: ${bookingsError.message}`);
    const busyIntervals: BusyInterval[] = (bookings ?? []).map((booking) => ({
      startsAt: new Date(booking.starts_at),
      reservedUntil: new Date(booking.reserved_until),
    }));

    // Check blackout / vacation dates
    const { data: blackouts } = await supabase
      .from('booking_blackouts')
      .select('start_date, end_date')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (blackouts) {
      for (const blackout of blackouts) {
        busyIntervals.push({
          startsAt: new Date(`${blackout.start_date}T00:00:00Z`),
          reservedUntil: new Date(`${blackout.end_date}T23:59:59Z`),
        });
      }
    }

    let googleCalendarConnected = false;
    if (Deno.env.get('GOOGLE_CLIENT_ID') && Deno.env.get('GOOGLE_CLIENT_SECRET') && Deno.env.get('GOOGLE_REFRESH_TOKEN')) {
      let googleBusy: FreeBusyBlock[];
      try {
        googleBusy = await getCalendarFreeBusy(rangeStart.toISOString(), rangeEnd.toISOString(), coachTimeZone);
        googleCalendarConnected = true;
      } catch (error) {
        console.error('Google Calendar availability check failed:', error);
        return json({ error: 'Live calendar availability is temporarily unavailable.' }, 503);
      }
      for (const block of googleBusy) busyIntervals.push({ startsAt: new Date(block.start), reservedUntil: new Date(block.end) });
    }

    const now = new Date();
    const calculate = (dateKey: string) => slotsForDate({
      dateKey,
      clientTimeZone,
      coachTimeZone,
      durationMinutes: appointment.durationMinutes,
      bufferMinutes: appointment.bufferMinutes,
      workingHours,
      busyIntervals,
      now,
    });
    if (query.date) {
      const availableSlots = calculate(query.date);
      return json({
        date: query.date,
        timeZone: clientTimeZone,
        coachTimeZone,
        appointmentTypeId: query.appointmentTypeId,
        durationMinutes: appointment.durationMinutes,
        bufferMinutes: appointment.bufferMinutes,
        availableSlots,
        totalSlots: availableSlots.length,
        isDayFullyBooked: availableSlots.length === 0,
        googleCalendarConnected,
      });
    }

    const days: Record<string, { totalSlots: number; isFullyBooked: boolean }> = {};
    for (let dateKey = startDate; dateKey <= endDate; dateKey = addDays(dateKey, 1)) {
      const slots = calculate(dateKey);
      days[dateKey] = { totalSlots: slots.length, isFullyBooked: slots.length === 0 };
    }
    return json({ startDate, endDate, timeZone: clientTimeZone, coachTimeZone, appointmentTypeId: query.appointmentTypeId, days, googleCalendarConnected });
  } catch (error) {
    console.error('get-availability error:', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to calculate availability.' }, 500);
  }
});
