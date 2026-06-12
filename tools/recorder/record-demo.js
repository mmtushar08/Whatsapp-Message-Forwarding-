/**
 * Records the full Sendro user flow as a video for Meta App Review.
 * Drives the real app (Vite on :5173, API on :3000) with human-like pacing.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP = 'http://localhost:5173';
const OUT_DIR = path.resolve(__dirname, 'output');

const stamp = new Date();
const suffix = `${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}`;
const EMAIL = `demo+${suffix}@sendro.app`;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function type(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 55 });
}

let failPage = null;

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  failPage = page;

  // ---- 1. Landing ----
  await page.goto(APP, { waitUntil: 'networkidle' });
  await pause(2500);
  await page.mouse.wheel(0, 500);
  await pause(1800);
  await page.mouse.wheel(0, -500);
  await pause(1200);

  // ---- 2. Signup ----
  await page.getByRole('link', { name: 'Start free' }).click();
  await page.waitForURL('**/signup');
  await pause(1500);
  await type(page.getByPlaceholder('Tushar Makwana'), 'Tushar Makwana');
  await pause(400);
  await type(page.getByPlaceholder('you@company.com'), EMAIL);
  await pause(400);
  await type(page.getByPlaceholder('8+ characters'), 'SendroDemo@2026');
  await pause(800);
  await page.getByRole('button', { name: 'Create account →' }).click();
  await page.waitForURL('**/onboarding', { timeout: 15000 });
  await pause(2000);

  // ---- 3. Onboarding step 1: business ----
  await type(page.getByPlaceholder('Acme Realty'), 'Acme Realty');
  await pause(500);
  await page.locator('select').first().selectOption('Real estate');
  await pause(500);
  await page.locator('select').nth(1).selectOption('50 – 500');
  await pause(900);
  await page.getByRole('button', { name: 'Continue →' }).click();
  await pause(1800);

  // ---- 4. Onboarding step 2: Meta embedded signup popup ----
  await page.getByRole('button', { name: /Login with Facebook/ }).click();
  await pause(2200);
  await page.getByRole('button', { name: 'Continue as Tushar' }).click();
  await pause(2200);
  await page.getByRole('button', { name: 'Next' }).click(); // business portfolio
  await pause(2200);
  await page.getByRole('button', { name: 'Next' }).click(); // WABA
  await pause(2200);
  await page.getByRole('button', { name: 'Next' }).click(); // phone number
  await pause(2600); // linger on permissions screen
  await page.getByRole('button', { name: 'Finish & connect' }).click();
  await pause(2000); // success screen + auto close (1.4s)

  // Connected card visible
  await page.waitForSelector('text=● Connected', { timeout: 15000 });
  await pause(2000);
  await page.getByRole('button', { name: 'Continue →' }).click();
  await pause(1800);

  // ---- 5. Onboarding step 3: first rule ----
  await page.getByRole('button', { name: /Email/ }).first().click();
  await pause(1500);
  await page.getByRole('button', { name: 'Create rule →' }).click();
  await pause(2200);

  // ---- 6. Done screen → dashboard ----
  await page.getByRole('button', { name: 'Go to dashboard →' }).click();
  await page.waitForURL('**/app', { timeout: 15000 });
  await pause(2000);

  // Behind the scenes (invisible): complete workspace settings + seed demo data
  await page.evaluate(async () => {
    const token = window.localStorage.getItem('wa-session-token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    await fetch('http://localhost:3000/app/workspace', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        businessLabel: 'Acme Realty',
        sourcePhoneNumber: '919876543210',
        phoneNumberId: 'demo_919876543210',
        forwardToNumber: '919000011122',
        extraRecipients: [],
        keywordFilters: '',
        forwardingEnabled: true,
        webhookRelayUrl: '',
        emailForwardTo: '',
      }),
    });
    await fetch('http://localhost:3000/app/demo/seed', { method: 'POST', headers });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await pause(3000); // dashboard with stats + live feed

  // ---- 7. Inbox ----
  await page.getByRole('link', { name: 'Inbox' }).click();
  await page.waitForSelector('text=Rahul Verma', { timeout: 15000 });
  await pause(2500);

  // Reply in an open session
  await type(page.getByPlaceholder('Type a reply…'), 'Site visit confirmed for Sunday 11 AM. See you there!');
  await pause(700);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  // The send round-trip retries the Cloud API before falling back in dev —
  // wait for the reply bubble to actually appear in the thread.
  await page.waitForSelector('text=Site visit confirmed for Sunday 11 AM', { timeout: 30000 });
  await pause(2200);

  // Open the expired conversation → template flow
  await page.getByRole('button', { name: /Amit Shah/ }).click();
  await pause(2200);
  await page.getByRole('button', { name: 'Choose template' }).click();
  await pause(2200);
  await page.getByRole('button', { name: /follow_up_v2/ }).click();
  await pause(2500);

  // ---- 8. Forwarding rules ----
  await page.getByRole('link', { name: 'Forwarding rules' }).click();
  await pause(2800);

  // ---- 9. Numbers ----
  await page.getByRole('link', { name: 'Numbers' }).click();
  await pause(2800);

  // ---- 10. Message logs ----
  await page.getByRole('link', { name: 'Message logs' }).click();
  await pause(2800);

  // ---- 11. Settings ----
  await page.getByRole('link', { name: 'Settings' }).click();
  await pause(2500);
  await page.mouse.wheel(0, 600);
  await pause(1800);
  await page.mouse.wheel(0, -600);
  await pause(1200);

  // ---- 12. Close on dashboard ----
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await pause(3000);

  const video = page.video();
  await context.close();
  const videoPath = await video.path();
  await browser.close();

  const finalPath = path.join(OUT_DIR, 'sendro-meta-demo.webm');
  fs.copyFileSync(videoPath, finalPath);
  fs.unlinkSync(videoPath);
  console.log(`DONE ${finalPath}`);
  console.log(`account email used: ${EMAIL}`);
})().catch(async (err) => {
  console.error('RECORDING FAILED:', err.message);
  if (failPage) {
    try {
      await failPage.screenshot({ path: path.join(OUT_DIR, 'fail.png') });
      console.error('failure screenshot: output/fail.png');
    } catch { /* page may be closed */ }
  }
  process.exit(1);
});
