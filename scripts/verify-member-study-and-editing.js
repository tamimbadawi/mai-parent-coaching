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
  console.log('  VERIFICATION: Household Member Edit + Attendance Operations');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const adminEmail = `test_admin_member_study_${timestamp}@maiparentcoaching.com`;
  const password = 'TestSecurePass123!';
  let adminUserId = null;
  let householdId = null;

  try {
    console.log('1. Setting up temporary admin user...');
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

    const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: adminSession, error: signErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password });
    if (signErr) throw signErr;
    console.log('   ✅ Admin logged in and authenticated.');

    console.log('\n2. Creating test household and initial member...');
    const { data: household, error: hErr } = await adminClient
      .from('households')
      .insert({
        primary_contact_profile_id: adminUserId,
        family_name: 'The Study Test Family',
        presenting_issue: 'Bedtime anxiety and morning school resistance',
        working_plan: 'Calm nervous system cues during transitions',
      })
      .select()
      .single();
    if (hErr) throw hErr;
    householdId = household.id;

    const { data: member, error: mErr } = await adminClient
      .from('household_members')
      .insert({
        household_id: household.id,
        full_name: 'Lucas Test',
        role: 'child',
        birth_year: 2018,
        notes: 'Initial observation note.',
      })
      .select()
      .single();
    if (mErr) throw mErr;
    console.log(`   ✅ Household created (ID: ${householdId}), Member created: ${member.full_name}`);

    console.log('\n3. Testing member inline update (name, role, birth_year, notes)...');
    const { data: updatedMember, error: uErr } = await adminClient
      .from('household_members')
      .update({
        full_name: 'Lucas Alexander Test',
        role: 'child',
        birth_year: 2017,
        notes: 'Updated clinical observation: Highly responsive to somatic breathing exercises.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)
      .select()
      .single();
    if (uErr) throw uErr;

    assert.equal(updatedMember.full_name, 'Lucas Alexander Test');
    assert.equal(updatedMember.birth_year, 2017);
    assert.match(updatedMember.notes, /somatic breathing/);
    console.log('   ✅ Member update successfully persisted to DB with admin RLS permissions.');

    console.log('\n4. Testing session creation and attendance toggling...');
    const { data: session, error: sErr } = await adminClient
      .from('case_sessions')
      .insert({
        household_id: household.id,
        session_date: new Date().toISOString(),
        status: 'completed',
      })
      .select()
      .single();
    if (sErr) throw sErr;
    console.log(`   ✅ Session created: ${session.id}`);

    // Insert attendance
    const { error: attInsertErr } = await adminClient
      .from('session_attendees')
      .insert({ session_id: session.id, household_member_id: member.id });
    if (attInsertErr) throw attInsertErr;

    const { data: attendedList } = await adminClient
      .from('session_attendees')
      .select('session_id')
      .eq('household_member_id', member.id);
    assert.equal(attendedList.length, 1);
    console.log('   ✅ Session attendance successfully recorded.');

    // Remove attendance (toggle off)
    const { error: attDelErr } = await adminClient
      .from('session_attendees')
      .delete()
      .eq('session_id', session.id)
      .eq('household_member_id', member.id);
    if (attDelErr) throw attDelErr;

    const { data: attendedListAfter } = await adminClient
      .from('session_attendees')
      .select('session_id')
      .eq('household_member_id', member.id);
    assert.equal(attendedListAfter.length, 0);
    console.log('   ✅ Session attendance toggle-off (delete) confirmed.');

    console.log('\n================================================================');
    console.log('  🎉 ALL MEMBER EDITING & ATTENDANCE OPERATIONS VERIFIED!');
    console.log('================================================================\n');
  } finally {
    if (householdId) {
      await supabaseAdmin.from('households').delete().eq('id', householdId);
      console.log('Cleaned up test household and cascading relations.');
    }
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      console.log('Cleaned up test admin user.');
    }
  }
}

run().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
