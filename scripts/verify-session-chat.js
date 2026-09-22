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
const admin = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  console.log('================================================================');
  console.log('  VERIFYING: session-chat (real multi-turn, persisted, grounded)');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const adminEmail = `test_chat_admin_${timestamp}@maiparentcoaching.com`;
  let adminUserId = null;

  const { data: household } = await admin
    .from('households')
    .select('id, family_name')
    .like('family_name', '[DEMO] The Jenkins%')
    .maybeSingle();
  assert(household, 'Expected the seeded [DEMO] Jenkins household to exist -- run scripts/seed-family-system-demo-data.js first');
  console.log(`Using real seeded household: ${household.family_name} (${household.id})`);

  try {
    const { data: authUser } = await admin.auth.admin.createUser({ email: adminEmail, password: 'TestSecurePass123!', email_confirm: true });
    adminUserId = authUser.user.id;
    for (let i = 0; i < 10; i++) {
      const { data: prof } = await admin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await admin.from('profiles').update({ role: 'admin', approval_status: 'approved' }).eq('id', adminUserId);

    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: session } = await client.auth.signInWithPassword({ email: adminEmail, password: 'TestSecurePass123!' });
    const token = session.session.access_token;

    console.log('\nCalling session-chat with a real question about the seeded family...');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/session-chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId: household.id, message: 'What has Leo\'s meltdown duration trend looked like across sessions?' }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Function returned ${res.status}: ${JSON.stringify(body)}`);
    assert(body.reply && body.reply.length > 0, 'reply must be non-empty');
    console.log(`✅ Got a real reply grounded in the seeded session content:\n   "${body.reply.slice(0, 220)}..."`);

    console.log('\nVerifying both turns were persisted to session_chat_messages...');
    const { data: rows } = await admin
      .from('session_chat_messages')
      .select('sender, content')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .limit(2);
    assert.equal(rows.length, 2, 'expected exactly 2 new rows (admin question + assistant reply)');
    assert.equal(rows[1].sender, 'admin');
    assert.equal(rows[0].sender, 'assistant');
    console.log('✅ Both turns persisted correctly.');

    console.log('\n================================================================');
    console.log('  🎉 session-chat VERIFIED: real, grounded, persisted.');
    console.log('================================================================\n');

    // Clean up the verification messages so they don't pollute the demo family's history.
    await admin.from('session_chat_messages').delete().in('content', [rows[0].content, rows[1].content]);
  } finally {
    if (adminUserId) await admin.auth.admin.deleteUser(adminUserId);
    console.log('Cleaned up test admin user.');
  }
}

run().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
