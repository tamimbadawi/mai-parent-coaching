import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function runMultiTabTest() {
  console.log('===============================================================');
  console.log('=== MULTI-TAB PLAYWRIGHT SIGN-OUT TEST ===');
  console.log('===============================================================');

  const testEmail = `multitab_${Date.now()}@example.com`;
  const testPassword = 'MultiTabPass123!';

  console.log(`[Setup] Creating confirmed test user: ${testEmail}`);
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Multi-Tab Tester' },
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    process.exit(1);
  }

  const userId = userData.user.id;

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  });

  // 1. Single browser context (shared storage between tabs)
  const context = await browser.newContext();
  const tab1 = await context.newPage();

  try {
    console.log('\n--- STEP 1 & 2: SIGN IN IN TAB 1 ---');
    await tab1.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' });
    await tab1.fill('input[type="email"]', testEmail);
    await tab1.fill('input[type="password"]', testPassword);
    await tab1.click('button[type="submit"]');
    await tab1.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 15000 });
    await tab1.waitForTimeout(1000);
    console.log('Tab 1 signed in successfully. URL:', tab1.url());

    // 2. Open Tab 2 in the same context
    console.log('\n--- STEP 3: OPEN TAB 2 IN SAME BROWSER CONTEXT ---');
    const tab2 = await context.newPage();

    // Set up network monitoring on Tab 2 to catch any OAuth or callback requests
    const tab2Requests = [];
    tab2.on('request', (req) => {
      const url = req.url();
      if (url.includes('google') || url.includes('auth') || url.includes('supabase') || url.includes('callback')) {
        tab2Requests.push({ url, method: req.method() });
      }
    });

    await tab2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await tab2.waitForTimeout(1000);
    console.log('Tab 2 navigated to home. URL:', tab2.url());

    // Check Tab 2 storage and UI
    const tab2InitialStorage = await tab2.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    });
    const tab2ProfileBtnVisible = await tab2.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);
    const tab2SignInBtnVisible = await tab2.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);

    console.log('Tab 2 initial auth token keys:', tab2InitialStorage);
    console.log(`Tab 2 UI Check: Profile Icon visible? -> ${tab2ProfileBtnVisible}`);
    console.log(`Tab 2 UI Check: "Sign In" button visible? -> ${tab2SignInBtnVisible}`);

    if (!tab2ProfileBtnVisible) {
      console.warn('WARNING: Tab 2 did not render as signed in!');
    } else {
      console.log('CONFIRMED: Both Tab 1 and Tab 2 are signed in and sharing session.');
    }

    // 4. In Tab 1, click Sign Out
    console.log('\n--- STEP 4: SIGN OUT IN TAB 1 ---');
    const profileBtnTab1 = tab1.locator('button[aria-label="Open profile menu"]');
    await profileBtnTab1.waitFor({ state: 'visible', timeout: 5000 });
    await profileBtnTab1.click();
    await tab1.waitForTimeout(300);

    const signOutBtnTab1 = tab1.locator('button:has-text("Sign Out")').first();
    await signOutBtnTab1.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Clicking Sign Out in Tab 1...');
    await signOutBtnTab1.click();

    // Small moment for click handler to execute
    await tab1.waitForTimeout(400);

    const tab1StorageAfter = await tab1.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    });
    console.log('Tab 1 localStorage auth tokens immediately after click:', tab1StorageAfter);

    // 5. Check Tab 2 WITHOUT reloading Tab 2 yet
    console.log('\n--- STEP 5: CHECK TAB 2 IN-MEMORY & UI STATE (BEFORE RELOAD) ---');
    // Wait 1.5 seconds to give any Supabase onAuthStateChange or storage event listeners a chance to fire
    await tab2.waitForTimeout(1500);

    const tab2StorageBeforeReload = await tab2.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        items[k] = localStorage.getItem(k);
      }
      return items;
    });

    const tab2TokensBeforeReload = Object.keys(tab2StorageBeforeReload).filter((k) => k.includes('auth-token'));
    console.log('Tab 2 localStorage auth tokens before reload:', tab2TokensBeforeReload);

    // Check Tab 2 UI state
    const tab2ProfileBeforeReload = await tab2.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);
    const tab2SignInBeforeReload = await tab2.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);

    console.log(`Tab 2 UI before reload: Profile menu icon visible? -> ${tab2ProfileBeforeReload}`);
    console.log(`Tab 2 UI before reload: "Sign In" button visible? -> ${tab2SignInBeforeReload}`);

    // Check what Tab 2's Supabase client in memory thinks
    const tab2MemorySession = await tab2.evaluate(async () => {
      try {
        // Access window / supabase if available or check via fetch
        return {
          cookies: document.cookie,
          localStorageKeys: Object.keys(localStorage),
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('Tab 2 document state before reload:', tab2MemorySession);

    if (tab2ProfileBeforeReload) {
      console.log('\n>>> CRITICAL FINDING [Step 5]: Tab 2 still renders signed-in UI while Tab 1 has signed out!');
      console.log('Tab 2 React state did NOT update from Tab 1 sign-out event.');
    } else {
      console.log('\n>>> Tab 2 UI updated automatically to signed-out state without reload.');
    }

    // 6. NOW reload Tab 2
    console.log('\n--- STEP 6 & 7: RELOAD TAB 2 & MONITOR NETWORK REQUESTS ---');
    tab2Requests.length = 0; // Reset request log for reload
    console.log('Executing tab2.reload()...');
    await tab2.reload({ waitUntil: 'networkidle' });
    await tab2.waitForTimeout(1500);

    console.log('Tab 2 reloaded. Current URL:', tab2.url());

    console.log('\n--- NETWORK REQUESTS RECORDED DURING TAB 2 RELOAD ---');
    if (tab2Requests.length === 0) {
      console.log('No auth / google / callback network requests recorded during reload.');
    } else {
      for (const r of tab2Requests) {
        console.log(`[${r.method}] ${r.url}`);
      }
    }

    const tab2StorageAfterReload = await tab2.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        items[k] = localStorage.getItem(k);
      }
      return items;
    });

    const tab2TokensAfterReload = Object.keys(tab2StorageAfterReload).filter((k) => k.includes('auth-token'));
    console.log('\nTab 2 localStorage auth tokens after reload:', tab2TokensAfterReload);
    if (tab2TokensAfterReload.length > 0) {
      for (const k of tab2TokensAfterReload) {
        console.log(`>>> TOKEN PRESENT IN TAB 2: "${k}" = ${tab2StorageAfterReload[k].slice(0, 80)}...`);
      }
    }

    const tab2ProfileAfterReload = await tab2.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);
    const tab2SignInAfterReload = await tab2.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);

    console.log(`\nTab 2 UI after reload: Profile menu icon visible? -> ${tab2ProfileAfterReload}`);
    console.log(`Tab 2 UI after reload: "Sign In" button visible? -> ${tab2SignInAfterReload}`);

    console.log('\n===============================================================');
    console.log('=== MULTI-TAB TEST SUMMARY ===');
    console.log('===============================================================');
    console.log(`Tab 1 token immediately after sign out: ${tab1StorageAfter.length === 0 ? 'CLEARED' : 'STILL PRESENT'}`);
    console.log(`Tab 2 storage before reload: ${tab2TokensBeforeReload.length === 0 ? 'CLEARED' : 'STILL PRESENT'}`);
    console.log(`Tab 2 UI before reload: ${tab2ProfileBeforeReload ? 'STILL SIGNED IN (DESYNC)' : 'SIGNED OUT'}`);
    console.log(`Tab 2 storage after reload: ${tab2TokensAfterReload.length === 0 ? 'CLEARED' : 'TOKEN RE-CREATED'}`);
    console.log(`Tab 2 UI after reload: ${tab2ProfileAfterReload ? 'SIGNED IN' : 'SIGNED OUT'}`);

  } catch (err) {
    console.error('Multi-tab test error:', err);
  } finally {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log(`\n[Cleanup] Deleted test user: ${userId}`);
    } catch {}
    await browser.close();
    console.log('Browser closed.');
  }
}

runMultiTabTest();
