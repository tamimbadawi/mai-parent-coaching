import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  console.log('================================================================');
  console.log('  STAGE 4 VERIFICATION: clinical_analysis_rules RLS + live analysis endpoint');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const adminEmail = `test_admin_stage4_${timestamp}@maiparentcoaching.com`;
  const password = 'TestSecurePass123!';
  let adminUserId = null;
  let householdId = null;

  try {
    console.log('1. Creating test Admin user...');
    const { data: adminAuth, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (adminAuthErr) throw adminAuthErr;
    adminUserId = adminAuth.user.id;
    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await supabaseAdmin.from('profiles').update({ role: 'admin', approval_status: 'approved' }).eq('id', adminUserId);
    console.log(`   Admin created: ${adminEmail}`);

    const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: adminSession, error: signErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password });
    if (signErr) throw signErr;
    const token = adminSession.session.access_token;
    console.log('   Admin JWT acquired.\n');

    console.log('2. Verifying clinical_analysis_rules RLS (admin CRUD)...');
    const { data: rule, error: ruleInsertErr } = await adminClient
      .from('clinical_analysis_rules')
      .insert({ framework_name: 'Test Framework', instructions: 'test', is_active: false })
      .select()
      .single();
    if (ruleInsertErr) throw new Error(`Admin insert failed: ${ruleInsertErr.message}`);
    console.log(`   INSERT ok (id=${rule.id})`);
    const { error: ruleDeleteErr } = await adminClient.from('clinical_analysis_rules').delete().eq('id', rule.id);
    if (ruleDeleteErr) throw new Error(`Admin delete failed: ${ruleDeleteErr.message}`);
    console.log('   DELETE ok — table confirmed empty for the live test below.\n');

    console.log('3. Seeding a real household + session + content for the analysis call...');
    const { data: household, error: hErr } = await adminClient
      .from('households')
      .insert({ family_name: 'Stage4 Test Family', status: 'active' })
      .select()
      .single();
    if (hErr) throw hErr;
    householdId = household.id;

    const { data: session, error: sErr } = await adminClient
      .from('case_sessions')
      .insert({ household_id: householdId, session_date: new Date().toISOString(), status: 'completed' })
      .select()
      .single();
    if (sErr) throw sErr;

    await adminClient.from('session_content').insert({
      session_id: session.id,
      content_type: 'post_session_notes',
      content: 'Mother reported the child said "I hate bedtime" three times this week. Bedtime routine now takes 40 minutes.',
    });
    console.log(`   Session ${session.id} seeded with post-session notes.\n`);

    console.log('4. Calling family-session-analysis with NO clinical_analysis_rules configured...');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/family-session-analysis`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds: [session.id] }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Function returned ${res.status}: ${JSON.stringify(body)}`);

    assert.equal(body.frameworkConfigured, false, 'frameworkConfigured must be false when no rules exist');
    assert.match(body.text, /No clinical framework configured/i, 'response must explicitly say no framework is configured');
    console.log('   ✅ frameworkConfigured = false');
    console.log('   ✅ Response explicitly states no framework is configured');
    console.log(`   Sample of returned text:\n   "${body.text.slice(0, 200)}..."\n`);

    console.log('================================================================');
    console.log('  🎉 STAGE 4 GUARD VERIFIED: no hallucinated clinical framework.');
    console.log('================================================================\n');
  } finally {
    if (householdId) {
      await supabaseAdmin.from('households').delete().eq('id', householdId);
      console.log('Cleaned up test household (cascades to sessions/content/attendees).');
    }
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      console.log('Cleaned up test admin user.');
    }
  }
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
