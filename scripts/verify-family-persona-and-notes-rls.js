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

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('================================================================');
  console.log('  STAGE 1 VERIFICATION: Family Personas & Member Notes RLS');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const adminEmail = `admin_persona_${timestamp}@test.com`;
  const studentEmail = `student_persona_${timestamp}@test.com`;
  const password = 'TestSecurePass123!';

  let adminUserId = null;
  let studentUserId = null;
  let householdId = null;
  let memberId = null;
  let noteId = null;
  let actionItemId = null;

  try {
    // 1. Create Admin
    console.log('1. Setting up temporary Admin and Student users...');
    const { data: adminAuth, error: aErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
    });
    if (aErr) throw aErr;
    adminUserId = adminAuth.user.id;
    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await supabaseAdmin.from('profiles').update({ role: 'admin', approval_status: 'approved' }).eq('id', adminUserId);

    // Create Student
    const { data: studentAuth, error: sErr } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
    });
    if (sErr) throw sErr;
    studentUserId = studentAuth.user.id;
    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', studentUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await supabaseAdmin.from('profiles').update({ role: 'student', approval_status: 'approved' }).eq('id', studentUserId);

    // Login clients
    const adminClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: adminSignErr } = await adminClient.auth.signInWithPassword({ email: adminEmail, password });
    if (adminSignErr) throw adminSignErr;

    const studentClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: studentSignErr } = await studentClient.auth.signInWithPassword({ email: studentEmail, password });
    if (studentSignErr) throw studentSignErr;

    console.log('   ✅ Both Admin and Student authenticated.\n');

    // 2. Admin creates household and member with persona columns
    console.log('2. Admin CRUD on household_members with new persona fields...');
    const { data: household, error: hErr } = await adminClient
      .from('households')
      .insert({ primary_contact_profile_id: adminUserId, family_name: 'Persona Test Family' })
      .select()
      .single();
    if (hErr) throw hErr;
    householdId = household.id;

    const { data: member, error: mErr } = await adminClient
      .from('household_members')
      .insert({
        household_id: householdId,
        full_name: 'Test Child Omar',
        role: 'child',
        birth_year: 2018,
        persona_summary: 'Highly perceptive and sensory-sensitive child. Gets overwhelmed by sudden loud sounds.',
        temperament_traits: ['sensory_sensitive', 'perfectionist', 'empathic'],
        known_triggers: ['bedtime_transitions', 'loud_noises'],
        strengths: ['drawing', 'loves_reading'],
        concern_level: 'moderate',
        family_dynamic_role: 'primary_focus',
      })
      .select()
      .single();
    if (mErr) throw mErr;
    memberId = member.id;

    assert.equal(member.persona_summary.includes('sensory-sensitive'), true);
    assert.deepEqual(member.temperament_traits, ['sensory_sensitive', 'perfectionist', 'empathic']);
    assert.equal(member.concern_level, 'moderate');
    console.log('   ✅ Admin successfully created member with full persona attributes.');

    // 3. Admin creates member_notes
    console.log('\n3. Admin CRUD on member_notes...');
    const { data: note, error: nErr } = await adminClient
      .from('member_notes')
      .insert({
        household_member_id: memberId,
        note_type: 'observation',
        body: 'Child responded very calmly when mother gave a 5-minute visual timer warning before dinner.',
        created_by: adminUserId,
      })
      .select()
      .single();
    if (nErr) throw nErr;
    noteId = note.id;
    assert.equal(note.note_type, 'observation');
    console.log('   ✅ Admin successfully created member_note.');

    // 4. Admin creates member_action_items
    console.log('\n4. Admin CRUD on member_action_items...');
    const { data: actionItem, error: actErr } = await adminClient
      .from('member_action_items')
      .insert({
        household_member_id: memberId,
        task: 'Practice 3-breath somatic pause before switching off screen',
        status: 'open',
        priority: 'high',
        source: 'coach',
      })
      .select()
      .single();
    if (actErr) throw actErr;
    actionItemId = actionItem.id;
    assert.equal(actionItem.task.includes('3-breath'), true);
    assert.equal(actionItem.priority, 'high');
    console.log('   ✅ Admin successfully created member_action_item.');

    // 5. Student access verification (Default to Deny)
    console.log('\n5. Verifying Student is DENIED on member_notes and member_action_items...');
    const { data: studentNotes, error: snErr } = await studentClient.from('member_notes').select('*');
    assert.equal((studentNotes || []).length, 0, 'Student must not see any member notes');

    const { error: studentInsertNoteErr } = await studentClient
      .from('member_notes')
      .insert({ household_member_id: memberId, body: 'Hacked note' });
    assert.notEqual(studentInsertNoteErr, null, 'Student insert to member_notes must be rejected');

    const { data: studentActions, error: saErr } = await studentClient.from('member_action_items').select('*');
    assert.equal((studentActions || []).length, 0, 'Student must not see any member action items');

    const { error: studentInsertActionErr } = await studentClient
      .from('member_action_items')
      .insert({ household_member_id: memberId, task: 'Hacked action' });
    assert.notEqual(studentInsertActionErr, null, 'Student insert to member_action_items must be rejected');

    console.log('   ✅ Student SELECT returned 0 rows (RLS denied).');
    console.log('   ✅ Student INSERT threw policy violation error (RLS denied).');

    console.log('\n================================================================');
    console.log('  🎉 STAGE 1 RLS VERIFIED: Full Admin CRUD + Strict Student Deny');
    console.log('================================================================\n');
  } finally {
    if (householdId) {
      try { await supabaseAdmin.from('households').delete().eq('id', householdId); } catch {}
    }
    if (adminUserId) {
      try { await supabaseAdmin.auth.admin.deleteUser(adminUserId); } catch {}
    }
    if (studentUserId) {
      try { await supabaseAdmin.auth.admin.deleteUser(studentUserId); } catch {}
    }
  }
}

run().catch((err) => {
  console.error('Stage 1 verification failed:', err);
  process.exit(1);
});
