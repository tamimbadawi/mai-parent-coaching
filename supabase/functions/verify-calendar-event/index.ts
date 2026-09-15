import { deleteCalendarEvent, getCalendarEvent } from '../_shared/google-calendar.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const expectedToken = Deno.env.get('CALENDAR_VERIFICATION_TOKEN');
  const supplied = request.headers.get('X-Calendar-Verification-Token');
  if (!expectedToken || !supplied || supplied !== expectedToken) return json({ error: 'Unauthorized.' }, 401);

  try {
    const body = (await request.json()) as { eventId?: string; action?: 'get' | 'delete' };
    if (!body.eventId || !/^[A-Za-z0-9_-]{8,256}$/.test(body.eventId)) {
      return json({ error: 'A valid eventId is required.' }, 400);
    }
    if (body.action === 'delete') {
      await deleteCalendarEvent(body.eventId);
      return json({ deleted: true, eventId: body.eventId });
    }
    const event = await getCalendarEvent(body.eventId);
    return json({
      verified: true,
      event: {
        id: event.id,
        status: event.status,
        htmlLink: event.htmlLink ?? null,
        start: event.start ?? null,
        end: event.end ?? null,
        hangoutLink: event.hangoutLink ?? null,
        attendees: event.attendees ?? [],
      },
    });
  } catch (error) {
    console.error('verify-calendar-event error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unable to verify calendar event.' }, 500);
  }
});
