import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { getCalendarFreeBusy } from '../_shared/google-calendar.ts';

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

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri =
      Deno.env.get('GOOGLE_REDIRECT_URI') ||
      `${url.origin}/functions/v1/google-calendar-auth?action=callback`;

    // ── 1. Action: Generate Auth URL ───────────────────────────────────────
    if (action === 'auth-url') {
      if (!clientId) {
        return json(
          {
            error:
              'GOOGLE_CLIENT_ID is not configured in Supabase secrets. Please configure it in your Supabase dashboard or CLI.',
          },
          400
        );
      }

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', CALENDAR_SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return json({
        authUrl: authUrl.toString(),
        redirectUri,
        scopes: CALENDAR_SCOPES,
      });
    }

    // ── 2. Action: OAuth Callback Handler ───────────────────────────────────
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const errorParam = url.searchParams.get('error');

      if (errorParam) {
        return new Response(
          `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">` +
            `<h2 style="color:#e11d48;">Google OAuth Authorization Denied</h2>` +
            `<p>${errorParam}</p></body></html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 400 }
        );
      }

      if (!code) {
        return json({ error: 'Missing code parameter in callback.' }, 400);
      }

      if (!clientId || !clientSecret) {
        return json(
          {
            error:
              'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in Supabase secrets.',
          },
          500
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return new Response(
          `<html><body style="font-family:sans-serif;padding:40px;text-align:center;">` +
            `<h2 style="color:#e11d48;">Token Exchange Failed</h2>` +
            `<p>${errorText}</p></body></html>`,
          { headers: { 'Content-Type': 'text/html' }, status: 400 }
        );
      }

      const tokenData = await tokenResponse.json();
      const refreshToken = tokenData.refresh_token;

      if (!refreshToken) {
        return new Response(
          `<html><body style="font-family:sans-serif;padding:40px;">` +
            `<h2 style="color:#d97706;">No Refresh Token Returned</h2>` +
            `<p>Google did not return a refresh token. This happens when authorization was previously granted without <code>prompt=consent</code>.</p>` +
            `<p>Please visit Google Account Permissions, remove access for this app, and try again.</p></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      // Render confirmation screen with setup instructions
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Google Calendar Connected — Mai Website</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF8F5; color: #2D2A26; padding: 40px 20px; line-height: 1.6; }
            .card { max-width: 600px; margin: 0 auto; background: white; border: 1px solid #E6DFD5; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            h1 { font-family: Georgia, serif; font-size: 24px; color: #354F42; margin-top: 0; }
            code { background: #F4F1EA; padding: 3px 8px; border-radius: 6px; font-size: 13px; font-family: monospace; }
            pre { background: #2D2A26; color: #FAF8F5; padding: 14px; border-radius: 12px; overflow-x: auto; font-size: 12px; }
            .badge { display: inline-block; background: #E2EFE7; color: #354F42; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">OAuth Flow Complete</span>
            <h1>Google Calendar Connected</h1>
            <p>Your Google Calendar authorization code was successfully exchanged for a long-lived Refresh Token.</p>
            <p>Set this secret in Supabase using the CLI:</p>
            <pre>supabase secrets set GOOGLE_REFRESH_TOKEN="${refreshToken}"</pre>
            <p style="font-size:13px;color:#736B63;">Once set, the <code>get-availability</code> and <code>create-booking</code> Edge Functions will automatically authenticate with Google Calendar.</p>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // ── 3. Action: Test Connection ──────────────────────────────────────────
    if (request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '') ?? null;
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !serviceRoleKey || !token) {
        return json({ error: 'Unauthorized. Admin access required.' }, 401);
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: userData } = await adminClient.auth.getUser(token);
      if (!userData.user) return json({ error: 'Unauthorized.' }, 401);

      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profile?.role !== 'admin') {
        return json({ error: 'Forbidden. Admin role required.' }, 403);
      }

      // Test FreeBusy query on Google Calendar
      const now = new Date();
      const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const busySlots = await getCalendarFreeBusy(
        now.toISOString(),
        inSevenDays.toISOString()
      );

      return json({
        success: true,
        message: 'Google Calendar API connected successfully.',
        calendarId: Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary',
        busySlotsCount: busySlots.length,
        busySlotsSample: busySlots.slice(0, 5),
      });
    }

    return json({ error: 'Invalid action or request method.' }, 400);
  } catch (err) {
    console.error('google-calendar-auth error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Internal server error',
      },
      500
    );
  }
});
