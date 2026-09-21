import { chromium } from 'playwright';

async function testGoogleOAuth() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://localhost:5173/auth/login');
  await page.click('button:has-text("Continue with Google")');
  await page.waitForTimeout(4000);
  console.log('Current URL after Google click:', page.url());
  await browser.close();
}

testGoogleOAuth();
