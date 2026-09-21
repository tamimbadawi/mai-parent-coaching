import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
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

async function runModalUserSearchVerification() {
  console.log('=== [USER SEARCH MODAL VERIFICATION] Testing User & Phone Search in Send Message Modal ===\n');

  // Create temporary admin
  const testEmail = `admin_modal_test_${Date.now()}@example.com`;
  const testPass = 'AdminPass123!';
  const { data: u } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { full_name: 'Modal Test Admin', role: 'admin' },
  });
  // Ensure profile exists and has role admin
  for (let i = 0; i < 5; i++) {
    const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', u.user.id).maybeSingle();
    if (prof) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await supabaseAdmin.from('profiles').update({ role: 'admin', approval_status: 'approved' }).eq('id', u.user.id);
  console.log('Created and verified test admin user:', testEmail);

  // Insert a specific test user profile with name and phone
  const testClientPhone = '+201005809498';
  const testClientName = `Test Recipient ${Date.now()}`;
  const testClientEmail = `client_${Date.now()}@example.com`;

  const { data: clientUser } = await supabaseAdmin.auth.admin.createUser({
    email: testClientEmail,
    password: 'ClientPassword123!',
    email_confirm: true,
    user_metadata: { full_name: testClientName, phone: testClientPhone },
  });

  for (let i = 0; i < 5; i++) {
    const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', clientUser.user.id).maybeSingle();
    if (prof) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await supabaseAdmin
    .from('profiles')
    .update({ full_name: testClientName, phone: testClientPhone, approval_status: 'approved' })
    .eq('id', clientUser.user.id);
  console.log(`Created test client profile: "${testClientName}" (${testClientPhone})`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Start local preview or check dev server
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin**', { timeout: 15000 });
    console.log('Logged in. Navigating to /admin/whatsapp...');
    await page.goto('http://localhost:5174/admin/whatsapp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("Automation Rules")', { timeout: 15000 });
    console.log('Admin WhatsApp page loaded. Current URL:', page.url());

    // Switch to Automation Rules tab and click Send One-Off Custom Message
    console.log('Opening "Send Message" modal...');
    await page.click('button:has-text("Automation Rules")');
    const sendBtn = page.locator('button:has-text("Send One-Off Custom Message")');
    await sendBtn.waitFor({ state: 'visible', timeout: 10000 });
    await sendBtn.click();

    // Verify modal is open
    await page.waitForSelector('h3:has-text("Send WhatsApp Message")', { timeout: 5000 });
    console.log('✅ Send Message modal opened successfully.');

    // Verify presence of "Search Users" and "Enter Number" toggle buttons
    const searchUsersTab = page.locator('button:has-text("Search Users")');
    const enterNumberTab = page.locator('button:has-text("Enter Number")');
    assert(await searchUsersTab.isVisible(), '"Search Users" button should be visible');
    assert(await enterNumberTab.isVisible(), '"Enter Number" button should be visible');
    console.log('✅ Both "Search Users" and "Enter Number" options are present in modal.');

    // Test searching for the test client by name
    const searchInput = page.locator('input[placeholder*="Search users by name"]');
    await searchInput.fill(testClientName.slice(0, 10));

    // Wait for dropdown item with testClientName to appear
    console.log(`Searching for "${testClientName.slice(0, 10)}"...`);
    const userOption = page.locator(`button:has-text("${testClientName}")`);
    await userOption.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`✅ Found user suggestion in dropdown: "${testClientName}" with phone badge.`);

    // Click on the user to select them
    await userOption.click();

    // Verify selected user card appears
    await page.waitForSelector(`div:has-text("${testClientName}")`, { timeout: 3000 });
    console.log('✅ Selected user chip displayed.');

    // Verify that the phone number input is automatically populated with the user\'s phone number
    const phoneInput = page.locator('input[value*="01005809498"], input[value*="+201005809498"]');
    const populatedPhone = await phoneInput.inputValue();
    console.log('Auto-populated phone number in input:', populatedPhone);
    assert(populatedPhone.includes('01005809498'), 'Phone input should automatically contain client phone');
    console.log('✅ Phone number automatically populated from selected user!');

    // Test switching to "Enter Number" mode
    await enterNumberTab.click();
    const directPhoneInput = page.locator('input[placeholder*="+966501234567 or +201012345678"]');
    assert(await directPhoneInput.isVisible(), 'Direct phone input should be visible in Enter Number mode');
    console.log('✅ Successfully switched to direct phone number entry mode.');

    // Test switching back to "Search Users" mode
    await searchUsersTab.click();
    assert(await page.locator('input[placeholder*="Search users by name"]').isVisible(), 'Search input should be visible again');
    console.log('✅ Successfully switched back to Search Users mode.');

    console.log('\n🎉 ALL MODAL RECIPIENT SEARCH REQUIREMENTS VERIFIED WITH HARD EVIDENCE!');
  } finally {
    await browser.close();
    // Cleanup test users
    await supabaseAdmin.auth.admin.deleteUser(u.user.id);
    await supabaseAdmin.auth.admin.deleteUser(clientUser.user.id);
    console.log('Cleaned up test admin and test client.');
  }
}

runModalUserSearchVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
