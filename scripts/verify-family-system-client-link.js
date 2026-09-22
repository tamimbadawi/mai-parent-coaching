import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  console.log('================================================================');
  console.log('  VERIFYING: household <-> real client/booking connection');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const email = `test_client_link_${timestamp}@maiparentcoaching.com`;
  let userId = null;
  let bookingId = null;
  let householdId = null;

  try {
    console.log('1. Reject a household with NO client link (must fail: NOT NULL)...');
    const { error: nullErr } = await admin.from('households').insert({ family_name: 'Should Fail' });
    assert(nullErr, 'insert without primary_contact_profile_id must fail');
    console.log(`   ✅ Rejected as expected: "${nullErr.message}"\n`);

    console.log('2. Creating a real client profile + a real booking for them...');
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({ email, password: 'TestSecurePass123!', email_confirm: true });
    if (authErr) throw authErr;
    userId = authUser.user.id;
    for (let i = 0; i < 10; i++) {
      const { data: prof } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
      if (prof) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await admin.from('profiles').update({ full_name: 'Test Client Link', approval_status: 'approved' }).eq('id', userId);

    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .insert({
        user_id: userId,
        appointment_type_id: 'consult',
        appointment_type_title: 'Parent Coaching',
        appointment_date: '2026-09-10',
        appointment_time: '10:00',
        parent_name: 'Test Client Link',
        email,
        child_name: 'Test Child',
        child_age: '5',
        status: 'completed',
        time_zone: 'Africa/Cairo',
        starts_at: '2026-09-10T08:00:00+00:00',
        ends_at: '2026-09-10T09:00:00+00:00',
        reserved_until: '2026-09-10T09:15:00+00:00',
      })
      .select()
      .single();
    if (bookingErr) throw bookingErr;
    bookingId = booking.id;
    console.log(`   Client ${userId} + booking ${bookingId} created.\n`);

    console.log('3. Creating household linked to that client, seeded from the booking (as AdminFamilies.tsx does)...');
    const { data: household, error: hErr } = await admin
      .from('households')
      .insert({ family_name: 'Test Client Link Family', primary_contact_profile_id: userId, status: 'active' })
      .select()
      .single();
    if (hErr) throw hErr;
    householdId = household.id;

    const { data: mother } = await admin
      .from('household_members')
      .insert({ household_id: householdId, full_name: 'Test Client Link', role: 'mother' })
      .select()
      .single();
    const { data: child } = await admin
      .from('household_members')
      .insert({ household_id: householdId, full_name: 'Test Child', role: 'child', birth_year: new Date().getFullYear() - 5 })
      .select()
      .single();

    const { data: session } = await admin
      .from('case_sessions')
      .insert({ household_id: householdId, booking_id: bookingId, session_date: '2026-09-10T00:00:00Z', status: 'completed' })
      .select()
      .single();

    await admin.from('session_attendees').insert([
      { session_id: session.id, household_member_id: mother.id },
      { session_id: session.id, household_member_id: child.id },
    ]);
    console.log('   Household + members + session + attendees created.\n');

    console.log('4. Verifying the connections are queryable end-to-end...');
    const { data: fullHousehold } = await admin
      .from('households')
      .select('*, household_members(*), case_sessions(*, session_attendees(household_member_id))')
      .eq('id', householdId)
      .single();

    assert.equal(fullHousehold.primary_contact_profile_id, userId, 'household must be linked to the real client');
    assert.equal(fullHousehold.household_members.length, 2, 'both seeded members must exist');
    assert.equal(fullHousehold.case_sessions.length, 1, 'one session must exist');
    assert.equal(fullHousehold.case_sessions[0].booking_id, bookingId, 'session must trace back to the real booking');
    assert.equal(fullHousehold.case_sessions[0].session_attendees.length, 2, 'both members must be attendees');
    console.log('   ✅ households.primary_contact_profile_id -> profiles (real client)');
    console.log('   ✅ case_sessions.booking_id -> bookings (real booking)');
    console.log('   ✅ session_attendees -> household_members (real connections)');

    console.log('\n5. Verifying customer_journey_state resolves for this same client (CRM cross-reference)...');
    const { data: journey } = await admin.from('customer_journey_state').select('client_id, completed_paid_sessions_count').eq('client_id', userId).maybeSingle();
    assert(journey, 'customer_journey_state must have a row for this client');
    console.log(`   ✅ customer_journey_state found: completed_paid_sessions_count=${journey.completed_paid_sessions_count}`);

    console.log('\n================================================================');
    console.log('  🎉 CLIENT <-> FAMILY CASE CONNECTION VERIFIED END TO END');
    console.log('================================================================\n');
  } finally {
    if (householdId) await admin.from('households').delete().eq('id', householdId);
    if (bookingId) await admin.from('bookings').delete().eq('id', bookingId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    console.log('Cleaned up test household, booking, and client user.');
  }
}

run().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
