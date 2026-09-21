/**
 * End-to-End Real Verification Suite for WhatsApp Event-Driven Messaging System.
 * Tests:
 * 1. Stale pending recovery sweep (>5 minutes)
 * 2. Onboarding trigger dispatch & history row logging
 * 3. Booking confirmation trigger dispatch & history row logging
 * 4. 1-Hour reminder scheduler dispatch & duplicate prevention check
 * 5. DB partial unique constraint enforcement against race condition duplicates
 * 6. Full cleanup of all created test data with verification proof
 */

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const supabaseUrl = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Test recipient: use the verified WhatsApp paired number for real live delivery check
const TEST_PHONE = '+201005809498';
const TEST_RUN_TAG = `test_evt_${Date.now()}`;

const createdTestBookingIds = [];
const createdTestMessageIds = [];
const createdTestUserIds = [];

async function logStep(stepNum, title) {
  console.log(`\n======================================================`);
  console.log(`STEP ${stepNum}: ${title}`);
  console.log(`======================================================`);
}

async function runVerification() {
  console.log(`[START] Running real verification with run tag: ${TEST_RUN_TAG}`);
  console.log(`[TARGET PHONE] ${TEST_PHONE}`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Stale Pending Sweep Verification
  // ──────────────────────────────────────────────────────────────────────────
  await logStep(1, 'Stale Pending Timeout & Retry Recovery');

  // Insert a test row with created_at set to 6 minutes in the past and status 'pending'
  const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  const { data: staleRow, error: staleInsertErr } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      recipient_phone: TEST_PHONE,
      recipient_name: 'Stale Test Parent',
      message_type: 'manual',
      message_content: `Stale test message ${TEST_RUN_TAG}`,
      status: 'pending',
      created_at: sixMinutesAgo,
    })
    .select('id, status, created_at')
    .single();

  assert(!staleInsertErr, `Stale row insert failed: ${staleInsertErr?.message}`);
  createdTestMessageIds.push(staleRow.id);
  console.log(`Inserted artificial stale pending message: ID=${staleRow.id}, status=${staleRow.status}, created_at=${staleRow.created_at}`);

  // Call the sweeper function
  const { data: sweptCount, error: sweepErr } = await supabaseAdmin.rpc('sweep_stale_whatsapp_messages', { timeout_minutes: 5 });
  assert(!sweepErr, `Sweeper RPC failed: ${sweepErr?.message}`);
  console.log(`Sweeper RPC executed. Affected rows: ${sweptCount}`);

  // Verify the row status flipped to 'failed' with timeout message
  const { data: verifiedStaleRow } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('id, status, error_message')
    .eq('id', staleRow.id)
    .single();

  assert.equal(verifiedStaleRow.status, 'failed', 'Stale pending row should have transitioned to failed');
  assert(verifiedStaleRow.error_message?.includes('timed out while in pending state'), 'Error message should note timeout');
  console.log(`✅ Stale pending row successfully swept: status=${verifiedStaleRow.status}, error="${verifiedStaleRow.error_message}"`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: Onboarding Trigger Dispatch & Real History Logging
  // ──────────────────────────────────────────────────────────────────────────
  await logStep(2, 'Onboarding Trigger Dispatch & Logging');

  const onboardingRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      trigger: 'onboarding',
      recipient_phone: TEST_PHONE,
      recipient_name: 'Sarah Test Parent',
    }),
  });

  const onboardingData = await onboardingRes.json();
  console.log('Onboarding dispatch response:', onboardingRes.status, onboardingData);
  assert(onboardingData.success, `Onboarding dispatch failed: ${JSON.stringify(onboardingData)}`);
  createdTestMessageIds.push(onboardingData.messageId);

  // Check the recorded row in whatsapp_messages
  const { data: onboardingRow } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*')
    .eq('id', onboardingData.messageId)
    .single();

  console.log(`Recorded Onboarding message:`, {
    id: onboardingRow.id,
    type: onboardingRow.message_type,
    status: onboardingRow.status,
    phone: onboardingRow.recipient_phone,
    sent_at: onboardingRow.sent_at,
    whatsapp_id: onboardingRow.whatsapp_message_id,
  });

  assert.equal(onboardingRow.message_type, 'onboarding');
  assert(onboardingRow.status === 'sent', `Onboarding message should be sent, got ${onboardingRow.status}`);
  assert(onboardingRow.message_content.includes("Welcome to Mai's Parent Coaching"), 'Content should match welcome template');

  // Test Onboarding Duplicate Prevention: dispatching again for same phone should be skipped!
  console.log('\nTesting Onboarding Duplicate Prevention...');
  const dupOnboardingRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      trigger: 'onboarding',
      recipient_phone: TEST_PHONE,
      recipient_name: 'Sarah Test Parent',
    }),
  });

  const dupOnboardingData = await dupOnboardingRes.json();
  console.log('Duplicate onboarding dispatch response:', dupOnboardingData);
  assert.equal(dupOnboardingData.skipped, true, 'Duplicate onboarding should be skipped');
  assert.equal(dupOnboardingData.reason, 'DUPLICATE_ONBOARDING_PREVENTED');
  console.log('✅ Onboarding duplicate prevention verified (dispatch cleanly bypassed)');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Booking Confirmation Trigger Dispatch & Logging
  // ──────────────────────────────────────────────────────────────────────────
  await logStep(3, 'Booking Confirmation Trigger via admin-booking-manager');

  // Create a confirmed booking with phone set to TEST_PHONE in an open slot today (10:30 UTC)
  const bookingStartsAt = new Date('2026-09-21T10:30:00.000Z');
  const bookingEndsAt = new Date('2026-09-21T11:30:00.000Z');
  const bookingReservedUntil = new Date('2026-09-21T11:45:00.000Z');

  const { data: testBooking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .insert({
      appointment_type_id: 'coaching-60',
      appointment_type_title: 'Parent Coaching Session (Test)',
      appointment_date: '2026-09-21',
      appointment_time: '13:30',
      time_zone: 'Africa/Cairo',
      starts_at: bookingStartsAt.toISOString(),
      ends_at: bookingEndsAt.toISOString(),
      reserved_until: bookingReservedUntil.toISOString(),
      parent_name: 'Sarah Test Verification',
      email: `test_${Date.now()}@example.com`,
      phone: TEST_PHONE,
      country: 'Egypt',
      status: 'confirmed',
      google_meet_url: 'https://meet.google.com/test-verify-meet',
    })
    .select('*')
    .single();

  assert(!bookingErr, `Failed to create test booking: ${bookingErr?.message}`);
  createdTestBookingIds.push(testBooking.id);
  console.log(`Created test confirmed booking: ID=${testBooking.id}, starts_at=${testBooking.starts_at}`);

  // Dispatch booking_confirmation trigger
  const confirmRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      trigger: 'booking_confirmation',
      related_booking_id: testBooking.id,
    }),
  });

  const confirmData = await confirmRes.json();
  console.log('Booking confirmation dispatch response:', confirmRes.status, confirmData);
  assert(confirmData.success, `Booking confirmation dispatch failed: ${JSON.stringify(confirmData)}`);
  createdTestMessageIds.push(confirmData.messageId);

  // Check history table row
  const { data: confirmRow } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*')
    .eq('id', confirmData.messageId)
    .single();

  console.log('Recorded Booking Confirmation message:', {
    id: confirmRow.id,
    type: confirmRow.message_type,
    status: confirmRow.status,
    related_booking_id: confirmRow.related_booking_id,
    sent_at: confirmRow.sent_at,
  });

  assert.equal(confirmRow.message_type, 'booking_confirmation');
  assert.equal(confirmRow.related_booking_id, testBooking.id);
  assert.equal(confirmRow.status, 'sent');
  assert(confirmRow.message_content.includes('Your coaching session for'), 'Content should match confirmation template');
  console.log('✅ Booking confirmation message successfully delivered & verified');

  // Test Booking Confirmation Duplicate Prevention
  console.log('\nTesting Booking Confirmation Duplicate Prevention...');
  const dupConfirmRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      trigger: 'booking_confirmation',
      related_booking_id: testBooking.id,
    }),
  });
  const dupConfirmData = await dupConfirmRes.json();
  console.log('Duplicate confirmation response:', dupConfirmData);
  assert.equal(dupConfirmData.skipped, true);
  assert.equal(dupConfirmData.reason, 'DUPLICATE_BOOKING_CONFIRMATION_PREVENTED');
  console.log('✅ Booking confirmation duplicate prevention verified');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: 1-Hour Reminder Scheduler & Duplicate Prevention Check
  // ──────────────────────────────────────────────────────────────────────────
  await logStep(4, '1-Hour Reminder Scheduler & Duplicate Check');

  // Fast-forward simulation: reference_time = 09:35 UTC (55 minutes before booking at 10:30 UTC, within [45m, 75m])
  const testReferenceTime = '2026-09-21T09:35:00.000Z';
  console.log(`Running whatsapp-scheduler simulating reference_time=${testReferenceTime}...`);
  const schedulerRes1 = await fetch(`${supabaseUrl}/functions/v1/whatsapp-scheduler`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      reference_time: testReferenceTime,
    }),
  });

  const schedulerData1 = await schedulerRes1.json();
  console.log('First scheduler run response:', JSON.stringify(schedulerData1, null, 2));
  assert(schedulerData1.success, 'Scheduler run 1 failed');
  assert(schedulerData1.schedulerResults.reminder_1h.sent >= 1, 'Should have sent at least 1 1-hour reminder');

  // Check the recorded reminder row
  const { data: reminderRow } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*')
    .eq('related_booking_id', testBooking.id)
    .eq('message_type', 'reminder_1h')
    .single();

  assert(reminderRow, 'Reminder 1h row should exist');
  createdTestMessageIds.push(reminderRow.id);
  console.log('Recorded 1h Reminder row:', {
    id: reminderRow.id,
    type: reminderRow.message_type,
    status: reminderRow.status,
    sent_at: reminderRow.sent_at,
  });
  assert.equal(reminderRow.status, 'sent');
  assert(reminderRow.message_content.includes('starts in approximately 1 hour'));

  // Run the scheduler a SECOND TIME immediately with the same reference_time to verify duplicate prevention!
  console.log('\nRunning whatsapp-scheduler a SECOND TIME to prove duplicate prevention...');
  const schedulerRes2 = await fetch(`${supabaseUrl}/functions/v1/whatsapp-scheduler`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      reference_time: testReferenceTime,
    }),
  });

  const schedulerData2 = await schedulerRes2.json();
  console.log('Second scheduler run response:', JSON.stringify(schedulerData2, null, 2));
  assert(schedulerData2.success, 'Scheduler run 2 failed');
  // In the second run, reminder_1h sent MUST be 0 (the booking was skipped as duplicate)
  assert.equal(schedulerData2.schedulerResults.reminder_1h.sent, 0, 'Second run MUST send 0 reminders (duplicate prevention check)');
  assert(schedulerData2.schedulerResults.reminder_1h.skipped >= 1, 'Second run should report skipped duplicate');
  console.log('✅ Scheduler duplicate check passed: 0 duplicate reminders sent on subsequent run!');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: DB-Level Partial Unique Index Race Condition Test
  // ──────────────────────────────────────────────────────────────────────────
  await logStep(5, 'Database Partial Unique Index Direct Enforcement');

  // Try to directly INSERT a duplicate 'sent' row for the same booking and reminder_1h
  const { error: raceInsertErr } = await supabaseAdmin
    .from('whatsapp_messages')
    .insert({
      recipient_phone: TEST_PHONE,
      message_type: 'reminder_1h',
      message_content: 'Duplicate race attempt',
      related_booking_id: testBooking.id,
      status: 'sent',
    });

  console.log('Direct duplicate insert result error code:', raceInsertErr?.code);
  assert(raceInsertErr, 'Direct duplicate insert must be rejected by Postgres unique constraint');
  assert.equal(raceInsertErr.code, '23505', 'Should return unique_violation error code 23505');
  console.log(`✅ Postgres partial unique index (idx_whatsapp_messages_booking_sent) enforced rejection (code ${raceInsertErr.code})`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 6: Clean Up All Test Data
  // ──────────────────────────────────────────────────────────────────────────
  await logStep(6, 'Test Data Cleanup & Verification Proof');

  console.log(`Purging ${createdTestMessageIds.length} test message history rows...`);
  const { error: msgDeleteErr } = await supabaseAdmin
    .from('whatsapp_messages')
    .delete()
    .in('id', createdTestMessageIds);
  assert(!msgDeleteErr, `Message cleanup failed: ${msgDeleteErr?.message}`);

  console.log(`Purging ${createdTestBookingIds.length} test booking rows...`);
  const { error: bDeleteErr } = await supabaseAdmin
    .from('bookings')
    .delete()
    .in('id', createdTestBookingIds);
  assert(!bDeleteErr, `Booking cleanup failed: ${bDeleteErr?.message}`);

  // Verify proof of clean state
  const { count: remainingMsgs } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .in('id', createdTestMessageIds);

  const { count: remainingBookings } = await supabaseAdmin
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('id', createdTestBookingIds);

  assert.equal(remainingMsgs, 0, 'All test message rows must be deleted');
  assert.equal(remainingBookings, 0, 'All test booking rows must be deleted');

  console.log('✅ Cleanup verified: 0 test rows remaining in database.');
  console.log('\n🎉 ALL VERIFICATION GATES PASSED WITH REAL LIVE EVIDENCE!');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
