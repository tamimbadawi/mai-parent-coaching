// Multi-session pattern analysis for the family/household case system.
// Admin-only. Gathers session_content for the requested case_sessions and asks Gemini for a
// progress summary + pattern-spotting pass.
//
// Hard rule: Mai's actual clinical assessment framework has not been captured yet
// (see project-plan/family-system/decisions.md). If public.clinical_analysis_rules has no
// active row, this function must NOT let Gemini invent a clinical methodology, diagnostic
// language, or categories on its own -- it must produce a plain, framework-free pattern
// summary and say so explicitly in the response.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { generateText, GeminiError } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestPayload {
  sessionIds?: string[];
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const NO_FRAMEWORK_NOTICE =
  'No clinical framework configured yet for this practice — this is a raw pattern summary only, not a clinical assessment.';

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
    if (!token) return json({ error: 'Unauthorized: Missing or invalid Authorization header.', code: 'AUTH_TOKEN_MISSING' }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: 'Unauthorized: Invalid or expired session token.', code: 'AUTH_TOKEN_INVALID' }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) return json({ error: 'Failed to verify admin privileges.', code: 'PROFILE_FETCH_FAILED' }, 500);
    if (!profile || profile.role !== 'admin') return json({ error: 'Forbidden: Admin access required.', code: 'ADMIN_REQUIRED' }, 403);

    let payload: RequestPayload;
    try {
      payload = (await request.json()) as RequestPayload;
    } catch {
      return json({ error: 'Invalid JSON request payload.', code: 'INVALID_JSON' }, 400);
    }

    const sessionIds = Array.isArray(payload?.sessionIds) ? payload.sessionIds.filter((id) => typeof id === 'string') : [];
    if (sessionIds.length === 0) {
      return json({ error: 'At least one sessionId is required.', code: 'INVALID_PAYLOAD' }, 400);
    }
    if (sessionIds.length > 50) {
      return json({ error: 'Too many sessions selected (max 50).', code: 'TOO_MANY_SESSIONS' }, 400);
    }

    const { data: sessions, error: sessionsErr } = await adminClient
      .from('case_sessions')
      .select('id, session_date, status')
      .in('id', sessionIds)
      .order('session_date', { ascending: true });
    if (sessionsErr) return json({ error: 'Failed to load sessions.', code: 'SESSIONS_FETCH_FAILED' }, 500);
    if (!sessions || sessions.length === 0) {
      return json({ error: 'No matching sessions found.', code: 'SESSIONS_NOT_FOUND' }, 404);
    }

    const { data: content, error: contentErr } = await adminClient
      .from('session_content')
      .select('session_id, content_type, content')
      .in('session_id', sessionIds);
    if (contentErr) return json({ error: 'Failed to load session content.', code: 'CONTENT_FETCH_FAILED' }, 500);

    const { data: rules, error: rulesErr } = await adminClient
      .from('clinical_analysis_rules')
      .select('framework_name, instructions')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (rulesErr) return json({ error: 'Failed to load clinical analysis rules.', code: 'RULES_FETCH_FAILED' }, 500);

    const frameworkConfigured = Boolean(rules);

    const sessionsBlock = sessions
      .map((s) => {
        const pieces = (content ?? [])
          .filter((c) => c.session_id === s.id && c.content)
          .map((c) => `[${c.content_type}]\n${c.content}`)
          .join('\n\n');
        return `--- Session ${new Date(s.session_date).toISOString().slice(0, 10)} (${s.status}) ---\n${pieces || '(no content recorded)'}`;
      })
      .join('\n\n');

    const systemInstruction = frameworkConfigured
      ? `You are assisting a parent coach. Analyze the session notes strictly using the following configured framework, and no other. Do not introduce concepts outside it.\n\nFramework: ${rules!.framework_name}\n${rules!.instructions}`
      : `You are assisting a parent coach. No clinical or psychological framework has been configured for this practice yet. You must NOT diagnose, apply any named clinical/psychological framework, or invent categories. Only: (1) summarize concrete, observable progress across the sessions in plain language, and (2) note any literally repeated behaviors, phrases, or topics that appear more than once, quoting them. Do not speculate about underlying causes or mental states.`;

    const prompt = `Here are ${sessions.length} coaching session record(s) for one family, in chronological order:\n\n${sessionsBlock}\n\nProvide: 1) a written progress summary across these sessions, 2) any recurring patterns you can point to with direct evidence from the text above.`;

    const analysisText = await generateText(prompt, { systemInstruction, maxOutputTokens: 2048 });

    const text = frameworkConfigured ? analysisText : `${NO_FRAMEWORK_NOTICE}\n\n${analysisText}`;

    return json({ text, frameworkConfigured, sessionsAnalyzed: sessions.length });
  } catch (error) {
    if (error instanceof GeminiError) {
      return json({ error: error.message, code: 'GEMINI_ERROR' }, 502);
    }
    console.error('family-session-analysis error:', error);
    return json({ error: 'Unable to process the request.', code: 'INTERNAL_ERROR' }, 500);
  }
});
