import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) acc[k] = v.join('=');
  return acc;
}, {});

const SUPABASE_URL = env.SUPABASE_URL || 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runIssue3Verification() {
  console.log('=== [ISSUE 3 VERIFICATION] Testing Automation Rules, Templates & Toggles ===\n');

  // STEP 1: Verify all 5 rules exist in whatsapp_automation_rules
  console.log('Step 1: Reading rules from database...');
  const { data: rules, error: rulesErr } = await supabaseAdmin
    .from('whatsapp_automation_rules')
    .select('*')
    .order('created_at', { ascending: true });

  assert(!rulesErr, `Failed to load rules: ${rulesErr?.message}`);
  assert.equal(rules.length, 5, 'Should have exactly 5 automation rules seeded');
  console.log(`✅ Verified ${rules.length} seeded automation rules:`);
  for (const r of rules) {
    console.log(`  - [${r.trigger_type}] "${r.title}" (enabled: ${r.is_enabled})`);
  }

  // STEP 2: Test Toggle Disable Behavior
  console.log('\nStep 2: Testing trigger disable toggle...');
  const reminderRule = rules.find((r) => r.trigger_type === 'reminder_24h');
  assert(reminderRule, 'reminder_24h rule should exist');

  // Disable reminder_24h in database
  const { error: disableErr } = await supabaseAdmin
    .from('whatsapp_automation_rules')
    .update({ is_enabled: false })
    .eq('trigger_type', 'reminder_24h');
  assert(!disableErr, 'Failed to disable reminder_24h');
  console.log('Disabled reminder_24h in whatsapp_automation_rules.');

  // Call dispatcher with reminder_24h
  const disabledDispatchRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      trigger: 'reminder_24h',
      recipient_phone: '+201005809498',
      recipient_name: 'Test Parent',
      params: {
        appointmentType: 'Coaching 60m',
        time: '14:00',
        meetingLink: 'https://meet.google.com/xyz',
      },
    }),
  });

  const disabledData = await disabledDispatchRes.json();
  console.log('Dispatcher response for disabled trigger:', disabledData);
  assert.equal(disabledData.skipped, true, 'Disabled trigger should be skipped');
  assert.equal(disabledData.reason, 'TRIGGER_DISABLED_BY_ADMIN', 'Should report TRIGGER_DISABLED_BY_ADMIN');
  console.log('✅ Verified: Disabled trigger was cleanly prevented from sending!');

  // Re-enable reminder_24h
  await supabaseAdmin
    .from('whatsapp_automation_rules')
    .update({ is_enabled: true })
    .eq('trigger_type', 'reminder_24h');
  console.log('Re-enabled reminder_24h.');

  // STEP 3: Test Dynamic Database Template Rendering
  console.log('\nStep 3: Testing custom template text from database...');
  const onboardingRule = rules.find((r) => r.trigger_type === 'onboarding');
  const originalOnboardingTemplate = onboardingRule.template_content;
  const customTag = `[Customized DB Template ${Date.now()}]`;
  const customTemplateText = `Hello {parentName}!\n\nWelcome to our private coaching space. ${customTag}\n\nWarmly,\nMai`;

  // Update onboarding template in database
  await supabaseAdmin
    .from('whatsapp_automation_rules')
    .update({ template_content: customTemplateText })
    .eq('trigger_type', 'onboarding');
  console.log('Updated onboarding template in database with custom tag.');

  // Dispatch onboarding with dry simulation or check rendered content
  // Note: to prevent duplicate check blocking on +201005809498, use a fresh test phone
  const testPhone = `+2010099${Date.now().toString().slice(-5)}`;
  const customDispatchRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-dispatcher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      trigger: 'onboarding',
      recipient_phone: testPhone,
      recipient_name: 'Dr. Custom Parent',
    }),
  });

  const customData = await customDispatchRes.json();
  console.log('Dispatcher response with custom template:', customData);
  assert(customData.messageId, 'Should return messageId');

  // Verify the row content stored in whatsapp_messages
  const { data: loggedMsg } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('message_content, status')
    .eq('id', customData.messageId)
    .single();

  console.log('Stored message content:', loggedMsg?.message_content);
  assert(loggedMsg?.message_content.includes(customTag), 'Message content should include custom tag from DB template');
  assert(loggedMsg?.message_content.includes('Dr. Custom Parent'), 'Message content should interpolate {parentName}');
  console.log('✅ Verified: Dispatcher successfully fetched and rendered template from database!');

  // Cleanup test message and restore original template
  await supabaseAdmin.from('whatsapp_messages').delete().eq('id', customData.messageId);
  await supabaseAdmin
    .from('whatsapp_automation_rules')
    .update({ template_content: originalOnboardingTemplate })
    .eq('trigger_type', 'onboarding');
  console.log('Restored original onboarding template in database.');

  // STEP 4: Playwright UI Verification of Automation Rules Tab
  console.log('\nStep 4: Testing Automation Rules Tab in Admin UI with Playwright...');
  const testEmail = `admin_rules_test_${Date.now()}@example.com`;
  const testPass = 'AdminPass123!';
  const { data: u } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { full_name: 'Rules Admin Test', role: 'admin' },
  });
  await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', u.user.id);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin**', { timeout: 15000 });
    await page.goto('http://localhost:5174/admin/whatsapp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("Automation Rules")', { timeout: 15000 });

    console.log('Clicking "Automation Rules" tab...');
    await page.click('button:has-text("Automation Rules")');

    // Wait for rules cards to load
    await page.waitForSelector('text=Welcome & Client Onboarding', { timeout: 10000 });
    await page.waitForSelector('text=Booking Confirmation', { timeout: 10000 });
    await page.waitForSelector('text=24-Hour Session Reminder', { timeout: 10000 });
    await page.waitForSelector('text=1-Hour Session Reminder', { timeout: 10000 });
    await page.waitForSelector('text=Post-Session Follow-up', { timeout: 10000 });
    console.log('✅ All 5 automation rule cards are rendered in the UI!');

    // Check "Send One-Off Custom Message" button
    const customMsgBtn = page.locator('button:has-text("Send One-Off Custom Message")');
    await customMsgBtn.click();
    await page.waitForSelector('h3:has-text("Send WhatsApp Message")', { timeout: 5000 });
    console.log('✅ "Send One-Off Custom Message" button opens the manual message modal!');
    await page.click('button:has-text("Cancel")');

    console.log('🎉 Automation Rules UI, toggles, and database templates fully verified!');
  } finally {
    await browser.close();
    await supabaseAdmin.auth.admin.deleteUser(u.user.id);
  }
}

runIssue3Verification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
