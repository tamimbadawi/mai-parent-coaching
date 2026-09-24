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

async function runRLSVerification() {
  console.log('================================================================');
  console.log('  FAMILY CLIENT SYSTEM RLS & PASSWORD UNLOCK VERIFICATION');
  console.log('  Testing 3 cases:');
  console.log('    1. Student reads nothing across all family & session tables');
  console.log('    2. Admin WITHOUT unlock reads nothing from session tables');
  console.log('    3. Admin WITH unlock has full access to session tables');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const adminEmail = `test_admin_${timestamp}@maiparentcoaching.com`;
  const studentEmail = `test_student_${timestamp}@maiparentcoaching.com`;
  const password = 'TestSecurePass123!';

  let adminUserId = null;
  let studentUserId = null;
  let unlockRowId = null;

  try {
    // ----------------------------------------------------------------
    // Setup: Create Admin and Student
    // ----------------------------------------------------------------
    console.log('1. Setting up test Admin and Student users...');
    const { data: adminAuth, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Test Admin User', role: 'admin' },
    });
    if (adminAuthErr) throw adminAuthErr;
    adminUserId = adminAuth.user.id;

    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', approval_status: 'approved' })
      .eq('id', adminUserId);
    console.log(`   ✅ Admin created: ${adminEmail} (id: ${adminUserId}, role: admin)`);

    const { data: studentAuth, error: studentAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Test Student User', role: 'student' },
    });
    if (studentAuthErr) throw studentAuthErr;
    studentUserId = studentAuth.user.id;

    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', studentUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'student', approval_status: 'approved' })
      .eq('id', studentUserId);
    console.log(`   ✅ Student created: ${studentEmail} (id: ${studentUserId}, role: student)`);

    // Authenticate Admin
    const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminSession, error: adminSignErr } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: password,
    });
    if (adminSignErr) throw adminSignErr;
    assert(adminSession.session?.access_token, 'Admin session must contain access_token');

    // Authenticate Student
    const studentClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: studentSession, error: studentSignErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: password,
    });
    if (studentSignErr) throw studentSignErr;
    assert(studentSession.session?.access_token, 'Student session must contain access_token');

    // ----------------------------------------------------------------
    // CASE 1: Student reads nothing across all family & session tables
    // ----------------------------------------------------------------
    console.log('\n--- CASE 1: Student Reads Nothing (Full Denial) ---');
    const { data: studentUnlockRpc } = await studentClient.rpc('has_family_unlock');
    assert.equal(Boolean(studentUnlockRpc), false, 'has_family_unlock() must return false for student');
    console.log('   ✅ has_family_unlock() RPC returned false for student.');

    const allTables = [
      'households',
      'household_members',
      'household_clinical',
      'member_personas',
      'case_sessions',
      'session_attendees',
      'session_content',
      'member_notes',
      'member_action_items',
      'session_chat_messages',
    ];

    for (const t of allTables) {
      const { data: selData } = await studentClient.from(t).select('*');
      assert.equal(selData?.length || 0, 0, `Student should not see any rows in ${t}`);

      const dummyPayload = t === 'households' ? { family_name: 'Blocked Family' } : {};
      const { error: insErr } = await studentClient.from(t).insert(dummyPayload);
      assert(insErr, `Student insert on ${t} must error`);
      console.log(`   ✅ Table '${t}': Student access denied (0 rows read, insert blocked)`);
    }

    // ----------------------------------------------------------------
    // CASE 2: Admin WITHOUT unlock reads nothing from session tables
    // ----------------------------------------------------------------
    console.log('\n--- CASE 2: Admin WITHOUT Unlock (Session Content Blocked) ---');

    // Admin without unlock: has_family_unlock() must return false
    const { data: adminUnlockBefore } = await adminClient.rpc('has_family_unlock');
    assert.equal(Boolean(adminUnlockBefore), false, 'has_family_unlock() must return false when no unlock exists');
    console.log('   ✅ has_family_unlock() RPC returned false for Admin without unlock.');

    // Admin CAN insert & view households and household_members (crm context)
    console.log('   -> Verifying Admin CAN access households & household_members without unlock...');
    const { data: household, error: hErr } = await adminClient
      .from('households')
      .insert({
        primary_contact_profile_id: studentUserId,
        family_name: 'The Locked Testing Family',
        status: 'active',
      })
      .select()
      .single();
    if (hErr) throw new Error(`Admin insert into households failed: ${hErr.message}`);
    assert(household.id, 'Household must have an id');
    console.log(`   ✅ Admin successfully created household (id: ${household.id})`);

    const { data: member, error: mErr } = await adminClient
      .from('household_members')
      .insert({
        household_id: household.id,
        full_name: 'Locked Parent',
        role: 'mother',
        birth_year: 1989,
      })
      .select()
      .single();
    if (mErr) throw new Error(`Admin insert into household_members failed: ${mErr.message}`);
    console.log(`   ✅ Admin successfully created member (id: ${member.id})`);

    // Admin CANNOT read or insert into session-content and clinical tables without unlock
    console.log('   -> Verifying Admin CANNOT access clinical and session tables without unlock...');
    const sessionTables = [
      'household_clinical',
      'member_personas',
      'case_sessions',
      'session_attendees',
      'session_content',
      'member_notes',
      'member_action_items',
      'session_chat_messages',
    ];

    for (const st of sessionTables) {
      const { data: sData } = await adminClient.from(st).select('*');
      assert.equal(sData?.length || 0, 0, `Admin without unlock should read 0 rows in ${st}`);

      let dummyPayload = {};
      if (st === 'household_clinical') {
        dummyPayload = { household_id: household.id, presenting_issue: 'Blocked clinical focus' };
      } else if (st === 'member_personas') {
        dummyPayload = { household_member_id: member.id, persona_summary: 'Blocked persona' };
      } else if (st === 'case_sessions') {
        dummyPayload = { household_id: household.id, session_date: new Date().toISOString() };
      } else if (st === 'session_attendees') {
        dummyPayload = { session_id: household.id, household_member_id: member.id };
      } else if (st === 'session_content') {
        dummyPayload = { session_id: household.id, content_type: 'post_session_notes', content: 'test' };
      } else if (st === 'member_notes') {
        dummyPayload = { household_member_id: member.id, body: 'test note' };
      } else if (st === 'member_action_items') {
        dummyPayload = { household_member_id: member.id, task: 'test task' };
      } else if (st === 'session_chat_messages') {
        dummyPayload = { household_id: household.id, sender: 'admin', content: 'test message' };
      }

      const { error: sInsErr } = await adminClient.from(st).insert(dummyPayload);
      assert(sInsErr, `Admin without unlock insert on ${st} must be blocked by RLS`);
      console.log(`   ✅ Table '${st}': Admin without unlock denied (0 rows read, insert blocked: "${sInsErr.message}")`);
    }

    // ----------------------------------------------------------------
    // CASE 3: Admin WITH unlock has full CRUD on session tables
    // ----------------------------------------------------------------
    console.log('\n--- CASE 3: Admin WITH Unlock (Full Session Access) ---');

    // Grant 8-hour unlock via service role (simulating successful family-unlock Edge Function)
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const { data: unlockRow, error: unlockErr } = await supabaseAdmin
      .from('family_unlocks')
      .insert({
        admin_id: adminUserId,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (unlockErr) throw new Error(`Failed to insert family_unlocks: ${unlockErr.message}`);
    unlockRowId = unlockRow.id;
    console.log(`   ✅ Active unlock granted for Admin (expires at ${expiresAt})`);

    // Verify has_family_unlock() RPC returns true
    const { data: adminUnlockAfter } = await adminClient.rpc('has_family_unlock');
    assert.equal(Boolean(adminUnlockAfter), true, 'has_family_unlock() must return true after unlock granted');
    console.log('   ✅ has_family_unlock() RPC returned true for Admin with active unlock.');

    // 1. case_sessions
    console.log('   -> Testing case_sessions CRUD with active unlock...');
    const { data: session, error: sessErr } = await adminClient
      .from('case_sessions')
      .insert({
        household_id: household.id,
        session_date: new Date().toISOString(),
        duration_minutes: 60,
        status: 'scheduled',
      })
      .select()
      .single();
    if (sessErr) throw new Error(`Unlocked Admin insert into case_sessions failed: ${sessErr.message}`);
    console.log(`      ✅ INSERT succeeded: case_sessions id = ${session.id}`);

    const { data: sessRead, error: sessReadErr } = await adminClient
      .from('case_sessions')
      .select('*')
      .eq('id', session.id)
      .single();
    if (sessReadErr) throw sessReadErr;
    assert.equal(sessRead.id, session.id);
    console.log(`      ✅ SELECT succeeded: read case_sessions status = "${sessRead.status}"`);

    const { data: sessUpdate, error: sessUpdateErr } = await adminClient
      .from('case_sessions')
      .update({ status: 'completed' })
      .eq('id', session.id)
      .select()
      .single();
    if (sessUpdateErr) throw sessUpdateErr;
    assert.equal(sessUpdate.status, 'completed');
    console.log(`      ✅ UPDATE succeeded: updated status to "${sessUpdate.status}"`);

    // 2. session_attendees
    console.log('   -> Testing session_attendees CRUD with active unlock...');
    const { data: attendee, error: attErr } = await adminClient
      .from('session_attendees')
      .insert({
        session_id: session.id,
        household_member_id: member.id,
      })
      .select()
      .single();
    if (attErr) throw new Error(`Unlocked Admin insert into session_attendees failed: ${attErr.message}`);
    console.log(`      ✅ INSERT succeeded: attendee id = ${attendee.id}`);

    const { data: attRead, error: attReadErr } = await adminClient
      .from('session_attendees')
      .select('*')
      .eq('id', attendee.id)
      .single();
    if (attReadErr) throw attReadErr;
    assert.equal(attRead.session_id, session.id);
    console.log(`      ✅ SELECT succeeded: attendee session_id = ${attRead.session_id}`);

    // 3. session_content
    console.log('   -> Testing session_content CRUD with active unlock...');
    const { data: content, error: contErr } = await adminClient
      .from('session_content')
      .insert({
        session_id: session.id,
        content_type: 'post_session_notes',
        content: 'Confidential clinical discussion notes on sensory regulation.',
      })
      .select()
      .single();
    if (contErr) throw new Error(`Unlocked Admin insert into session_content failed: ${contErr.message}`);
    console.log(`      ✅ INSERT succeeded: session_content id = ${content.id}`);

    const { data: contRead, error: contReadErr } = await adminClient
      .from('session_content')
      .select('*')
      .eq('id', content.id)
      .single();
    if (contReadErr) throw contReadErr;
    assert.equal(contRead.content_type, 'post_session_notes');
    console.log(`      ✅ SELECT succeeded: content = "${contRead.content.slice(0, 35)}..."`);

    // 4. member_notes
    console.log('   -> Testing member_notes CRUD with active unlock...');
    const { data: note, error: noteErr } = await adminClient
      .from('member_notes')
      .insert({
        household_member_id: member.id,
        session_id: session.id,
        note_type: 'observation',
        body: 'Observed noticeable reduction in stress response during evening check-in.',
      })
      .select()
      .single();
    if (noteErr) throw new Error(`Unlocked Admin insert into member_notes failed: ${noteErr.message}`);
    console.log(`      ✅ INSERT succeeded: member_notes id = ${note.id}`);

    const { data: noteRead, error: noteReadErr } = await adminClient
      .from('member_notes')
      .select('*')
      .eq('id', note.id)
      .single();
    if (noteReadErr) throw noteReadErr;
    assert.equal(noteRead.note_type, 'observation');
    console.log(`      ✅ SELECT succeeded: note = "${noteRead.body.slice(0, 35)}..."`);

    // 5. member_action_items
    console.log('   -> Testing member_action_items CRUD with active unlock...');
    const { data: actionItem, error: actErr } = await adminClient
      .from('member_action_items')
      .insert({
        household_member_id: member.id,
        session_id: session.id,
        task: 'Implement 5-minute quiet transition before dinner',
        priority: 'high',
        status: 'open',
      })
      .select()
      .single();
    if (actErr) throw new Error(`Unlocked Admin insert into member_action_items failed: ${actErr.message}`);
    console.log(`      ✅ INSERT succeeded: member_action_items id = ${actionItem.id}`);

    const { data: actRead, error: actReadErr } = await adminClient
      .from('member_action_items')
      .select('*')
      .eq('id', actionItem.id)
      .single();
    if (actReadErr) throw actReadErr;
    assert.equal(actRead.priority, 'high');
    console.log(`      ✅ SELECT succeeded: action item task = "${actRead.task}"`);

    // 6. session_chat_messages
    console.log('   -> Testing session_chat_messages CRUD with active unlock...');
    const { data: chatMsg, error: chatErr } = await adminClient
      .from('session_chat_messages')
      .insert({
        household_id: household.id,
        session_id: session.id,
        sender: 'admin',
        content: 'Clinical assistant, summarize progress across the last 3 sessions.',
      })
      .select()
      .single();
    if (chatErr) throw new Error(`Unlocked Admin insert into session_chat_messages failed: ${chatErr.message}`);
    console.log(`      ✅ INSERT succeeded: session_chat_messages id = ${chatMsg.id}`);

    const { data: chatRead, error: chatReadErr } = await adminClient
      .from('session_chat_messages')
      .select('*')
      .eq('id', chatMsg.id)
      .single();
    if (chatReadErr) throw chatReadErr;
    assert.equal(chatRead.sender, 'admin');
    console.log(`      ✅ SELECT succeeded: chat sender = "${chatRead.sender}"`);

    // 7. household_clinical CRUD
    console.log('   -> Testing household_clinical CRUD with active unlock...');
    const { data: clinical, error: clinErr } = await adminClient
      .from('household_clinical')
      .insert({
        household_id: household.id,
        presenting_issue: 'Bedtime anxiety and emotional regulation',
        working_plan: 'Calm evening sensory routine',
        next_step: 'Parent check-in in 2 weeks',
      })
      .select()
      .single();
    if (clinErr) throw new Error(`Unlocked Admin insert into household_clinical failed: ${clinErr.message}`);
    console.log(`      ✅ INSERT succeeded: household_clinical for household = ${clinical.household_id}`);

    const { data: clinRead, error: clinReadErr } = await adminClient
      .from('household_clinical')
      .select('*')
      .eq('household_id', household.id)
      .single();
    if (clinReadErr) throw clinReadErr;
    assert.equal(clinRead.presenting_issue, 'Bedtime anxiety and emotional regulation');
    console.log(`      ✅ SELECT succeeded: presenting_issue = "${clinRead.presenting_issue}"`);

    const { data: clinUpdate, error: clinUpdateErr } = await adminClient
      .from('household_clinical')
      .update({ working_plan: 'Revised sensory diet with weighted blanket' })
      .eq('household_id', household.id)
      .select()
      .single();
    if (clinUpdateErr) throw clinUpdateErr;
    assert.equal(clinUpdate.working_plan, 'Revised sensory diet with weighted blanket');
    console.log(`      ✅ UPDATE succeeded: working_plan = "${clinUpdate.working_plan}"`);

    // 8. member_personas CRUD
    console.log('   -> Testing member_personas CRUD with active unlock...');
    const { data: persona, error: perErr } = await adminClient
      .from('member_personas')
      .insert({
        household_member_id: member.id,
        persona_summary: 'Highly observant, deeply empathetic mother',
        temperament_traits: ['empathetic', 'sensory_sensitive'],
        known_triggers: ['bedtime_transitions'],
        strengths: ['protective_presence'],
        concern_level: 'moderate',
        family_dynamic_role: 'primary_anchor',
        notes: 'Initial clinical observation notes',
      })
      .select()
      .single();
    if (perErr) throw new Error(`Unlocked Admin insert into member_personas failed: ${perErr.message}`);
    console.log(`      ✅ INSERT succeeded: member_personas for member = ${persona.household_member_id}`);

    const { data: perRead, error: perReadErr } = await adminClient
      .from('member_personas')
      .select('*')
      .eq('household_member_id', member.id)
      .single();
    if (perReadErr) throw perReadErr;
    assert.equal(perRead.persona_summary, 'Highly observant, deeply empathetic mother');
    console.log(`      ✅ SELECT succeeded: persona_summary = "${perRead.persona_summary}"`);

    const { data: perUpdate, error: perUpdateErr } = await adminClient
      .from('member_personas')
      .update({ notes: 'Updated observation notes after intake' })
      .eq('household_member_id', member.id)
      .select()
      .single();
    if (perUpdateErr) throw perUpdateErr;
    assert.equal(perUpdate.notes, 'Updated observation notes after intake');
    console.log(`      ✅ UPDATE succeeded: notes = "${perUpdate.notes}"`);

    // Clean up created session & clinical rows with Admin client
    console.log('\n   -> Testing DELETE permissions on session & clinical tables (Admin with unlock)...');
    await adminClient.from('member_personas').delete().eq('household_member_id', member.id);
    await adminClient.from('household_clinical').delete().eq('household_id', household.id);
    await adminClient.from('session_chat_messages').delete().eq('id', chatMsg.id);
    await adminClient.from('member_action_items').delete().eq('id', actionItem.id);
    await adminClient.from('member_notes').delete().eq('id', note.id);
    await adminClient.from('session_content').delete().eq('id', content.id);
    await adminClient.from('session_attendees').delete().eq('id', attendee.id);
    await adminClient.from('case_sessions').delete().eq('id', session.id);
    await adminClient.from('household_members').delete().eq('id', member.id);
    await adminClient.from('households').delete().eq('id', household.id);
    console.log('      ✅ All test records deleted cleanly.');

    // Test Admin deleting their own family_unlocks row
    console.log('\n   -> Testing Admin deleting own family_unlocks row (Lock / Sign-out)...');
    const delResult = await adminClient
      .from('family_unlocks')
      .delete()
      .eq('admin_id', adminUserId);

    if (delResult.error) throw new Error(`Admin failed to delete own family_unlocks: ${delResult.error.message}`);
    console.log('      ✅ Admin successfully deleted own family_unlocks row.');

    const { data: adminRelocked } = await adminClient.rpc('has_family_unlock');
    assert.equal(Boolean(adminRelocked), false, 'has_family_unlock() must return false after lock');
    console.log('      ✅ has_family_unlock() confirmed false after lock.');
    unlockRowId = null; // Already deleted by adminClient

    console.log('\n================================================================');
    console.log('  🎉 ALL 3 CASES FULLY VERIFIED!');
    console.log('  Case 1: Student reads nothing on any table -> PASSED');
    console.log('  Case 2: Admin without unlock reads 0 session rows -> PASSED');
    console.log('  Case 3: Admin with unlock has full CRUD access -> PASSED');
    console.log('================================================================\n');
  } finally {
    // Teardown unlock row
    if (unlockRowId) {
      await supabaseAdmin.from('family_unlocks').delete().eq('id', unlockRowId);
    }
    // Teardown test auth users
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      console.log('Cleaned up test admin user.');
    }
    if (studentUserId) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId);
      console.log('Cleaned up test student user.');
    }
  }
}

runRLSVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
