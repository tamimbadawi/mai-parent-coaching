import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
    const plainServiceKey = (Deno.env.get('SERVICE_ROLE_KEY') ?? '').trim();
    const serviceRoleKey = supabaseServiceKey || plainServiceKey;

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfigured: credentials missing.' }, 500);
    }

    // Authenticate caller (service role or admin)
    const authHeader = request.headers.get('Authorization');
    const apiKeyHeader = request.headers.get('apikey')?.trim();
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;

    const isServiceRole =
      (token && (token === supabaseServiceKey || token === plainServiceKey)) ||
      (apiKeyHeader && (apiKeyHeader === supabaseServiceKey || apiKeyHeader === plainServiceKey));

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (!isServiceRole) {
      if (!token) {
        return json({ error: 'Unauthorized: Missing Authorization header.' }, 401);
      }
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData?.user) {
        return json({ error: 'Unauthorized: Invalid token.' }, 401);
      }
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        return json({ error: 'Forbidden: Admin or service role required.' }, 403);
      }
    }

    // Optional payload to allow fast-forward testing (e.g. custom test target bookingId)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const now = body?.reference_time ? new Date(body.reference_time) : new Date();
    const results = {
      timestamp: now.toISOString(),
      isFastForwardTest: Boolean(body?.reference_time),
      stalePendingSwept: 0,
      reminder_24h: { evaluated: 0, sent: 0, skipped: 0, failed: 0 },
      reminder_1h: { evaluated: 0, sent: 0, skipped: 0, failed: 0 },
      follow_up: { evaluated: 0, sent: 0, skipped: 0, failed: 0 },
    };

    // 1. Stale pending recovery: Sweep rows pending > 5 minutes
    let sweptCount = 0;
    try {
      const { data } = await supabaseAdmin.rpc('sweep_stale_whatsapp_messages', { timeout_minutes: 5 });
      sweptCount = data || 0;
    } catch (err: any) {
      console.warn('sweep_stale_whatsapp_messages rpc error:', err?.message);
    }
    results.stalePendingSwept = sweptCount;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Helper to dispatch through whatsapp-dispatcher
    async function dispatchMessage(trigger: string, bookingId: string) {
      try {
        const dispatchRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            trigger,
            related_booking_id: bookingId,
          }),
        });
        return await dispatchRes.json();
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // 2. Evaluate 24-hour reminders (~23h to ~25h before starts_at)
    // Target window: starts_at between now + 23 hours and now + 25 hours
    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const { data: bookings24h } = await supabaseAdmin
      .from('bookings')
      .select('id, parent_name, phone, starts_at')
      .eq('status', 'confirmed')
      .not('phone', 'is', null)
      .gte('starts_at', window24hStart)
      .lte('starts_at', window24hEnd);

    if (bookings24h && bookings24h.length > 0) {
      results.reminder_24h.evaluated = bookings24h.length;
      for (const b of bookings24h) {
        const outcome = await dispatchMessage('reminder_24h', b.id);
        if (outcome.skipped) {
          results.reminder_24h.skipped++;
        } else if (outcome.success) {
          results.reminder_24h.sent++;
        } else {
          results.reminder_24h.failed++;
        }
      }
    }

    // 3. Evaluate 1-hour reminders (~45m to ~75m before starts_at)
    // Target window: starts_at between now + 45 minutes and now + 75 minutes
    const window1hStart = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    const window1hEnd = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

    const { data: bookings1h } = await supabaseAdmin
      .from('bookings')
      .select('id, parent_name, phone, starts_at')
      .eq('status', 'confirmed')
      .not('phone', 'is', null)
      .gte('starts_at', window1hStart)
      .lte('starts_at', window1hEnd);

    if (bookings1h && bookings1h.length > 0) {
      results.reminder_1h.evaluated = bookings1h.length;
      for (const b of bookings1h) {
        const outcome = await dispatchMessage('reminder_1h', b.id);
        if (outcome.skipped) {
          results.reminder_1h.skipped++;
        } else if (outcome.success) {
          results.reminder_1h.sent++;
        } else {
          results.reminder_1h.failed++;
        }
      }
    }

    // 4. Evaluate post-session follow-ups (24h to 48h after ends_at)
    // Target window: ends_at between now - 48 hours and now - 24 hours
    const windowFollowupStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const windowFollowupEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: bookingsFollowup } = await supabaseAdmin
      .from('bookings')
      .select('id, parent_name, phone, ends_at')
      .in('status', ['confirmed', 'completed'])
      .not('phone', 'is', null)
      .gte('ends_at', windowFollowupStart)
      .lte('ends_at', windowFollowupEnd);

    if (bookingsFollowup && bookingsFollowup.length > 0) {
      results.follow_up.evaluated = bookingsFollowup.length;
      for (const b of bookingsFollowup) {
        const outcome = await dispatchMessage('follow_up', b.id);
        if (outcome.skipped) {
          results.follow_up.skipped++;
        } else if (outcome.success) {
          results.follow_up.sent++;
        } else {
          results.follow_up.failed++;
        }
      }
    }

    // 5. Explicit Test Harness Hook: If caller explicitly passed a test target
    // { test_trigger: 'reminder_1h' | 'reminder_24h' | 'follow_up', test_booking_id: 'uuid' }
    if (body?.test_trigger && body?.test_booking_id) {
      const testOutcome = await dispatchMessage(body.test_trigger, body.test_booking_id);
      return json({
        success: true,
        schedulerResults: results,
        testDispatchOutcome: testOutcome,
      });
    }

    return json({
      success: true,
      schedulerResults: results,
    });
  } catch (err: any) {
    return json({ error: err?.message || 'Scheduler failed', code: 'SCHEDULER_ERROR' }, 500);
  }
});
