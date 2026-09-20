import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WhatsAppAction = 'status' | 'qr' | 'reset';

interface RequestPayload {
  action: WhatsAppAction;
  confirm?: string;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request: Request) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    // 1. Verify environment configuration for Supabase Auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return json(
        {
          error: 'Server configuration error: Supabase service role credentials missing.',
          code: 'SERVER_MISCONFIGURED',
        },
        500
      );
    }

    // 2. Validate incoming Supabase Auth Bearer Token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;

    if (!token) {
      return json(
        {
          error: 'Unauthorized: Missing or invalid Authorization header.',
          code: 'AUTH_TOKEN_MISSING',
        },
        401
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return json(
        {
          error: 'Unauthorized: Invalid or expired session token.',
          code: 'AUTH_TOKEN_INVALID',
        },
        401
      );
    }

    const userId = userData.user.id;

    // 3. Verify admin role in profiles table server-side
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role, approval_status')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return json(
        {
          error: 'Failed to verify admin privileges.',
          code: 'PROFILE_FETCH_FAILED',
        },
        500
      );
    }

    if (!profile || profile.role !== 'admin') {
      return json(
        {
          error: 'Forbidden: Admin access required.',
          code: 'ADMIN_REQUIRED',
        },
        403
      );
    }

    // 4. Validate payload and action allowlist
    let payload: RequestPayload;
    try {
      payload = (await request.json()) as RequestPayload;
    } catch {
      return json(
        {
          error: 'Invalid JSON request payload.',
          code: 'INVALID_JSON',
        },
        400
      );
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ error: 'Request body must be a JSON object.', code: 'INVALID_PAYLOAD' }, 400);
    }

    const { action, confirm } = payload;
    const allowedActions: WhatsAppAction[] = ['status', 'qr', 'reset'];

    if (!action || !allowedActions.includes(action)) {
      return json(
        {
          error: `Invalid action. Allowed actions: ${allowedActions.join(', ')}.`,
          code: 'INVALID_ACTION',
        },
        400
      );
    }

    if (action === 'reset' && confirm !== 'yes') {
      return json(
        {
          error: 'Confirmation required: payload must include {"confirm": "yes"} to reset session.',
          code: 'CONFIRMATION_REQUIRED',
        },
        400
      );
    }

    // 5. Check upstream WhatsApp microservice credentials
    const rawServiceUrl = Deno.env.get('WHATSAPP_SERVICE_URL');
    const serviceSecret = Deno.env.get('WHATSAPP_API_SECRET_KEY');

    if (!rawServiceUrl || !serviceSecret) {
      return json(
        {
          error: 'WhatsApp companion service is not configured on the server. WHATSAPP_SERVICE_URL or WHATSAPP_API_SECRET_KEY is unset.',
          code: 'WHATSAPP_NOT_CONFIGURED',
        },
        503
      );
    }

    let serviceUrl: URL;
    try {
      serviceUrl = new URL(rawServiceUrl);
    } catch {
      return json({ error: 'WhatsApp service URL is invalid.', code: 'WHATSAPP_NOT_CONFIGURED' }, 503);
    }
    if (serviceUrl.protocol !== 'https:' || serviceUrl.username || serviceUrl.password || serviceUrl.search || serviceUrl.hash) {
      return json({ error: 'WhatsApp service URL must use HTTPS.', code: 'WHATSAPP_NOT_CONFIGURED' }, 503);
    }
    const cleanServiceUrl = serviceUrl.href.replace(/\/+$/, '');

    // 6. Map action to upstream microservice endpoint
    let targetUrl: string;
    let targetMethod: string;
    let targetHeaders: Record<string, string> = {
      Authorization: `Bearer ${serviceSecret}`,
    };
    let targetBody: string | undefined;

    if (action === 'status') {
      targetUrl = `${cleanServiceUrl}/status`;
      targetMethod = 'GET';
    } else if (action === 'qr') {
      targetUrl = `${cleanServiceUrl}/qr?format=json`;
      targetMethod = 'GET';
      targetHeaders = {
        ...targetHeaders,
        Accept: 'application/json',
      };
    } else {
      // action === 'reset'
      targetUrl = `${cleanServiceUrl}/reset-session`;
      targetMethod = 'POST';
      targetHeaders = {
        ...targetHeaders,
        'Content-Type': 'application/json',
      };
      targetBody = JSON.stringify({ confirm: 'yes' });
    }

    // 7. Forward request with bounded timeout (8000ms)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: targetMethod,
        headers: targetHeaders,
        body: targetBody,
        signal: controller.signal,
        redirect: 'error',
      });

      clearTimeout(timeoutId);

      const upstreamText = await upstreamResponse.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(upstreamText);
      } catch {
        return json({ error: 'WhatsApp service returned an invalid response.', code: 'UPSTREAM_INVALID_RESPONSE' }, 502);
      }

      return json(parsedData, upstreamResponse.status);
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);

      const isAbort = (fetchErr as Error)?.name === 'AbortError';
      if (isAbort) {
        return json(
          {
            error: 'Upstream WhatsApp companion service timed out after 8s.',
            code: 'UPSTREAM_TIMEOUT',
          },
          504
        );
      }

      return json(
        {
          error: 'Unable to reach upstream WhatsApp companion service. The Oracle VM microservice may be offline or starting up.',
          code: 'UPSTREAM_UNAVAILABLE',
        },
        502
      );
    }
  } catch (_err: unknown) {
    return json(
      {
        error: 'Internal error processing WhatsApp management request.',
        code: 'INTERNAL_ERROR',
      },
      500
    );
  }
});
