// Multi-turn conversational assistant for the Session Intelligence panel, scoped to one
// family. Admin-only. Grounds every reply in that family's actual case data and session
// content -- and, like family-session-analysis, refuses to apply or invent a clinical
// framework since none has been configured yet (see clinical_analysis_rules).
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { generateText, GeminiError } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestPayload {
  householdId?: string;
  sessionId?: string;
  message?: string;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
    const { householdId, sessionId, message } = payload;
    if (!householdId || !message?.trim()) {
      return json({ error: 'householdId and a non-empty message are required.', code: 'INVALID_PAYLOAD' }, 400);
    }
    if (message.length > 4000) {
      return json({ error: 'Message exceeds the maximum allowed length.', code: 'MESSAGE_TOO_LONG' }, 400);
    }

    const [{ data: household }, { data: members }, { data: sessions }, { data: rules }, { data: history }] = await Promise.all([
      adminClient.from('households').select('family_name, presenting_issue, working_plan, next_step').eq('id', householdId).maybeSingle(),
      adminClient.from('household_members').select('full_name, role, birth_year').eq('household_id', householdId),
      adminClient
        .from('case_sessions')
        .select('id, session_date, status, session_content(content_type, content)')
        .eq('household_id', householdId)
        .order('session_date', { ascending: true }),
      adminClient.from('clinical_analysis_rules').select('framework_name, instructions').eq('is_active', true).limit(1).maybeSingle(),
      adminClient
        .from('session_chat_messages')
        .select('sender, content')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true })
        .limit(20),
    ]);

    if (!household) return json({ error: 'Family case not found.', code: 'HOUSEHOLD_NOT_FOUND' }, 404);

    const membersBlock = (members ?? [])
      .map((m) => `${m.role}: ${m.full_name}${m.birth_year ? ` (age ${new Date().getFullYear() - m.birth_year})` : ''}`)
      .join('\n');

    const sessionsBlock = (sessions ?? [])
      .map((s) => {
        const content = (s.session_content ?? [])
          .filter((c: { content: string | null }) => c.content)
          .map((c: { content_type: string; content: string }) => `[${c.content_type}] ${c.content}`)
          .join('\n');
        return `Session ${new Date(s.session_date).toISOString().slice(0, 10)} (${s.status}):\n${content || '(no content recorded)'}`;
      })
      .join('\n\n');

    const frameworkNote = rules
      ? `Analyze using this configured framework, and no other: ${rules.framework_name} — ${rules.instructions}`
      : 'No clinical or psychological framework has been configured for this practice yet. Do not diagnose, apply a named framework, or invent categories. Stick to what is literally observable in the notes below.';

    const systemInstruction = `You are Session Intelligence, an assistant helping a parent coach (Mai) review her own notes for one family. ${frameworkNote}

Family: ${household.family_name}
Members:
${membersBlock || '(none recorded)'}
Presenting issue: ${household.presenting_issue || '(not recorded)'}
Working plan: ${household.working_plan || '(not recorded)'}
Next step: ${household.next_step || '(not recorded)'}

Session history:
${sessionsBlock || '(no sessions recorded yet)'}

Only use the information above. If asked something it doesn't cover, say so rather than guessing. You may summarize, spot patterns across sessions, and help draft follow-up messages to the family.`;

    const conversation = (history ?? [])
      .map((h) => `${h.sender === 'admin' ? 'Mai' : 'Assistant'}: ${h.content}`)
      .join('\n');
    const prompt = `${conversation ? conversation + '\n' : ''}Mai: ${message}`;

    const replyText = await generateText(prompt, { systemInstruction, maxOutputTokens: 1536 });

    const { error: insertErr } = await adminClient.from('session_chat_messages').insert([
      { household_id: householdId, session_id: sessionId ?? null, sender: 'admin', content: message },
      { household_id: householdId, session_id: sessionId ?? null, sender: 'assistant', content: replyText },
    ]);
    if (insertErr) console.error('session-chat: failed to persist messages:', insertErr);

    return json({ reply: replyText });
  } catch (error) {
    if (error instanceof GeminiError) {
      return json({ error: error.message, code: 'GEMINI_ERROR' }, 502);
    }
    console.error('session-chat error:', error);
    return json({ error: 'Unable to process the request.', code: 'INTERNAL_ERROR' }, 500);
  }
});
