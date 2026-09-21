import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

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

async function runIssue1Reproduction() {
  console.log('=== [ISSUE 1 REPRODUCTION] Testing Search Input Jumps & Layout Shifts ===');

  const testEmail = `admin_ui_test_${Date.now()}@example.com`;
  const testPass = 'AdminPass123!';
  
  // 1. Create a temporary admin user
  const { data: u, error: uErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPass,
    email_confirm: true,
    user_metadata: { full_name: 'Test UI Admin', role: 'admin' },
  });

  if (uErr) {
    console.error('Failed to create admin:', uErr);
    process.exit(1);
  }

  await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', u.user.id);
  console.log('Created temporary admin user:', testEmail);

  // Insert a couple of sample messages so the table has content to render
  const sampleMsgIds = [];
  for (let i = 1; i <= 3; i++) {
    const { data: sampleRow } = await supabaseAdmin.from('whatsapp_messages').insert({
      recipient_phone: `+20100000000${i}`,
      recipient_name: `Sample Parent ${i}`,
      message_type: 'onboarding',
      message_content: `Welcome message sample ${i}`,
      status: 'sent',
    }).select('id').single();
    if (sampleRow) sampleMsgIds.push(sampleRow.id);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Sign in
    await page.goto('http://localhost:5174/auth/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPass);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin**', { timeout: 15000 });
    console.log('Signed in successfully.');

    // Navigate to /admin/whatsapp
    await page.goto('http://localhost:5174/admin/whatsapp', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[placeholder*="Search by recipient phone"]', { timeout: 20000 });
    console.log('Admin WhatsApp page loaded.');

    const searchInput = page.locator('input[placeholder*="Search by recipient phone"]');
    await searchInput.scrollIntoViewIfNeeded();

    // Track requests to supabase whatsapp_messages
    let messagesFetchCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('whatsapp_messages')) {
        messagesFetchCount++;
      }
    });

    // Track spinner DOM insertions
    let spinnerMountCount = 0;
    await page.exposeFunction('onSpinnerMounted', () => {
      spinnerMountCount++;
    });

    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              const el = node;
              if (el.textContent?.includes('Loading message history...') || el.querySelector?.('.animate-spin')) {
                window.onSpinnerMounted();
              }
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Record initial bounding box of search input
    const initialBox = await searchInput.boundingBox();
    console.log('Initial search input bounding box:', initialBox);

    const initialFetchCount = messagesFetchCount;
    const testQuery = 'Sample';
    console.log(`\nTyping "${testQuery}" character-by-character with 150ms delay...`);

    let focusLossDetected = false;
    let layoutShiftDetected = false;

    for (let i = 0; i < testQuery.length; i++) {
      const char = testQuery[i];
      await searchInput.type(char, { delay: 150 });
      
      // Check if input is still focused
      const isFocused = await searchInput.evaluate((el) => document.activeElement === el);
      if (!isFocused) {
        focusLossDetected = true;
        console.warn(`[WARNING] Input lost focus after typing '${char}'!`);
      }

      // Check bounding box
      const curBox = await searchInput.boundingBox();
      if (curBox && initialBox && (Math.abs(curBox.y - initialBox.y) > 2 || Math.abs(curBox.x - initialBox.x) > 2)) {
        layoutShiftDetected = true;
        console.warn(`[WARNING] Layout shift detected! Box moved to y=${curBox.y} (initial=${initialBox.y})`);
      }
    }

    // Wait a short moment for in-flight requests to complete
    await page.waitForTimeout(1000);

    const fetchesDuringTyping = messagesFetchCount - initialFetchCount;
    console.log('\n--- DIAGNOSTIC RESULTS ---');
    console.log(`Query characters typed: ${testQuery.length}`);
    console.log(`Network requests fired during typing: ${fetchesDuringTyping}`);
    console.log(`Spinner / Loading state mount events: ${spinnerMountCount}`);
    console.log(`Focus loss detected: ${focusLossDetected}`);
    console.log(`Layout shift detected: ${layoutShiftDetected}`);

    if (fetchesDuringTyping > 1) {
      console.log('🚨 CAUSE CONFIRMED: Message list is re-fetching on EVERY keystroke without debounce!');
    }
    if (spinnerMountCount > 0) {
      console.log('🚨 UI JUMP CONFIRMED: Table is unmounted and replaced with "Loading message history..." spinner on keystrokes!');
    }

  } finally {
    await browser.close();
    // Clean up sample rows and test admin
    if (sampleMsgIds.length > 0) {
      await supabaseAdmin.from('whatsapp_messages').delete().in('id', sampleMsgIds);
    }
    await supabaseAdmin.auth.admin.deleteUser(u.user.id);
    console.log('Cleaned up test admin and sample rows.');
  }
}

runIssue1Reproduction().catch((err) => {
  console.error('Error during reproduction:', err);
  process.exit(1);
});
