// Extensive Per-Member Clinical Study for the family/household case system.
// Admin-only. Gathers session_content for all sessions attended by a specific household member
// and generates a focused, evidence-based longitudinal study.
//
// Hard rule: Mai's actual clinical assessment framework has not been captured yet
// (see project-plan/family-system/decisions.md). If public.clinical_analysis_rules has no
// active row, this function must NOT let Gemini invent a clinical methodology, diagnostic
// language, or categories on its own -- it must produce a plain, framework-free pattern
// summary quoting direct session evidence and say so explicitly in the response.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { generateText, GeminiError } from '../_shared/gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestPayload {
  householdId?: string;
  memberId?: string;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const NO_FRAMEWORK_NOTICE =
  'No clinical framework configured yet for this practice — this is a raw observational pattern summary, not a clinical diagnostic assessment.';

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

    const { householdId, memberId } = payload;
    if (!householdId || typeof householdId !== 'string' || !memberId || typeof memberId !== 'string') {
      return json({ error: 'householdId and memberId are both required.', code: 'INVALID_PAYLOAD' }, 400);
    }

    // 1. Fetch household and member details
    const [{ data: household, error: householdErr }, { data: member, error: memberErr }] = await Promise.all([
      adminClient.from('households').select('id, family_name, presenting_issue, working_plan').eq('id', householdId).maybeSingle(),
      adminClient.from('household_members').select('*').eq('id', memberId).eq('household_id', householdId).maybeSingle(),
    ]);

    if (householdErr || !household) return json({ error: 'Family case household not found.', code: 'HOUSEHOLD_NOT_FOUND' }, 404);
    if (memberErr || !member) return json({ error: 'Household member not found.', code: 'MEMBER_NOT_FOUND' }, 404);

    // 2. Fetch session attendee records for this member
    const { data: attendeeRows, error: attendeeErr } = await adminClient
      .from('session_attendees')
      .select('session_id')
      .eq('household_member_id', memberId);
    if (attendeeErr) return json({ error: 'Failed to fetch attendee records.', code: 'ATTENDEES_FETCH_FAILED' }, 500);

    const attendedSessionIds = (attendeeRows ?? []).map((r) => r.session_id);
    if (attendedSessionIds.length === 0) {
      return json({
        text: `No attended sessions are currently recorded for ${member.full_name}. Once sessions are attended and documented, a detailed longitudinal study can be generated.`,
        frameworkConfigured: false,
        sessionsAnalyzed: 0,
        memberName: member.full_name,
      });
    }

    // 3. Fetch matching sessions and content
    const { data: sessions, error: sessionsErr } = await adminClient
      .from('case_sessions')
      .select('id, session_date, status')
      .in('id', attendedSessionIds)
      .order('session_date', { ascending: true });
    if (sessionsErr) return json({ error: 'Failed to load case sessions.', code: 'SESSIONS_FETCH_FAILED' }, 500);

    const { data: content, error: contentErr } = await adminClient
      .from('session_content')
      .select('session_id, content_type, content')
      .in('session_id', attendedSessionIds);
    if (contentErr) return json({ error: 'Failed to load session content.', code: 'CONTENT_FETCH_FAILED' }, 500);

    // 4. Check for active clinical framework
    const { data: rules, error: rulesErr } = await adminClient
      .from('clinical_analysis_rules')
      .select('framework_name, instructions')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (rulesErr) return json({ error: 'Failed to query clinical analysis rules.', code: 'RULES_FETCH_FAILED' }, 500);

    const frameworkConfigured = Boolean(rules);

    // 5. Structure sessions context
    const sessionsBlock = (sessions ?? [])
      .map((s) => {
        const pieces = (content ?? [])
          .filter((c) => c.session_id === s.id && c.content?.trim())
          .map((c) => `[${c.content_type}]\n${c.content}`)
          .join('\n\n');
        return `--- Session on ${new Date(s.session_date).toISOString().slice(0, 10)} (Status: ${s.status}) ---\n${pieces || '(no written notes recorded for this session)'}`;
      })
      .join('\n\n');

    const systemInstruction = frameworkConfigured
      ? `You are assisting a parent coach and child psychologist. Analyze this specific family member's observable behaviors, progress, and recurring patterns strictly using the following configured framework, and no other. Do not introduce concepts outside it.\n\nFramework: ${rules!.framework_name}\n${rules!.instructions}`
      : `You are assisting a parent coach and child psychologist. No clinical or psychological framework has been configured for this practice yet. You must NOT diagnose, apply any named clinical/psychological framework, or invent psychiatric categories. Only: (1) summarize concrete, observable progress and relational shifts for this specific family member across their attended sessions in warm, clear, professional language, (2) note any recurring behavioral patterns, emotional responses, or verbatim statements/phrases directly quoting them, and (3) highlight specific interactions observed between this member and other family members or the coach. Do not speculate about underlying pathologies or unstated mental states.`;

    const currentYear = new Date().getFullYear();
    const ageContext = member.birth_year ? `Approx. age ${currentYear - member.birth_year} (born ${member.birth_year})` : 'Age not recorded';

    const prompt = `Member Profile:
- Full Name: ${member.full_name}
- Role in Family: ${member.role}
- Age: ${ageContext}
- Member Notes on File: ${member.notes || 'None recorded'}
- Family Case: ${household.family_name}
${household.presenting_issue ? `- Presenting Issue: ${household.presenting_issue}` : ''}
${household.working_plan ? `- Working Plan: ${household.working_plan}` : ''}

Attended Coaching Sessions (${sessions?.length ?? 0} sessions, in chronological order):
${sessionsBlock}

Provide an extensive, thorough individual study focused specifically on ${member.full_name}:
1) Individual Progress & Observed Trajectory: How has ${member.full_name} engaged, responded, or shifted across these sessions?
2) Observable Behavioral, Emotional & Relational Patterns: Note specific recurring reactions, direct quotes, or recurring themes grounded in the notes.
3) Actionable Continuity Notes: Key observations to keep in mind for future coaching sessions involving this member.`;

    const analysisText = await generateText(prompt, { systemInstruction, maxOutputTokens: 2500 });
    const text = frameworkConfigured ? analysisText : `${NO_FRAMEWORK_NOTICE}\n\n${analysisText}`;

    return json({
      text,
      frameworkConfigured,
      sessionsAnalyzed: sessions?.length ?? 0,
      memberName: member.full_name,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return json({ error: error.message, code: 'GEMINI_ERROR' }, 502);
    }
    console.error('family-member-study error:', error);
    return json({ error: 'Unable to process the study request.', code: 'INTERNAL_ERROR' }, 500);
  }
});
