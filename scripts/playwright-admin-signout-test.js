import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function testAdminSignout() {
  const email = `admin_test_${Date.now()}@example.com`;
  const pass = 'AdminPass123!';
  const { data: u, error: uErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
    user_metadata: { full_name: 'Test Admin User', role: 'admin' }
  });

  if (uErr) {
    console.error('Failed to create admin user:', uErr);
    return;
  }

  await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', u.user.id);
  console.log('Created admin test user:', email);

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', pass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin**', { timeout: 10000 });
    console.log('Successfully signed into admin. Current URL:', page.url());

    const tokenBefore = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.includes('auth-token'));
    });
    console.log('Tokens in storage before sign out:', tokenBefore);

    // Locate and click sign out button in admin sidebar
    const signoutBtn = page.locator('button[aria-label="Sign out"]').first();
    await signoutBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Clicking admin Sign Out button...');
    await signoutBtn.click();

    // Small wait to allow click handler execution
    await page.waitForTimeout(500);

    const tokenImmediate = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.includes('auth-token'));
    });
    console.log('Tokens in storage immediately after admin sign out:', tokenImmediate);

    // Reload
    console.log('Reloading page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tokenAfterReload = await page.evaluate(() => {
      return Object.keys(localStorage).filter(k => k.includes('auth-token'));
    });
    console.log('Tokens in storage after reload:', tokenAfterReload);
    console.log('Current URL after reload:', page.url());

  } catch (err) {
    console.error('Admin test error:', err);
  } finally {
    await supabaseAdmin.auth.admin.deleteUser(u.user.id);
    await browser.close();
    console.log('Admin test complete.');
  }
}

testAdminSignout();
