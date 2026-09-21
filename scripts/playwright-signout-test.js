import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('===============================================================');
  console.log('=== STEP 1: LAUNCH REAL BROWSER (HEADED) ===');
  console.log('===============================================================');

  const testEmail = `playwright_test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log(`[Setup] Creating confirmed test user: ${testEmail}`);
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Playwright Test User' },
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    process.exit(1);
  }

  const userId = userData.user.id;
  console.log(`[Setup] Created user ID: ${userId}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('\n===============================================================');
    console.log('=== STEP 2: NAVIGATE TO LOGIN PAGE AND SIGN IN ===');
    console.log('===============================================================');
    console.log('Navigating to http://localhost:5173/auth/login...');
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' });

    console.log('Filling in email and password...');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect away from /auth/login
    console.log('Waiting for authentication & redirect...');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 });
    console.log(`Successfully signed in. Current URL: ${page.url()}`);

    // Wait for auth to settle
    await page.waitForTimeout(1000);

    console.log('\n===============================================================');
    console.log('=== STEP 3: READ AND PRINT LOCALSTORAGE AFTER SIGN-IN ===');
    console.log('===============================================================');
    const storageAfterLogin = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    console.log(`Total localStorage items: ${Object.keys(storageAfterLogin).length}`);
    let tokenKeyFound = null;
    let tokenValue = null;

    for (const [key, val] of Object.entries(storageAfterLogin)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        tokenKeyFound = key;
        tokenValue = val;
        console.log(`>>> MATCHED AUTH TOKEN KEY: "${key}"`);
        console.log(`>>> EXACT VALUE: ${val}`);
      } else {
        console.log(`    Other key: "${key}"`);
      }
    }

    if (!tokenKeyFound) {
      console.warn('WARNING: No key matching sb-*-auth-token found after sign-in!');
    }

    console.log('\n===============================================================');
    console.log('=== STEP 4 & 5: CLICK SIGN OUT & CHECK STORAGE IMMEDIATELY ===');
    console.log('===============================================================');

    // We want to capture localStorage IMMEDIATELY after clicking sign out,
    // before any reload or navigation happens.
    // In Navbar, clicking sign out calls handleSignOut -> await signOut() -> window.location.href = '/'
    // Let's set up a spy in the page to record localStorage synchronously when the sign-out button is clicked,
    // as well as evaluate it immediately after the click event resolves.
    await page.evaluate(() => {
      window.__storageCaptureBeforeNavigation = null;
      window.addEventListener('beforeunload', () => {
        // Capture exact localStorage right as navigation is triggered
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          items[key] = localStorage.getItem(key);
        }
        window.__storageCaptureBeforeNavigation = items;
      });
    });

    console.log('Locating user profile menu in UI...');
    const profileBtn = page.locator('button[aria-label="Open profile menu"]');
    await profileBtn.waitFor({ state: 'visible', timeout: 5000 });
    await profileBtn.click();
    console.log('Profile menu opened.');

    await page.waitForTimeout(300);

    const signOutBtn = page.locator('button:has-text("Sign Out")').first();
    await signOutBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Clicking "Sign Out" button in real UI...');

    // Click sign out
    await signOutBtn.click();

    // Immediately read localStorage before page reload or wait
    let storageImmediate = null;
    try {
      storageImmediate = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          items[key] = localStorage.getItem(key);
        }
        return items;
      });
    } catch (evalErr) {
      console.log('Notice: Navigation started rapidly during evaluation:', evalErr.message);
    }

    console.log('\n--- STEP 5 RESULT: LOCALSTORAGE IMMEDIATELY AFTER SIGN-OUT CLICK ---');
    let tokenPresentStep5 = false;
    let step5TokenKey = null;
    let step5TokenVal = null;

    if (storageImmediate) {
      console.log(`Immediate localStorage items count: ${Object.keys(storageImmediate).length}`);
      for (const [key, val] of Object.entries(storageImmediate)) {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          tokenPresentStep5 = true;
          step5TokenKey = key;
          step5TokenVal = val;
          console.log(`>>> TOKEN KEY STILL PRESENT IN STEP 5: "${key}"`);
          console.log(`>>> VALUE: ${val.slice(0, 100)}...`);
        } else {
          console.log(`    Storage item: "${key}"`);
        }
      }
    }

    if (!tokenPresentStep5) {
      console.log('>>> REPORT STEP 5: sb-*-auth-token is GONE immediately after sign-out click.');
    } else {
      console.log('>>> REPORT STEP 5: sb-*-auth-token is STILL PRESENT immediately after sign-out click.');
    }

    // Wait for the page to finish whatever navigation sign-out triggered
    await page.waitForTimeout(1000);

    console.log('\n===============================================================');
    console.log('=== STEP 6: RELOAD THE PAGE (page.reload()) ===');
    console.log('===============================================================');
    console.log('Executing page.reload()...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log(`Page reloaded. Current URL: ${page.url()}`);

    console.log('\n===============================================================');
    console.log('=== STEP 7: CHECK POST-RELOAD UI AND LOCALSTORAGE ===');
    console.log('===============================================================');
    const storageAfterReload = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    console.log(`Post-reload localStorage items count: ${Object.keys(storageAfterReload).length}`);
    let tokenPresentStep7 = false;
    let step7TokenKey = null;
    let step7TokenVal = null;

    for (const [key, val] of Object.entries(storageAfterReload)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        tokenPresentStep7 = true;
        step7TokenKey = key;
        step7TokenVal = val;
        console.log(`>>> TOKEN KEY FOUND AFTER RELOAD: "${key}"`);
        console.log(`>>> VALUE: ${val.slice(0, 100)}...`);
      } else {
        console.log(`    Storage item after reload: "${key}"`);
      }
    }

    if (!tokenPresentStep7) {
      console.log('>>> REPORT STEP 7: sb-*-auth-token is GONE after reload.');
    } else {
      console.log('>>> REPORT STEP 7: sb-*-auth-token is PRESENT after reload.');
    }

    // Check UI state
    const signInBtnVisible = await page.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);
    const profileBtnVisible = await page.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);

    console.log('\nUI State After Reload:');
    console.log(`- "Sign In" button visible: ${signInBtnVisible}`);
    console.log(`- Profile menu icon visible: ${profileBtnVisible}`);

    console.log('\n===============================================================');
    console.log('=== STEP 8: DEFINITIVE DETERMINATION (A vs B) ===');
    console.log('===============================================================');

    if (tokenPresentStep5) {
      console.log('>>> CONCLUSION: SCENARIO (B)');
      console.log('Token was STILL PRESENT in step 5.');
      console.log('The manual storage-wipe loop in signOut() failed to remove the token immediately upon click.');
    } else if (!tokenPresentStep5 && (tokenPresentStep7 || profileBtnVisible)) {
      console.log('>>> CONCLUSION: SCENARIO (A)');
      console.log('Token was GONE in step 5, but reload shows signed-in (token recreated or profile menu rendered).');
      console.log('Something is RE-CREATING a session on load (check onAuthStateChange listeners, cookies, or AuthContext race condition).');
    } else if (!tokenPresentStep5 && !tokenPresentStep7 && signInBtnVisible && !profileBtnVisible) {
      console.log('>>> CONCLUSION: CLEAN SIGN-OUT');
      console.log('Token was GONE in step 5, GONE in step 7, and UI is correctly in signed-out state.');
    } else {
      console.log('>>> CONCLUSION: OTHER / EDGE CASE');
      console.log(`Step 5 token present: ${tokenPresentStep5}`);
      console.log(`Step 7 token present: ${tokenPresentStep7}`);
      console.log(`Sign-in button visible: ${signInBtnVisible}`);
      console.log(`Profile button visible: ${profileBtnVisible}`);
    }

  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    // Cleanup user
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log(`\n[Cleanup] Deleted test user: ${userId}`);
    } catch (cleanErr) {
      console.warn('Failed to clean up test user:', cleanErr);
    }
    await browser.close();
    console.log('Browser closed. Test complete.');
  }
}

main();
