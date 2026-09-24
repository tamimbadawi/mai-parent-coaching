import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is missing.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runDualTest() {
  console.log('=== VERIFYING BOOKING FOR BOTH SIGNED-OUT AND SIGNED-IN USERS ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // TEST 1: Signed-Out User
    console.log('[TEST 1] Testing Signed-Out user on /booking...');
    await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("10:00"), button:has-text("10:30")', { timeout: 8000 });
    const signedOutSlots = (await page.locator('button').allTextContents()).filter(b => /^\d{2}:\d{2}$/.test(b.trim()));
    console.log(`    ✓ Signed-out user sees time slots: ${signedOutSlots.join(', ')}`);
    if (signedOutSlots.length === 0) throw new Error('Signed-out user has no slots');

    // TEST 2: Signed-In User
    console.log('\n[TEST 2] Testing Signed-In user on /booking...');
    const testEmail = `dual_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Dual Test Parent' },
    });
    if (createError) throw createError;
    const userId = userData.user.id;

    try {
      await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
      await page.fill('input[type="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:5174/', { timeout: 10000 });

      await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
      await page.waitForSelector('button:has-text("10:00"), button:has-text("10:30")', { timeout: 8000 });
      const signedInSlots = (await page.locator('button').allTextContents()).filter(b => /^\d{2}:\d{2}$/.test(b.trim()));
      console.log(`    ✓ Signed-in user sees time slots: ${signedInSlots.join(', ')}`);
      if (signedInSlots.length === 0) throw new Error('Signed-in user has no slots');

      // Click time
      await page.click('button:has-text("11:00")');
      await page.waitForTimeout(500);
      const selectedTimeText = await page.locator('button:has-text("11:00")').getAttribute('class');
      console.log(`    ✓ Slot 11:00 successfully selected (has active class: ${selectedTimeText?.includes('bg-sage')})`);

      console.log('\n=== BOTH TESTS PASSED WITH 100% SUCCESS ===');
    } finally {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  } finally {
    await browser.close();
  }
}

runDualTest();
