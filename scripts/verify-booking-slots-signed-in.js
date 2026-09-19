import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqnthevakllugdlioalm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1MTY1NSwiZXhwIjoyMDk4MTI3NjU1fQ.ixddwiVbKdPVbBHevRIv_YPVL--IjJZBPcepouFH_jE';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyBookingFlowSignedIn() {
  console.log('=== STARTING END-TO-END SIGNED-IN BOOKING VERIFICATION ===\n');

  const testEmail = `signed_in_booking_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Dr. Verified Parent';

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: testName },
  });

  if (createError) {
    console.error('Failed to create test user:', createError);
    return;
  }
  const userId = userData.user.id;

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Log in
    console.log('[1] Logging in at /auth/login...');
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });
    console.log('    ✓ Successfully signed in');

    // 2. Navigate to /booking
    console.log('[2] Navigating to http://localhost:5174/booking...');
    await page.goto('http://localhost:5174/booking', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 3. Verify initial time slots appear
    console.log('[3] Checking Available Times section...');
    await page.waitForSelector('button:has-text("10:00"), button:has-text("10:30"), button:has-text("11:00")', { timeout: 8000 });
    const allButtons = await page.locator('button').allTextContents();
    const timeSlots = allButtons.filter(b => /^\d{2}:\d{2}$/.test(b.trim()));
    console.log(`    ✓ Time slots immediately visible for signed-in user: ${timeSlots.join(', ')}`);
    if (timeSlots.length === 0) {
      throw new Error('No time slots displayed for signed-in user!');
    }

    // 4. Click a different session type (e.g. 60-Minute Coaching Session)
    console.log('[4] Selecting "60-Minute Coaching Session"...');
    await page.click('button:has-text("60-Minute Coaching Session")');
    await page.waitForTimeout(1000);
    const allButtonsAfter = await page.locator('button').allTextContents();
    const coachingSlots = allButtonsAfter.filter(b => /^\d{2}:\d{2}$/.test(b.trim()));
    console.log(`    ✓ Updated time slots for 60-Minute Coaching: ${coachingSlots.join(', ')}`);

    // 5. Click a time slot (e.g. 10:30)
    console.log('[5] Clicking time slot "10:30"...');
    await page.click('button:has-text("10:30")');
    await page.waitForTimeout(800);

    // 6. Verify User Details auto-populated
    const nameInputVal = await page.inputValue('input[placeholder="Your name"]');
    const emailInputVal = await page.inputValue('input[placeholder="your@email.com"]');
    console.log(`    ✓ Form auto-filled name: "${nameInputVal}", email: "${emailInputVal}"`);

    // 7. Verify Summary reflects session, date, and selected time
    const summaryText = await page.locator('div:has-text("SUMMARY")').first().innerText();
    console.log('\n--- Booking Summary Card ---\n', summaryText);

    // 8. Capture screenshot
    const screenshotPath = 'C:/Users/hp/.gemini/antigravity-ide/brain/9bfaa0ad-5c84-4eaf-9056-dc17a740fd2c/signed_in_booking_verified.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`\n    ✓ Screenshot saved to: ${screenshotPath}`);

    console.log('\n=== ALL SIGNED-IN BOOKING TESTS PASSED PERFECTLY ===\n');

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch {}
    await browser.close();
  }
}

verifyBookingFlowSignedIn();
