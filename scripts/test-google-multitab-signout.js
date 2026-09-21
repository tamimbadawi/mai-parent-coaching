import { chromium } from 'playwright';

async function runGoogleOAuthMultiTabTest() {
  console.log('===============================================================');
  console.log('=== GOOGLE OAUTH MULTI-TAB PLAYWRIGHT TEST ===');
  console.log('===============================================================');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext();
  const tab1 = await context.newPage();

  try {
    console.log('\n--- STEP 1 & 2: LAUNCH & NAVIGATE TO GOOGLE OAUTH ---');
    await tab1.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' });

    console.log('Clicking "Continue with Google" button...');
    await tab1.click('button:has-text("Continue with Google")');

    console.log('\n===============================================================');
    console.log('>>> [ACTION REQUIRED IN BROWSER WINDOW]');
    console.log('>>> The Chromium browser window is currently displaying Google Sign-In.');
    console.log('>>> Please select or type your Google account in that browser window.');
    console.log('>>> The script is waiting (up to 5 minutes) for the redirect back to localhost:5173.');
    console.log('===============================================================\n');

    // Wait for redirect away from google.com back to localhost (300 seconds)
    await tab1.waitForURL(
      (url) => url.origin === 'http://localhost:5173' && !url.pathname.includes('/auth/login'),
      { timeout: 300000 }
    );

    // Wait for callback processing and landing on final page (e.g. / or /admin)
    await tab1.waitForTimeout(2500);
    console.log(`OAuth redirect complete! Tab 1 landed on: ${tab1.url()}`);

    // Read Tab 1 localStorage
    console.log('\n--- STEP 3: READ TAB 1 STORAGE & OPEN TAB 2 ---');
    const tab1Storage = await tab1.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        items[k] = localStorage.getItem(k);
      }
      return items;
    });

    let tab1TokenKey = null;
    for (const [k, v] of Object.entries(tab1Storage)) {
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        tab1TokenKey = k;
        console.log(`>>> TAB 1 AUTH TOKEN KEY: "${k}"`);
        console.log(`>>> TOKEN VALUE (first 100 chars): ${v.slice(0, 100)}...`);
      }
    }

    if (!tab1TokenKey) {
      console.warn('WARNING: No auth token found in Tab 1 after Google OAuth!');
    }

    // Open Tab 2 in the same browser context
    console.log('\nOpening Tab 2 in the same browser context...');
    const tab2 = await context.newPage();

    // Set up network monitoring on Tab 2
    const tab2NetworkHits = [];
    tab2.on('request', (req) => {
      const url = req.url();
      if (
        url.includes('google') ||
        url.includes('auth') ||
        url.includes('supabase') ||
        url.includes('callback') ||
        url.includes('token')
      ) {
        tab2NetworkHits.push({ method: req.method(), url });
      }
    });

    await tab2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await tab2.waitForTimeout(1500);
    console.log(`Tab 2 loaded. URL: ${tab2.url()}`);

    // Confirm Tab 2 shows signed in
    const tab2InitialTokens = await tab2.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    });
    const tab2ProfileInitial = await tab2.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);
    const tab2SignInInitial = await tab2.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);

    console.log('Tab 2 initial auth tokens in storage:', tab2InitialTokens);
    console.log(`Tab 2 UI Check: Profile Icon visible? -> ${tab2ProfileInitial}`);
    console.log(`Tab 2 UI Check: "Sign In" button visible? -> ${tab2SignInInitial}`);

    // Step 4: In Tab 1, click Sign Out
    console.log('\n--- STEP 4: SIGN OUT FROM TAB 1 ---');
    const isTab1Admin = tab1.url().includes('/admin');
    if (isTab1Admin) {
      console.log('Tab 1 is on /admin. Clicking admin Sign Out button...');
      const adminSignOut = tab1.locator('button[aria-label="Sign out"]').first();
      await adminSignOut.waitFor({ state: 'visible', timeout: 5000 });
      await adminSignOut.click();
    } else {
      console.log('Tab 1 is on public site. Clicking Profile menu -> Sign Out...');
      const profileMenu = tab1.locator('button[aria-label="Open profile menu"]');
      await profileMenu.waitFor({ state: 'visible', timeout: 5000 });
      await profileMenu.click();
      await tab1.waitForTimeout(300);
      const signOutBtn = tab1.locator('button:has-text("Sign Out")').first();
      await signOutBtn.waitFor({ state: 'visible', timeout: 5000 });
      await signOutBtn.click();
    }

    await tab1.waitForTimeout(400);

    const tab1StorageAfterClick = await tab1.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    });
    console.log('Tab 1 localStorage auth tokens immediately after sign-out click:', tab1StorageAfterClick);

    // Step 5: Check Tab 2 in-memory & UI state BEFORE reload
    console.log('\n--- STEP 5: CHECK TAB 2 STATE WITHOUT RELOAD ---');
    await tab2.waitForTimeout(2000);

    const tab2TokensBeforeReload = await tab2.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    });
    const tab2ProfileBeforeReload = await tab2.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);
    const tab2SignInBeforeReload = await tab2.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);

    console.log('Tab 2 storage tokens before reload:', tab2TokensBeforeReload);
    console.log(`Tab 2 UI before reload: Profile Icon visible? -> ${tab2ProfileBeforeReload}`);
    console.log(`Tab 2 UI before reload: "Sign In" button visible? -> ${tab2SignInBeforeReload}`);

    if (tab2ProfileBeforeReload) {
      console.log('>>> [OBSERVATION]: Tab 2 still rendered profile icon before reload (cross-tab in-memory desync).');
    } else {
      console.log('>>> [OBSERVATION]: Tab 2 automatically synced to signed-out UI without reload.');
    }

    // Step 6 & 7: Reload Tab 2 and monitor network requests
    console.log('\n--- STEP 6 & 7: RELOAD TAB 2 & CAPTURE NETWORK REQUESTS ---');
    tab2NetworkHits.length = 0; // Clear requests recorded before reload

    console.log('Reloading Tab 2 (tab2.reload())...');
    await tab2.reload({ waitUntil: 'networkidle' });
    await tab2.waitForTimeout(1500);
    console.log(`Tab 2 reloaded. Current URL: ${tab2.url()}`);

    console.log('\n--- NETWORK REQUESTS RECORDED DURING TAB 2 RELOAD ---');
    if (tab2NetworkHits.length === 0) {
      console.log('No auth / google / callback network requests intercepted during reload.');
    } else {
      for (const req of tab2NetworkHits) {
        console.log(`[${req.method}] ${req.url}`);
      }
    }

    const tab2TokensAfterReload = await tab2.evaluate(() => {
      return Object.keys(localStorage).filter((k) => k.includes('auth-token'));
    });
    const tab2ProfileAfterReload = await tab2.locator('button[aria-label="Open profile menu"]').isVisible().catch(() => false);
    const tab2SignInAfterReload = await tab2.locator('button:has-text("Sign In")').first().isVisible().catch(() => false);

    console.log('\n--- POST-RELOAD FINDINGS ---');
    console.log('Tab 2 storage tokens after reload:', tab2TokensAfterReload);
    console.log(`Tab 2 UI after reload: Profile Icon visible? -> ${tab2ProfileAfterReload}`);
    console.log(`Tab 2 UI after reload: "Sign In" button visible? -> ${tab2SignInAfterReload}`);

    console.log('\n===============================================================');
    console.log('=== TEST SUMMARY & REPORT ===');
    console.log('===============================================================');
    console.log(`1. Tab 1 token after click: ${tab1StorageAfterClick.length === 0 ? 'WIPED' : 'PRESENT'}`);
    console.log(`2. Tab 2 storage before reload: ${tab2TokensBeforeReload.length === 0 ? 'WIPED' : 'PRESENT'}`);
    console.log(`3. Tab 2 UI before reload: ${tab2ProfileBeforeReload ? 'STILL SIGNED IN' : 'SIGNED OUT'}`);
    console.log(`4. Tab 2 storage after reload: ${tab2TokensAfterReload.length === 0 ? 'WIPED' : 'RE-CREATED'}`);
    console.log(`5. Tab 2 UI after reload: ${tab2ProfileAfterReload ? 'SIGNED IN' : 'SIGNED OUT'}`);
    console.log(`6. Silent Google/Supabase re-auth requests during reload: ${tab2NetworkHits.some(r => r.url.includes('google.com') || r.url.includes('/auth/v1/token')) ? 'YES' : 'NO'}`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await tab1.waitForTimeout(2000);
    await browser.close();
    console.log('\nBrowser closed. Test finished.');
  }
}

runGoogleOAuthMultiTabTest();
