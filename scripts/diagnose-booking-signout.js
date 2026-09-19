import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runBookingDiagnostic() {
  console.log('================================================================');
  console.log('=== PLAYWRIGHT SIGN-OUT ON /booking PAGE DIAGNOSTIC ===');
  console.log('================================================================\n');

  const testEmail = `booking_test_${Date.now()}@example.com`;
  const testPassword = 'TestBookingPass123!';

  console.log(`[Setup] Creating verified test user: ${testEmail}`);
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Booking Tester' },
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    return;
  }
  const userId = userData.user.id;

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Sign in
    console.log('[Step 1] Navigating to Login page...');
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });
    console.log('[Step 2] Signed in. Now navigating to http://localhost:5174/booking...');

    // 2. Navigate to /booking
    await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('[Step 3] Currently on Booking page:', page.url());

    // Check localStorage on /booking
    const storageOnBooking = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    let tokenKey = null;
    for (const [k, v] of Object.entries(storageOnBooking)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        tokenKey = k;
        console.log(`[Step 3] Auth Token found in storage on /booking: "${k}"`);
      }
    }

    // 3. Click Sign Out on /booking
    console.log('\n--- [Step 4] CLICKING SIGN OUT WHILE ON /booking ---');
    const profileBtn = page.locator('button[aria-label="Open profile menu"]');
    await profileBtn.waitFor({ state: 'visible', timeout: 5000 });
    await profileBtn.click();
    await page.waitForTimeout(400);

    const signOutBtn = page.locator('button:has-text("Sign Out")').first();
    await signOutBtn.waitFor({ state: 'visible', timeout: 5000 });
    await signOutBtn.click();

    // Small wait for execution
    await page.waitForTimeout(500);

    // 4. Check localStorage immediately after Sign Out
    console.log('\n--- [Step 5] LOCALSTORAGE IMMEDIATELY AFTER SIGN OUT ---');
    const storageAfterSignOut = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    let tokenPresentStep5 = false;
    for (const [k, v] of Object.entries(storageAfterSignOut)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        tokenPresentStep5 = true;
        console.log(`>> TOKEN STILL PRESENT: "${k}"`);
      }
    }

    if (!tokenPresentStep5) {
      console.log('>> [Step 5]: sb-*-auth-token was REMOVED from localStorage immediately.');
    }

    // 5. Navigate back to /booking or reload
    console.log('\n--- [Step 6] NAVIGATING BACK TO /booking & RELOADING ---');
    await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 6. Check UI and Storage after reload on /booking
    console.log('\n--- [Step 7] STORAGE & UI STATE ON /booking AFTER RELOAD ---');
    const storageAfterReload = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    let tokenPresentStep7 = false;
    for (const [k, v] of Object.entries(storageAfterReload)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        tokenPresentStep7 = true;
        console.log(`>> TOKEN IN LOCALSTORAGE AFTER RELOAD ON /booking: "${k}"`);
      }
    }

    if (!tokenPresentStep7) {
      console.log('>> [Step 7]: No auth token in localStorage on /booking after reload.');
    }

    const signInBtnVisible = await page.locator('button:has-text("Sign In"), a:has-text("Sign In"), a:has-text("Sign in")').first().isVisible().catch(() => false);
    const profileBtnVisible = await page.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);

    console.log(`>> UI Check: "Sign In" visible on /booking? -> ${signInBtnVisible}`);
    console.log(`>> UI Check: Profile Icon visible on /booking? -> ${profileBtnVisible}`);

    console.log('\n=====================================================');
    console.log('=== FINAL EVIDENCE ON /booking ===');
    console.log('=====================================================');
    if (!tokenPresentStep5 && !tokenPresentStep7 && !profileBtnVisible) {
      console.log('SUCCESS: Sign-out on /booking completely removed token from storage and maintained signed-out state after reload.');
    } else {
      console.log('FAIL: Session desync observed on /booking.');
    }

  } catch (err) {
    console.error('Booking Diagnostic error:', err);
  } finally {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log('[Cleanup] Test user deleted.');
    } catch {}
    await browser.close();
    console.log('=== DIAGNOSTIC FINISHED ===\n');
  }
}

runBookingDiagnostic();
