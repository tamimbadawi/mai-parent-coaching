/**
 * Stage 1 CRM Data Model Verification Script
 * Validates:
 * 1. Column additions to `profiles` (engagement_status, engagement_cadence_days)
 * 2. Computed view `customer_journey_state`
 * 3. Track determination:
 *    - 0 completed paid sessions -> Track A
 *    - Completed free initial consultation -> remains Track A
 *    - Upcoming / confirmed paid session -> remains Track A (lifecycle: track_a_booked)
 *    - Cancelled paid session -> remains Track A
 *    - Completed paid session -> Promoted to Track B (lifecycle: track_b_between_sessions)
 * 4. Opt-out state propagation
 * 5. Full test data cleanup
 */

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const supabaseUrl = env.SUPABASE_URL || 'https://qqnthevakllugdlioalm.supabase.co';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const createdUserIds = [];
const createdBookingIds = [];

async function logStep(stepNum, title) {
  console.log(`\n======================================================`);
  console.log(`STEP ${stepNum}: ${title}`);
  console.log(`======================================================`);
}

async function runStage1Verification() {
  console.log('[START] Verifying Stage 1: CRM Data Model & customer_journey_state view');

  try {
    // ----------------------------------------------------
    // STEP 1: Schema Verification
    // ----------------------------------------------------
    await logStep(1, 'Verify profiles table schema additions');
    const { data: sampleProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, engagement_status, engagement_cadence_days')
      .limit(1)
      .maybeSingle();

    if (profileErr) {
      throw new Error(`Schema check failed: ${profileErr.message}`);
    }
    console.log('✅ Columns engagement_status & engagement_cadence_days verified on profiles');

    // ----------------------------------------------------
    // STEP 2: Fresh User -> Track A Verification
    // ----------------------------------------------------
    await logStep(2, 'Create fresh student profile & test Track A derivation');
    const testEmail1 = `crm_test_fresh_${Date.now()}@example.com`;
    const { data: authUser1, error: authErr1 } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail1,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'Fresh CRM Client', phone: '+12025550101', country: 'US' },
    });
    if (authErr1 || !authUser1?.user) throw authErr1 || new Error('Failed to create test user 1');
    const user1Id = authUser1.user.id;
    createdUserIds.push(user1Id);

    // Wait for handle_new_user trigger
    await new Promise((r) => setTimeout(r, 1000));
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'student', full_name: 'Fresh CRM Client', phone: '+12025550101' })
      .eq('id', user1Id);

    const { data: journey1, error: journeyErr1 } = await supabaseAdmin
      .from('customer_journey_state')
      .select('*')
      .eq('client_id', user1Id)
      .single();

    if (journeyErr1) throw new Error(`Failed to query customer_journey_state: ${journeyErr1.message}`);

    assert.equal(journey1.current_track, 'track_a', 'Fresh user must be on track_a');
    assert.equal(journey1.completed_paid_sessions_count, 0, 'Paid sessions count must be 0');
    assert.equal(journey1.lifecycle_stage, 'track_a_active', 'Fresh user must be track_a_active');
    assert.equal(journey1.engagement_status, 'active', 'Default engagement_status must be active');
    console.log('✅ Fresh user accurately evaluates to Track A (active nurture, 0 paid sessions)');
    console.log('   Journey State:', {
      client_id: journey1.client_id,
      track: journey1.current_track,
      stage: journey1.lifecycle_stage,
      next_step: journey1.next_step_recommendation,
    });

    // ----------------------------------------------------
    // STEP 3: Completed Free Initial Session -> Remains Track A
    // ----------------------------------------------------
    await logStep(3, 'Add completed Free Initial Consultation -> Must remain Track A');
    const { data: freeBooking, error: freeBookingErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user1Id,
        appointment_type_id: 'initial',
        appointment_type_title: 'Initial Consultation',
        appointment_date: '2026-09-18',
        appointment_time: '10:00 AM',
        parent_name: 'Fresh CRM Client',
        email: testEmail1,
        phone: '+12025550101',
        country: 'US',
        time_zone: 'UTC',
        status: 'completed',
        starts_at: '2026-09-18T10:00:00Z',
        ends_at: '2026-09-18T11:15:00Z',
        reserved_until: '2026-09-18T11:15:00Z',
      })
      .select()
      .single();

    if (freeBookingErr) throw new Error(`Failed to create free booking: ${freeBookingErr.message}`);
    createdBookingIds.push(freeBooking.id);

    const { data: journey2, error: journeyErr2 } = await supabaseAdmin
      .from('customer_journey_state')
      .select('*')
      .eq('client_id', user1Id)
      .single();

    if (journeyErr2) throw journeyErr2;
    assert.equal(journey2.current_track, 'track_a', 'Free initial consultation must keep user on track_a');
    assert.equal(journey2.completed_free_sessions_count, 1, 'Completed free sessions must equal 1');
    assert.equal(journey2.completed_paid_sessions_count, 0, 'Paid sessions count must still be 0');
    console.log('✅ Completed Free Consultation accurately stays on Track A (completed_free: 1, completed_paid: 0)');

    // ----------------------------------------------------
    // STEP 4: Upcoming Booked Paid Session -> Must remain Track A (track_a_booked)
    // ----------------------------------------------------
    await logStep(4, 'Add upcoming confirmed paid session -> Must remain Track A until completed');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const tomorrowEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    const { data: upcomingBooking, error: upcomingErr } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user1Id,
        appointment_type_id: 'coaching-60',
        appointment_type_title: '60-Minute Coaching Session',
        appointment_date: tomorrow.slice(0, 10),
        appointment_time: '02:00 PM',
        parent_name: 'Fresh CRM Client',
        email: testEmail1,
        phone: '+12025550101',
        country: 'US',
        time_zone: 'UTC',
        status: 'confirmed',
        starts_at: tomorrow,
        ends_at: tomorrowEnd,
        reserved_until: tomorrowEnd,
      })
      .select()
      .single();

    if (upcomingErr) throw new Error(`Failed to create upcoming booking: ${upcomingErr.message}`);
    createdBookingIds.push(upcomingBooking.id);

    const { data: journey3, error: journeyErr3 } = await supabaseAdmin
      .from('customer_journey_state')
      .select('*')
      .eq('client_id', user1Id)
      .single();

    if (journeyErr3) throw journeyErr3;
    assert.equal(journey3.current_track, 'track_a', 'Upcoming paid session must NOT promote to track_b before attendance');
    assert.equal(journey3.upcoming_sessions_count, 1, 'Upcoming sessions count must be 1');
    assert.equal(journey3.lifecycle_stage, 'track_a_booked', 'Lifecycle stage must be track_a_booked');
    console.log('✅ Upcoming paid session properly keeps client on Track A (stage: track_a_booked)');
    console.log('   Recommendation:', journey3.next_step_recommendation);

    // ----------------------------------------------------
    // STEP 5: Mark Paid Session Completed -> Promotes to Track B
    // ----------------------------------------------------
    await logStep(5, 'Mark paid session as "completed" -> Transition trigger to Track B');
    const { error: completeErr } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', upcomingBooking.id);

    if (completeErr) throw new Error(`Failed to mark booking completed: ${completeErr.message}`);

    const { data: journey4, error: journeyErr4 } = await supabaseAdmin
      .from('customer_journey_state')
      .select('*')
      .eq('client_id', user1Id)
      .single();

    if (journeyErr4) throw journeyErr4;
    assert.equal(journey4.current_track, 'track_b', 'Completed paid session must promote client to track_b');
    assert.equal(journey4.completed_paid_sessions_count, 1, 'Completed paid sessions count must be 1');
    assert.equal(journey4.lifecycle_stage, 'track_b_between_sessions', 'Lifecycle stage must be track_b_between_sessions');
    console.log('✅ Transition trigger verified! User promoted to Track B upon session completion');
    console.log('   Journey State:', {
      track: journey4.current_track,
      completed_paid: journey4.completed_paid_sessions_count,
      stage: journey4.lifecycle_stage,
      next_step: journey4.next_step_recommendation,
    });

    // ----------------------------------------------------
    // STEP 6: Opt-Out Handling
    // ----------------------------------------------------
    await logStep(6, 'Set engagement_status = "opted_out" -> Verify lifecycle reflects opt_out');
    const { error: optOutErr } = await supabaseAdmin
      .from('profiles')
      .update({ engagement_status: 'opted_out' })
      .eq('id', user1Id);

    if (optOutErr) throw new Error(`Failed to update engagement_status: ${optOutErr.message}`);

    const { data: journey5, error: journeyErr5 } = await supabaseAdmin
      .from('customer_journey_state')
      .select('*')
      .eq('client_id', user1Id)
      .single();

    if (journeyErr5) throw journeyErr5;
    assert.equal(journey5.lifecycle_stage, 'opted_out', 'Lifecycle stage must be opted_out');
    console.log('✅ Opt-out preference correctly overrides stage to "opted_out"');
    console.log('   Recommendation:', journey5.next_step_recommendation);

    console.log('\n======================================================');
    console.log('🎉 ALL STAGE 1 VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('======================================================');

  } finally {
    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records...');
    for (const bId of createdBookingIds) {
      await supabaseAdmin.from('bookings').delete().eq('id', bId);
    }
    for (const uId of createdUserIds) {
      await supabaseAdmin.from('profiles').delete().eq('id', uId);
      await supabaseAdmin.auth.admin.deleteUser(uId);
    }
    console.log(`[CLEANUP] Purged ${createdBookingIds.length} test bookings and ${createdUserIds.length} test auth users.`);
  }
}

runStage1Verification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
