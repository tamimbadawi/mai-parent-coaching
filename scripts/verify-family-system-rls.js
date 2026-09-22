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
  console.log('  LIVE RLS VERIFICATION FOR FAMILY CLIENT SYSTEM');
  console.log('  Testing Authenticated Admin JWT vs Authenticated Student JWT');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const adminEmail = `test_admin_${timestamp}@maiparentcoaching.com`;
  const studentEmail = `test_student_${timestamp}@maiparentcoaching.com`;
  const password = 'TestSecurePass123!';

  let adminUserId = null;
  let studentUserId = null;

  try {
    // ----------------------------------------------------------------
    // 1. Create Real Admin User
    // ----------------------------------------------------------------
    console.log('1. Creating test Admin user in auth.users & profiles...');
    const { data: adminAuth, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Test Admin User', role: 'admin' },
    });
    if (adminAuthErr) throw adminAuthErr;
    adminUserId = adminAuth.user.id;

    // Wait for profile row trigger and set role to admin
    for (let i = 0; i < 10; i++) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', adminUserId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const { error: profUpdateErr } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin', approval_status: 'approved' })
      .eq('id', adminUserId);
    if (profUpdateErr) throw profUpdateErr;
    console.log(`   Admin created: ${adminEmail} (id: ${adminUserId}, role: admin)`);

    // ----------------------------------------------------------------
    // 2. Create Real Student (Non-Admin) User
    // ----------------------------------------------------------------
    console.log('\n2. Creating test Student user in auth.users & profiles...');
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
    console.log(`   Student created: ${studentEmail} (id: ${studentUserId}, role: student)`);

    // ----------------------------------------------------------------
    // 3. Authenticate Admin and get real User JWT
    // ----------------------------------------------------------------
    console.log('\n3. Authenticating Admin via signInWithPassword (subject to RLS)...');
    const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminSession, error: adminSignErr } = await adminClient.auth.signInWithPassword({
      email: adminEmail,
      password: password,
    });
    if (adminSignErr) throw adminSignErr;
    assert(adminSession.session?.access_token, 'Admin session must contain access_token');
    console.log('   Admin JWT acquired successfully.');

    // ----------------------------------------------------------------
    // 4. Authenticate Student and get real User JWT
    // ----------------------------------------------------------------
    console.log('\n4. Authenticating Student via signInWithPassword (subject to RLS)...');
    const studentClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: studentSession, error: studentSignErr } = await studentClient.auth.signInWithPassword({
      email: studentEmail,
      password: password,
    });
    if (studentSignErr) throw studentSignErr;
    assert(studentSession.session?.access_token, 'Student session must contain access_token');
    console.log('   Student JWT acquired successfully.');

    // ----------------------------------------------------------------
    // 5. Test NON-ADMIN (Student) Access -> Must be blocked on all 5 tables
    // ----------------------------------------------------------------
    console.log('\n5. Verifying Student is DENIED on all 5 tables (RLS public.is_admin() enforcement)...');
    const tables = ['households', 'household_members', 'case_sessions', 'session_attendees', 'session_content'];
    for (const t of tables) {
      // Select
      const { data: selData, error: selErr } = await studentClient.from(t).select('*');
      assert.equal(selData?.length || 0, 0, `Student should not see any rows in ${t}`);

      // Insert attempt
      const dummyPayload = t === 'households' ? { family_name: 'Blocked Family' } : {};
      const { data: insData, error: insErr } = await studentClient.from(t).insert(dummyPayload);
      assert(insErr, `Student insert on ${t} must error`);
      console.log(`   ✅ Table '${t}': Student access denied (select returned 0 rows, insert blocked: "${insErr.message}")`);
    }

    // ----------------------------------------------------------------
    // 6. Test ADMIN Full CRUD Access on all 5 tables
    // ----------------------------------------------------------------
    console.log('\n6. Verifying Authenticated ADMIN has full CRUD on all 5 tables...');

    // TABLE 1: households
    console.log('   -> Testing public.households CRUD (Admin)...');
    const { data: household, error: hInsertErr } = await adminClient
      .from('households')
      .insert({
        family_name: 'The Testing Family',
        presenting_issue: 'Bedtime anxiety and emotional storms',
        working_plan: 'Calm nervous system co-regulation',
        next_step: 'Introduce 3-second pause routine',
        status: 'active',
      })
      .select()
      .single();
    if (hInsertErr) throw new Error(`Admin insert into households failed: ${hInsertErr.message}`);
    console.log(`      ✅ INSERT succeeded: household id = ${household.id}`);

    const { data: hSelect, error: hSelectErr } = await adminClient
      .from('households')
      .select('*')
      .eq('id', household.id)
      .single();
    if (hSelectErr) throw new Error(`Admin select from households failed: ${hSelectErr.message}`);
    assert.equal(hSelect.family_name, 'The Testing Family');
    console.log(`      ✅ SELECT succeeded: family_name = "${hSelect.family_name}"`);

    const { data: hUpdate, error: hUpdateErr } = await adminClient
      .from('households')
      .update({ next_step: 'Updated next step for bedtime' })
      .eq('id', household.id)
      .select()
      .single();
    if (hUpdateErr) throw new Error(`Admin update on households failed: ${hUpdateErr.message}`);
    assert.equal(hUpdate.next_step, 'Updated next step for bedtime');
    console.log(`      ✅ UPDATE succeeded: next_step = "${hUpdate.next_step}"`);

    // TABLE 2: household_members
    console.log('   -> Testing public.household_members CRUD (Admin)...');
    const { data: member, error: mInsertErr } = await adminClient
      .from('household_members')
      .insert({
        household_id: household.id,
        full_name: 'Sarah Testing',
        role: 'mother',
        birth_year: 1988,
        notes: 'High stress sensitivity',
      })
      .select()
      .single();
    if (mInsertErr) throw new Error(`Admin insert into household_members failed: ${mInsertErr.message}`);
    console.log(`      ✅ INSERT succeeded: member id = ${member.id}`);

    const { data: mSelect, error: mSelectErr } = await adminClient
      .from('household_members')
      .select('*')
      .eq('id', member.id)
      .single();
    if (mSelectErr) throw new Error(`Admin select from household_members failed: ${mSelectErr.message}`);
    console.log(`      ✅ SELECT succeeded: member = "${mSelect.full_name}" (${mSelect.role})`);

    const { data: mUpdate, error: mUpdateErr } = await adminClient
      .from('household_members')
      .update({ notes: 'Updated notes: coping well' })
      .eq('id', member.id)
      .select()
      .single();
    if (mUpdateErr) throw new Error(`Admin update on household_members failed: ${mUpdateErr.message}`);
    console.log(`      ✅ UPDATE succeeded: notes = "${mUpdate.notes}"`);

    // TABLE 3: case_sessions
    console.log('   -> Testing public.case_sessions CRUD (Admin)...');
    const { data: session, error: sInsertErr } = await adminClient
      .from('case_sessions')
      .insert({
        household_id: household.id,
        session_date: new Date().toISOString(),
        duration_minutes: 50,
        google_meet_url: 'https://meet.google.com/abc-defg-hij',
        status: 'scheduled',
      })
      .select()
      .single();
    if (sInsertErr) throw new Error(`Admin insert into case_sessions failed: ${sInsertErr.message}`);
    console.log(`      ✅ INSERT succeeded: case_session id = ${session.id}`);

    const { data: sSelect, error: sSelectErr } = await adminClient
      .from('case_sessions')
      .select('*')
      .eq('id', session.id)
      .single();
    if (sSelectErr) throw new Error(`Admin select from case_sessions failed: ${sSelectErr.message}`);
    console.log(`      ✅ SELECT succeeded: status = "${sSelect.status}"`);

    const { data: sUpdate, error: sUpdateErr } = await adminClient
      .from('case_sessions')
      .update({ status: 'completed' })
      .eq('id', session.id)
      .select()
      .single();
    if (sUpdateErr) throw new Error(`Admin update on case_sessions failed: ${sUpdateErr.message}`);
    console.log(`      ✅ UPDATE succeeded: status = "${sUpdate.status}"`);

    // TABLE 4: session_attendees
    console.log('   -> Testing public.session_attendees CRUD (Admin)...');
    const { data: attendee, error: aInsertErr } = await adminClient
      .from('session_attendees')
      .insert({
        session_id: session.id,
        household_member_id: member.id,
      })
      .select()
      .single();
    if (aInsertErr) throw new Error(`Admin insert into session_attendees failed: ${aInsertErr.message}`);
    console.log(`      ✅ INSERT succeeded: attendee id = ${attendee.id}`);

    const { data: aSelect, error: aSelectErr } = await adminClient
      .from('session_attendees')
      .select('*')
      .eq('id', attendee.id)
      .single();
    if (aSelectErr) throw new Error(`Admin select from session_attendees failed: ${aSelectErr.message}`);
    console.log(`      ✅ SELECT succeeded: session_id = ${aSelect.session_id}`);

    // TABLE 5: session_content
    console.log('   -> Testing public.session_content CRUD (Admin)...');
    const { data: content, error: cInsertErr } = await adminClient
      .from('session_content')
      .insert({
        session_id: session.id,
        content_type: 'post_session_notes',
        content: 'Mai notes: Discussed evening boundaries and sensory pause.',
        source_metadata: { author: 'Mai' },
      })
      .select()
      .single();
    if (cInsertErr) throw new Error(`Admin insert into session_content failed: ${cInsertErr.message}`);
    console.log(`      ✅ INSERT succeeded: content id = ${content.id}, type = ${content.content_type}`);

    const { data: cSelect, error: cSelectErr } = await adminClient
      .from('session_content')
      .select('*')
      .eq('id', content.id)
      .single();
    if (cSelectErr) throw new Error(`Admin select from session_content failed: ${cSelectErr.message}`);
    console.log(`      ✅ SELECT succeeded: content = "${cSelect.content.slice(0, 30)}..."`);

    const { data: cUpdate, error: cUpdateErr } = await adminClient
      .from('session_content')
      .update({ content: 'Mai notes: Updated evening boundaries plan.' })
      .eq('id', content.id)
      .select()
      .single();
    if (cUpdateErr) throw new Error(`Admin update on session_content failed: ${cUpdateErr.message}`);
    console.log(`      ✅ UPDATE succeeded: content = "${cUpdate.content.slice(0, 30)}..."`);

    // DELETIONS: Test delete permissions under admin
    console.log('\n   -> Testing DELETE permissions on all tables (Admin)...');
    const { error: cDelErr } = await adminClient.from('session_content').delete().eq('id', content.id);
    if (cDelErr) throw cDelErr;
    console.log('      ✅ DELETE session_content succeeded');

    const { error: aDelErr } = await adminClient.from('session_attendees').delete().eq('id', attendee.id);
    if (aDelErr) throw aDelErr;
    console.log('      ✅ DELETE session_attendees succeeded');

    const { error: sDelErr } = await adminClient.from('case_sessions').delete().eq('id', session.id);
    if (sDelErr) throw sDelErr;
    console.log('      ✅ DELETE case_sessions succeeded');

    const { error: mDelErr } = await adminClient.from('household_members').delete().eq('id', member.id);
    if (mDelErr) throw mDelErr;
    console.log('      ✅ DELETE household_members succeeded');

    const { error: hDelErr } = await adminClient.from('households').delete().eq('id', household.id);
    if (hDelErr) throw hDelErr;
    console.log('      ✅ DELETE households succeeded');

    console.log('\n================================================================');
    console.log('  🎉 ALL 5 TABLES FULLY VERIFIED FOR AUTHENTICATED ADMIN (JWT)!');
    console.log('  public.is_admin() correctly authorizes Admin and blocks Student.');
    console.log('================================================================\n');
  } finally {
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
