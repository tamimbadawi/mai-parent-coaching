import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runSignedinBookingDiagnostic() {
  console.log('=== RUNNING SIGNED-IN BOOKING TIME SLOTS DIAGNOSTIC ===\n');

  const testEmail = `slot_user_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Slot Test Parent' },
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    return;
  }
  const userId = userData.user.id;

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to all browser console messages and errors
  page.on('console', (msg) => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', (err) => {
    console.log(`[Browser Uncaught Error]:`, err.message);
  });

  try {
    // 1. Sign in
    console.log('[1] Logging in...');
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });

    // 2. Navigate to /booking as a signed in user
    console.log('[2] Navigating to http://localhost:5174/booking as signed-in user...');
    await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // 3. Inspect the Available Times section DOM
    console.log('\n--- [3] INSPECTING DOM ON /booking (SIGNED IN) ---');
    
    // Check if time buttons are present
    const timeButtons = await page.locator('div:has-text("Available Times") button').allTextContents();
    console.log('Time buttons found in section:', timeButtons);

    const allButtons = await page.locator('button').allTextContents();
    console.log('All buttons on page containing times:', allButtons.filter(b => b.includes(':') || b.includes('10:') || b.includes('11:') || b.includes('12:') || b.includes('16:')));

    // Check what text is inside the Available Times box
    const availableTimesBoxText = await page.locator('div:has-text("Available Times")').first().innerText();
    console.log('\nAvailable Times Box inner text:\n', availableTimesBoxText);

    // Let's test Supabase queries directly in the browser context
    console.log('\n--- TESTING SUPABASE QUERIES IN BROWSER ---');
    const directQueryResults = await page.evaluate(async () => {
      // Create a test query with timeout
      const testQuery = async (name, promise, timeoutMs = 4000) => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
        );
        try {
          const res = await Promise.race([promise, timeoutPromise]);
          return { name, success: true, res };
        } catch (err) {
          return { name, success: false, error: err?.message || String(err) };
        }
      };

      // Import or get supabase from window or create client
      // @ts-ignore
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
      const tokenObj = JSON.parse(localStorage.getItem('sb-qqnthevakllugdlioalm-auth-token') || '{}');
      const token = tokenObj?.access_token;
      
      const sb = createClient(
        'https://qqnthevakllugdlioalm.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc',
        {
          global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        }
      );

      const r1 = await testQuery('coach_availability_rules', sb.from('coach_availability_rules').select('*'));
      const r2 = await testQuery('bookings', sb.from('bookings').select('*'));
      const r3 = await testQuery('profiles', sb.from('profiles').select('*'));

      return { tokenPresent: !!token, r1, r2, r3 };
    });
    console.log('Direct browser queries result:', JSON.stringify(directQueryResults, null, 2));

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch {}
    await browser.close();
    console.log('\n=== DIAGNOSTIC FINISHED ===');
  }
}

runSignedinBookingDiagnostic();
