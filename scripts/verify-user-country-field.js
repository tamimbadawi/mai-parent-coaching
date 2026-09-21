import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
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

async function runCountryVerification() {
  console.log('=== [USER COUNTRY OPTION VERIFICATION (ADD & EDIT)] ===\n');

  // Create temporary admin
  const testEmail = `admin_country_test_${Date.now()}@example.com`;
  const testPass = 'AdminPass123!';
  const { data: u } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { full_name: 'Country Test Admin', role: 'admin' },
  });

  for (let i = 0; i < 5; i++) {
    const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', u.user.id).maybeSingle();
    if (prof) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await supabaseAdmin.from('profiles').update({ role: 'admin', approval_status: 'approved' }).eq('id', u.user.id);
  console.log('Created temporary test admin:', testEmail);

  // Start preview server
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    server.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('4173') || msg.includes('Local:')) resolve();
    });
    setTimeout(resolve, 3500);
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let createdUserId = null;

  try {
    // 1. Log in
    console.log('Logging in as admin...');
    await page.goto('http://localhost:4173/auth/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPass);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // 2. Navigate to /admin/users
    console.log('Navigating to /admin/users...');
    await page.goto('http://localhost:4173/admin/users');
    await page.waitForSelector('text=User control center', { timeout: 10000 });

    // 3. Click "Add user"
    console.log('Opening "Add user" modal...');
    const addBtn = await page.waitForSelector('button:has-text("Add user")');
    await addBtn.click();
    await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });

    // 4. Verify Country selector exists in modal
    const countryLabel = await page.waitForSelector('text=Country of residency');
    assert.ok(countryLabel, '"Country of residency" label must exist in Add User modal');
    console.log('✓ Found "Country of residency" label in modal.');

    // Verify modal has no scrolling / overflow-y auto
    const modalBox = await page.waitForSelector('div[role="dialog"] > div');
    const isScrollable = await page.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.overflowY === 'auto' || style.overflowY === 'scroll' || el.scrollHeight > el.clientHeight + 5;
    }, modalBox);
    assert.equal(isScrollable, false, 'Modal popup window must not be scrollable or have overflow-y auto/scroll');
    console.log('✓ Verified scrolling is NOT allowed in the popup window (compact 2-column layout).');

    // 5. Test Country selection automatically changes phone dial code prefix
    const phonePrefixBtn = await page.waitForSelector('button[aria-label="Select country code"]');
    let initialPhonePrefix = await phonePrefixBtn.textContent();
    console.log(`Initial phone dial code prefix: "${initialPhonePrefix?.trim()}"`);

    // Click country selector button
    const countryDropdownBtn = await page.waitForSelector('button[aria-haspopup="listbox"]');
    await countryDropdownBtn.click();
    console.log('✓ Clicked country selector dropdown.');

    // Search and select Saudi Arabia
    let searchInput = await page.waitForSelector('input[placeholder*="Search country"]');
    await searchInput.fill('Saudi');
    await page.waitForTimeout(200);
    const saudiOption = await page.waitForSelector('li[role="option"]:has-text("Saudi Arabia")');
    await saudiOption.click();

    // Verify phone dial code prefix automatically changed to +966
    await page.waitForTimeout(200);
    let updatedPhonePrefix = await phonePrefixBtn.textContent();
    assert.ok(updatedPhonePrefix?.includes('+966'), `Selecting Saudi Arabia must auto-update phone prefix to +966 (got "${updatedPhonePrefix}")`);
    console.log(`✓ Phone dial prefix automatically updated to: "${updatedPhonePrefix?.trim()}" (+966)`);

    // Switch country to Egypt
    await countryDropdownBtn.click();
    searchInput = await page.waitForSelector('input[placeholder*="Search country"]');
    await searchInput.fill('Egypt');
    await page.waitForTimeout(200);
    const egyptOption = await page.waitForSelector('li[role="option"]:has-text("Egypt")');
    await egyptOption.click();

    // Verify phone dial code prefix automatically changed to +20
    await page.waitForTimeout(200);
    updatedPhonePrefix = await phonePrefixBtn.textContent();
    assert.ok(updatedPhonePrefix?.includes('+20'), `Selecting Egypt must auto-update phone prefix to +20 (got "${updatedPhonePrefix}")`);
    console.log(`✓ Phone dial prefix automatically updated back to: "${updatedPhonePrefix?.trim()}" (+20)`);

    // 8. Fill in other required user details
    const newUserEmail = `created_user_${Date.now()}@example.com`;
    await page.fill('input[placeholder="e.g. Sarah Jenkins"]', 'Test Country User');
    await page.fill('div[role="dialog"] input[type="email"]', newUserEmail);
    await page.fill('input[placeholder="Mobile number"]', '1012345678');
    await page.fill('input[placeholder*="Minimum 6 characters"]', 'TestPass123!');

    // 9. Save user
    console.log('Saving new user...');
    await page.click('div[role="dialog"] button[type="submit"]');

    // Wait for success toast / notification and modal closure
    await page.waitForSelector('text=User created successfully.', { timeout: 10000 });
    console.log('✓ Received success: "User created successfully."');

    // 10. Verify created user appears with country badge
    await page.waitForSelector(`text=${newUserEmail}`, { timeout: 10000 });
    const userRow = await page.waitForSelector(`div:has-text("${newUserEmail}")`);
    const rowText = await userRow.textContent();
    assert.ok(rowText.includes('Egypt') || rowText.includes('🇪🇬'), 'User row must display country indicator (Egypt/🇪🇬)');
    console.log('✓ User row correctly displays country badge in the table.');

    // 11. Test EDIT modal: verify country is pre-populated and changing country updates phone prefix
    console.log('\nTesting EDIT user modal with country and auto-prefix...');
    const targetUserCard = page.locator('div.rounded-\\[24px\\]', { hasText: newUserEmail });
    const editBtn = targetUserCard.locator('button:has-text("Edit")');
    await editBtn.click();

    await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
    const editTitle = await page.textContent('#user-modal-title');
    assert.equal(editTitle?.trim(), 'Edit User Details');

    // Verify country button displays Egypt
    const editCountryBtn = await page.waitForSelector('button[aria-haspopup="listbox"]');
    const editCountryText = await editCountryBtn.textContent();
    assert.ok(editCountryText?.includes('Egypt'), `Edit modal must pre-populate selected country (got "${editCountryText}")`);
    console.log(`✓ Edit modal pre-populated country correctly: "${editCountryText?.trim()}"`);

    // 12. Change country in edit modal to UAE (United Arab Emirates)
    await editCountryBtn.click();
    const searchInputEdit = await page.waitForSelector('input[placeholder*="Search country"]');
    await searchInputEdit.fill('Emirates');
    await page.waitForTimeout(200);
    const uaeOption = await page.waitForSelector('li[role="option"]:has-text("United Arab Emirates")');
    await uaeOption.click();

    // Verify phone dial code prefix in edit modal automatically updated to +971
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Select country code"]');
      return btn && btn.textContent && btn.textContent.includes('+971');
    }, { timeout: 5000 });
    const editPhonePrefixBtn = await page.waitForSelector('button[aria-label="Select country code"]');
    const uaePrefixText = await editPhonePrefixBtn.textContent();
    assert.ok(uaePrefixText?.includes('+971'), `Selecting UAE in edit modal must auto-update phone prefix to +971 (got "${uaePrefixText}")`);
    console.log(`✓ Edit modal phone dial prefix automatically updated to: "${uaePrefixText?.trim()}" (+971)`);

    // Save update
    await page.click('div[role="dialog"] button[type="submit"]');
    await page.waitForSelector('text=User updated successfully.', { timeout: 10000 });
    console.log('✓ Received success: "User updated successfully."');

    // 13. Verify user row now displays United Arab Emirates
    await page.waitForTimeout(1000);
    const updatedUserCard = page.locator('div.rounded-\\[24px\\]', { hasText: newUserEmail });
    const updatedText = await updatedUserCard.textContent();
    assert.ok(updatedText.includes('United Arab Emirates') || updatedText.includes('🇦🇪'), 'User card must display updated country');
    console.log('✓ User card updated to display "United Arab Emirates"!');

    // Fetch user id from database for cleanup
    const { data: createdUserRow } = await supabaseAdmin.from('profiles').select('id, country').eq('email', newUserEmail).single();
    if (createdUserRow) {
      createdUserId = createdUserRow.id;
      assert.equal(createdUserRow.country, 'AE', 'Database country must be AE');
      console.log('✓ Database profiles table confirmed country="AE".');
    }

    console.log('\n=== ALL USER COUNTRY ADD & EDIT VERIFICATION TESTS PASSED ===\n');
  } finally {
    await browser.close();
    server.kill();
    // Cleanup created test user
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      console.log('Cleaned up created test user:', createdUserId);
    }
    // Cleanup temporary admin
    await supabaseAdmin.auth.admin.deleteUser(u.user.id);
    console.log('Cleaned up test admin account.');
  }
}

runCountryVerification().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
