import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runDiagnostic() {
  console.log('=====================================================');
  console.log('=== PLAYWRIGHT END-TO-END SIGN-OUT DIAGNOSTIC ===');
  console.log('=====================================================\n');

  const testEmail = `diag_user_${Date.now()}@example.com`;
  const testPassword = 'DiagnosticPass123!';

  console.log(`[Setup] Creating verified test user: ${testEmail}`);
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Diagnostic Tester' },
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    return;
  }
  const userId = userData.user.id;
  console.log(`[Setup] Test user created with ID: ${userId}\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1 & 2: Navigate to login and sign in via real UI
    console.log('[Step 1 & 2] Navigating to http://localhost:5174/auth/login and signing in...');
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to home
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('[Step 2] Signed in successfully. Current URL:', page.url());

    // Step 3: Read and print localStorage contents after sign-in
    console.log('\n--- [Step 3] LOCALSTORAGE CONTENTS AFTER SIGN IN ---');
    const storageAfterLogin = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    let sbAuthKey = null;
    for (const [key, value] of Object.entries(storageAfterLogin)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        sbAuthKey = key;
        console.log(`>> AUTH TOKEN KEY FOUND: "${key}"`);
        console.log(`>> VALUE (length ${value.length}): ${value.slice(0, 120)}...`);
      } else {
        console.log(`   Key: "${key}"`);
      }
    }

    if (!sbAuthKey) {
      console.log('CRITICAL: No sb-*-auth-token key found after sign in!');
    }

    // Step 4: Click the sign-out button in the UI
    console.log('\n--- [Step 4] CLICKING SIGN OUT BUTTON IN REAL UI ---');
    const profileBtn = page.locator('button[aria-label="Open profile menu"]');
    await profileBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('>> Clicking Profile Icon...');
    await profileBtn.click();
    await page.waitForTimeout(400);

    const signOutBtn = page.locator('button:has-text("Sign Out")').first();
    await signOutBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('>> Clicking "Sign Out" button...');
    await signOutBtn.click();

    // Give handler a small moment (300ms) before inspecting storage
    await page.waitForTimeout(300);

    // Step 5: Read localStorage IMMEDIATELY after Sign Out
    console.log('\n--- [Step 5] LOCALSTORAGE IMMEDIATELY AFTER SIGN OUT (BEFORE RELOAD) ---');
    const storageAfterSignOut = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    let tokenPresentStep5 = false;
    for (const [key, value] of Object.entries(storageAfterSignOut)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        tokenPresentStep5 = true;
        console.log(`>> TOKEN STILL PRESENT: "${key}" = ${value.slice(0, 80)}...`);
      } else {
        console.log(`   Remaining Key: "${key}"`);
      }
    }

    if (!tokenPresentStep5) {
      console.log('>> EVIDENCE [Step 5]: sb-*-auth-token is COMPLETELY GONE from localStorage immediately after sign-out click.');
    } else {
      console.log('>> EVIDENCE [Step 5]: sb-*-auth-token was NOT removed from localStorage on sign-out click.');
    }

    // Step 6: Reload the page
    console.log('\n--- [Step 6] RELOADING THE PAGE (page.reload()) ---');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Step 7: Check post-reload state
    console.log('\n--- [Step 7] STORAGE & UI STATE AFTER RELOAD ---');
    const storageAfterReload = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });

    let tokenPresentStep7 = false;
    for (const [key, value] of Object.entries(storageAfterReload)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        tokenPresentStep7 = true;
        console.log(`>> TOKEN IN LOCALSTORAGE AFTER RELOAD: "${key}" = ${value.slice(0, 80)}...`);
      } else {
        console.log(`   Key after reload: "${key}"`);
      }
    }

    if (!tokenPresentStep7) {
      console.log('>> EVIDENCE [Step 7]: No auth tokens found in localStorage after reload.');
    }

    const signInBtnVisible = await page.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);
    const profileBtnVisible = await page.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);

    console.log(`>> UI Check: "Sign In" button visible? -> ${signInBtnVisible}`);
    console.log(`>> UI Check: Profile Icon visible? -> ${profileBtnVisible}`);

    console.log('\n=====================================================');
    console.log('=== DEFINITIVE DIAGNOSTIC FINDINGS ===');
    console.log('=====================================================');
    if (!tokenPresentStep5 && !tokenPresentStep7 && signInBtnVisible && !profileBtnVisible) {
      console.log('DIAGNOSIS: SUCCESS - The sign-out flow works correctly.');
      console.log('1. Token was removed immediately in Step 5.');
      console.log('2. Token remained gone after reload in Step 7.');
      console.log('3. UI correctly shows signed-out state ("Sign In" visible, Profile Icon hidden).');
    } else if (tokenPresentStep5) {
      console.log('DIAGNOSIS: SCENARIO (B) - The token was still present in localStorage in Step 5.');
      console.log('Root Cause: The signOut() function failed to remove the token from storage upon click.');
    } else if (!tokenPresentStep5 && tokenPresentStep7) {
      console.log('DIAGNOSIS: SCENARIO (A) - Token was deleted in Step 5, but RE-CREATED in Step 7 upon reload.');
      console.log('Root Cause: Session re-established from external source (OAuth cookie, URL param, or background listener).');
    } else if (profileBtnVisible) {
      console.log('DIAGNOSIS: SCENARIO (UI DESYNC) - Storage is clean, but UI still renders signed-in profile component.');
    }

  } catch (err) {
    console.error('Diagnostic execution error:', err);
  } finally {
    // Clean up test user
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log('\n[Cleanup] Test user deleted from database.');
    } catch {}
    await browser.close();
    console.log('\n=== DIAGNOSTIC RUN FINISHED ===');
  }
}

runDiagnostic();
