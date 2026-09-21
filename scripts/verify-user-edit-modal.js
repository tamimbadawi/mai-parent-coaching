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

async function runModalVerification() {
  console.log('=== [USER EDIT POPUP MODAL VERIFICATION] ===\n');

  // Create temporary admin
  const testEmail = `admin_popup_test_${Date.now()}@example.com`;
  const testPass = 'AdminPass123!';
  const { data: u } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { full_name: 'Popup Test Admin', role: 'admin' },
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

    // 3. Verify no modal dialog is open initially
    let modal = await page.$('div[role="dialog"]');
    assert.equal(modal, null, 'Modal should not exist before clicking Edit or Add user');
    console.log('✓ Initial state: No popup modal open.');

    // 4. Click "Edit" on the test admin or first user
    const editBtn = await page.waitForSelector('button:has-text("Edit")', { timeout: 5000 });
    assert.ok(editBtn, 'Edit button found');
    console.log('Clicking "Edit" button...');
    await editBtn.click();

    // 5. Verify the modal popup window appears
    modal = await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
    assert.ok(modal, 'Popup modal dialog appeared on clicking Edit');

    const modalTitle = await page.textContent('#user-modal-title');
    assert.equal(modalTitle?.trim(), 'Edit User Details', 'Modal title must be "Edit User Details"');
    console.log(`✓ Popup modal appeared with title: "${modalTitle?.trim()}"`);

    // 6. Verify modal is styled as a popup overlay
    const isFixed = await page.evaluate(() => {
      const el = document.querySelector('div[role="dialog"]');
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.position === 'fixed' && style.zIndex === '50';
    });
    assert.ok(isFixed, 'Modal overlay must have position: fixed and z-index: 50');
    console.log('✓ Verified modal is rendered as a fixed overlay popup window, not an inline page section.');

    // 7. Verify inputs inside the popup modal
    const emailInput = await page.$('div[role="dialog"] input[type="email"]');
    assert.ok(emailInput, 'Email input exists inside modal');
    const emailVal = await emailInput.inputValue();
    console.log(`✓ Modal email input is pre-populated: "${emailVal}"`);

    // 8. Test Escape key closes modal
    console.log('Testing Escape key to dismiss popup window...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    modal = await page.$('div[role="dialog"]');
    assert.equal(modal, null, 'Popup modal dismissed after pressing Escape');
    console.log('✓ Verified Escape key dismissed the popup modal.');

    // 9. Test "Add user" opens modal as "Add New User" and "Cancel" closes it
    console.log('Testing "Add user" popup modal...');
    const addBtn = await page.waitForSelector('button:has-text("Add user")');
    await addBtn.click();
    modal = await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
    assert.ok(modal, 'Modal opened for Add User');
    const addTitle = await page.textContent('#user-modal-title');
    assert.equal(addTitle?.trim(), 'Add New User', 'Modal title must be "Add New User"');
    console.log(`✓ "Add user" opened popup modal with title: "${addTitle?.trim()}"`);

    const cancelBtn = await page.waitForSelector('div[role="dialog"] button:has-text("Cancel")');
    await cancelBtn.click();
    await page.waitForTimeout(300);
    modal = await page.$('div[role="dialog"]');
    assert.equal(modal, null, 'Popup modal dismissed on Cancel click');
    console.log('✓ Verified Cancel button dismissed the popup modal.');

    console.log('\n=== ALL USER EDIT POPUP MODAL CHECKS PASSED ===\n');
  } finally {
    await browser.close();
    server.kill();
    // Cleanup temporary admin
    await supabaseAdmin.auth.admin.deleteUser(u.user.id);
    console.log('Cleaned up test admin account.');
  }
}

runModalVerification().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
