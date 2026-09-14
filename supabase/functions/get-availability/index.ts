import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { getCalendarFreeBusy, type FreeBusyBlock } from '../_shared/google-calendar.ts';

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

// Standard appointment durations and buffers
const APPOINTMENT_CONFIG: Record<string, { duration: number; buffer: number }> = {
  initial: { duration: 75, buffer: 15 },
  'coaching-60': { duration: 60, buffer: 15 },
  'intensive-90': { duration: 90, buffer: 30 },
  family: { duration: 75, buffer: 15 },
  'follow-up': { duration: 45, buffer: 15 },
};

// Default working hours in coach time (09:00 to 17:00)
// Working days: Sunday (0) through Thursday (4)
const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4]; // Sunday - Thursday
const DEFAULT_WORK_START_HOUR = 9;  // 09:00
const DEFAULT_WORK_END_HOUR = 17;   // 17:00
const DEFAULT_SLOT_INTERVAL = 30;   // Candidate slots evaluated every 30 mins

interface AvailabilityQuery {
  date: string; // YYYY-MM-DD
  appointmentTypeId?: string;
  duration?: number;
  buffer?: number;
  timeZone?: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let query: AvailabilityQuery;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      query = {
        date: url.searchParams.get('date') || '',
        appointmentTypeId: url.searchParams.get('appointmentTypeId') || undefined,
        duration: url.searchParams.get('duration') ? parseInt(url.searchParams.get('duration')!, 10) : undefined,
        buffer: url.searchParams.get('buffer') ? parseInt(url.searchParams.get('buffer')!, 10) : undefined,
        timeZone: url.searchParams.get('timeZone') || 'Africa/Cairo',
      };
    } else {
      query = (await request.json()) as AvailabilityQuery;
    }

    if (!query.date || !/^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
      return json({ error: 'Valid date parameter (YYYY-MM-DD) is required.' }, 400);
    }

    const requestedDate = new Date(`${query.date}T00:00:00`);
    if (isNaN(requestedDate.getTime())) {
      return json({ error: 'Invalid date specified.' }, 400);
    }

    // Resolve duration and buffer
    const appointmentConfig = query.appointmentTypeId ? APPOINTMENT_CONFIG[query.appointmentTypeId] : null;
    const durationMinutes = query.duration || appointmentConfig?.duration || 60;
    const bufferMinutes = query.buffer || appointmentConfig?.buffer || 15;
    const totalSlotSpanMinutes = durationMinutes + bufferMinutes;
    const timeZone = query.timeZone || 'Africa/Cairo';

    // Check if the requested day is a non-working day (e.g. Friday / Saturday)
    const dayOfWeek = requestedDate.getDay();
    if (!DEFAULT_WORKING_DAYS.includes(dayOfWeek)) {
      return json({
        date: query.date,
        timeZone,
        appointmentTypeId: query.appointmentTypeId || null,
        durationMinutes,
        bufferMinutes,
        availableSlots: [],
        totalSlots: 0,
        isDayFullyBooked: true,
        reason: 'Outside working days',
      });
    }

    // Define search window for the day
    const dayStartISO = new Date(`${query.date}T00:00:00Z`).toISOString();
    const dayEndISO = new Date(`${query.date}T23:59:59Z`).toISOString();

    // ── 1. Fetch Google Calendar FreeBusy ──────────────────────────────────
    let googleBusyIntervals: FreeBusyBlock[] = [];
    let googleConnected = false;

    try {
      if (Deno.env.get('GOOGLE_CLIENT_ID') && Deno.env.get('GOOGLE_REFRESH_TOKEN')) {
        googleBusyIntervals = await getCalendarFreeBusy(dayStartISO, dayEndISO, timeZone);
        googleConnected = true;
      }
    } catch (googleError) {
      console.warn('Google Calendar FreeBusy fetch skipped/failed:', googleError);
    }

    // ── 2. Fetch Existing DB Bookings ─────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let dbBusySlots: Array<{ appointment_time: string }> = [];

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('appointment_time, status')
        .eq('appointment_date', query.date)
        .in('status', ['confirmed', 'pending', 'pending_calendar_sync']);

      dbBusySlots = bookingsData || [];
    }

    const bookedDbTimes = new Set(dbBusySlots.map((b) => b.appointment_time));

    // ── 3. Generate and Intersect Candidate Time Slots ────────────────────
    const availableSlots: string[] = [];
    const now = new Date();
    const isToday = query.date === now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let hour = DEFAULT_WORK_START_HOUR; hour < DEFAULT_WORK_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += DEFAULT_SLOT_INTERVAL) {
        // Check slot duration doesn't exceed working hours
        const slotStartInMinutes = hour * 60 + minute;
        const slotEndInMinutes = slotStartInMinutes + totalSlotSpanMinutes;
        const workEndInMinutes = DEFAULT_WORK_END_HOUR * 60;

        if (slotEndInMinutes > workEndInMinutes) continue;

        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        // If today, filter out past times (with 1 hour buffer)
        if (isToday) {
          if (hour < currentHour || (hour === currentHour && minute <= currentMinute + 60)) {
            continue;
          }
        }

        // Check against Postgres DB bookings
        if (bookedDbTimes.has(timeString)) {
          continue;
        }

        // Check against Google Calendar busy blocks
        if (googleConnected && googleBusyIntervals.length > 0) {
          const slotStartTime = new Date(`${query.date}T${timeString}:00`);
          const slotEndTime = new Date(slotStartTime.getTime() + totalSlotSpanMinutes * 60 * 1000);

          const hasCalendarConflict = googleBusyIntervals.some((block) => {
            const blockStart = new Date(block.start);
            const blockEnd = new Date(block.end);
            return slotStartTime < blockEnd && slotEndTime > blockStart;
          });

          if (hasCalendarConflict) {
            continue;
          }
        }

        availableSlots.push(timeString);
      }
    }

    return json({
      date: query.date,
      timeZone,
      appointmentTypeId: query.appointmentTypeId || null,
      durationMinutes,
      bufferMinutes,
      availableSlots,
      totalSlots: availableSlots.length,
      isDayFullyBooked: availableSlots.length === 0,
      googleCalendarConnected: googleConnected,
    });
  } catch (err) {
    console.error('get-availability error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Failed to calculate availability',
      },
      500
    );
  }
});
