// General-purpose Gemini text-generation endpoint, usable from any admin section of the site.
// Admin-only: this proxies a paid AI API, so it must never be reachable by unauthenticated
// or non-admin callers. Extend the role check here if a non-admin use case is added later.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { generateText, generateFromImage, GeminiError } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestPayload {
  prompt?: string;
  systemInstruction?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server configuration error.', code: 'SERVER_MISCONFIGURED' }, 500);
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim() || null;
    if (!token) {
      return json({ error: 'Unauthorized: Missing or invalid Authorization header.', code: 'AUTH_TOKEN_MISSING' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: 'Unauthorized: Invalid or expired session token.', code: 'AUTH_TOKEN_INVALID' }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError) {
      return json({ error: 'Failed to verify admin privileges.', code: 'PROFILE_FETCH_FAILED' }, 500);
    }
    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden: Admin access required.', code: 'ADMIN_REQUIRED' }, 403);
    }

    let payload: RequestPayload;
    try {
      payload = (await request.json()) as RequestPayload;
    } catch {
      return json({ error: 'Invalid JSON request payload.', code: 'INVALID_JSON' }, 400);
    }

    if (!payload?.prompt || typeof payload.prompt !== 'string' || !payload.prompt.trim()) {
      return json({ error: 'A non-empty "prompt" string is required.', code: 'INVALID_PAYLOAD' }, 400);
    }
    if (payload.prompt.length > 20000) {
      return json({ error: 'Prompt exceeds the maximum allowed length.', code: 'PROMPT_TOO_LONG' }, 400);
    }
    if (payload.imageBase64 && payload.imageBase64.length > 8_000_000) {
      return json({ error: 'Image exceeds the maximum allowed size.', code: 'IMAGE_TOO_LARGE' }, 400);
    }

    const text = payload.imageBase64
      ? await generateFromImage(
          payload.imageBase64,
          payload.imageMimeType || 'image/jpeg',
          payload.prompt,
          { systemInstruction: payload.systemInstruction }
        )
      : await generateText(payload.prompt, { systemInstruction: payload.systemInstruction });

    return json({ text });
  } catch (error) {
    if (error instanceof GeminiError) {
      return json({ error: error.message, code: 'GEMINI_ERROR' }, 502);
    }
    console.error('gemini-generate error:', error);
    return json({ error: 'Unable to process the request.', code: 'INTERNAL_ERROR' }, 500);
  }
});
