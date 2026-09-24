import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

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

/**
 * Constant-time string comparison using SHA-256 hashing via Web Crypto.
 * Pre-hashing guarantees both buffers are exactly 32 bytes, eliminating timing leaks
 * based on input length, while the XOR loop prevents early-exit timing leaks.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const bufA = new Uint8Array(hashA);
  const bufB = new Uint8Array(hashB);
  let diff = 0;
  for (let i = 0; i < 32; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const expectedPassword = Deno.env.get('FAMILY_SESSIONS_PASSWORD');

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server configuration error: missing database credentials.', code: 'SERVER_MISCONFIGURED' }, 500);
    }

    if (!expectedPassword) {
      return json({ error: 'Server configuration error: FAMILY_SESSIONS_PASSWORD is not set.', code: 'SERVER_MISCONFIGURED' }, 500);
    }

    // 1. Verify Authorization header & Admin role
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;
    if (!token) {
      return json({ error: 'Unauthorized: Missing Authorization header.', code: 'AUTH_TOKEN_MISSING' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: 'Unauthorized: Invalid or expired session token.', code: 'AUTH_TOKEN_INVALID' }, 401);
    }

    const userId = userData.user.id;

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return json({ error: 'Failed to verify admin profile.', code: 'PROFILE_FETCH_FAILED' }, 500);
    }

    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden: Admin access required.', code: 'ADMIN_REQUIRED' }, 403);
    }

    // 2. Brute-force guard: 5 failed attempts per admin in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failedAttempts, error: countErr } = await adminClient
      .from('family_unlock_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', userId)
      .eq('success', false)
      .gte('created_at', fifteenMinutesAgo);

    if (countErr) {
      console.error('Error querying failed attempts:', countErr);
      return json({ error: 'Failed to verify security rate limits.', code: 'RATE_LIMIT_CHECK_FAILED' }, 500);
    }

    if ((failedAttempts ?? 0) >= 5) {
      return json({
        error: 'Too many failed unlock attempts. Please wait 15 minutes before trying again.',
        code: 'RATE_LIMITED',
      }, 429);
    }

    // 3. Parse password from body
    let passwordInput = '';
    try {
      const body = await request.json();
      if (typeof body?.password === 'string') {
        passwordInput = body.password;
      }
    } catch {
      return json({ error: 'Invalid JSON request payload.', code: 'INVALID_JSON' }, 400);
    }

    // 4. Constant-time comparison
    const isMatch = await timingSafeEqual(passwordInput, expectedPassword);

    // 5. Log attempt
    await adminClient.from('family_unlock_attempts').insert({
      admin_id: userId,
      success: isMatch,
    });

    if (!isMatch) {
      return json({
        error: 'Incorrect Family Sessions password.',
        code: 'INVALID_PASSWORD',
      }, 401);
    }

    // 6. Record 8-hour unlock on success
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { error: unlockInsertError } = await adminClient.from('family_unlocks').insert({
      admin_id: userId,
      expires_at: expiresAt,
    });

    if (unlockInsertError) {
      console.error('Failed to record family unlock:', unlockInsertError);
      return json({ error: 'Failed to record session unlock.', code: 'UNLOCK_RECORD_FAILED' }, 500);
    }

    return json({
      success: true,
      message: 'Family Sessions unlocked.',
      expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return json({ error: `Internal server error: ${message}`, code: 'INTERNAL_ERROR' }, 500);
  }
});
