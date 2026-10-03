// End-to-end check of every user flow against the production build.
// Meta is faked at the network layer: the FB SDK and the facebook.com popup
// are routed by Playwright, the Graph API is mock-meta.js on :4010.
const { chromium } = require('playwright-core');
const crypto = require('crypto');
const path = require('path');
const REPO = path.resolve(__dirname, '../..');
const Database = require(path.join(REPO, 'node_modules/better-sqlite3'));

const APP = 'http://localhost:5173';
const API = 'http://localhost:3000';
const META = 'http://localhost:4010';
const TMP = path.join(__dirname, '.tmp');
const SHOTS = path.join(TMP, 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });

const results = [];
let page;
let currentStep = '';

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function step(name, fn) {
  currentStep = name;
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`  ✗ ${name}\n      ${error.message}`);
    if (page) await page.screenshot({ path: path.join(SHOTS, `FAIL-${name.replace(/\W+/g, '_')}.png`), fullPage: true }).catch(() => {});
    throw error;
  }
}

const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url, init) {
  const res = await fetch(url, init);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const sent = async () => (await json(`${META}/__sent`)).body;

async function waitForSends(count, timeout = 6000) {
  const end = Date.now() + timeout;
  let list = [];
  while (Date.now() < end) {
    list = await sent();
    if (list.length >= count) return list;
    await sleep(100);
  }
  throw new Error(`expected ${count} Graph sends, saw ${list.length}: ${JSON.stringify(list.map((s) => [s.type, s.to, s.result]))}`);
}

let messageSeq = 0;
function inbound(phoneId, from, text) {
  messageSeq += 1;
  return {
    field: 'messages',
    value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '1555', phone_number_id: phoneId },
      contacts: [{ profile: { name: 'Rahul Verma' }, wa_id: from }],
      messages: [{ from, id: `wamid.e2e.${messageSeq}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'text', text: { body: text } }],
    },
  };
}

async function postWebhook(changes, secret = 'test-app-secret', { sign = true } = {}) {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: changes.map((c, i) => ({ id: `e${i}`, changes: [c] })) });
  const headers = { 'content-type': 'application/json' };
  if (sign) headers['x-hub-signature-256'] = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  const res = await fetch(`${API}/webhook`, { method: 'POST', headers, body });
  return { res, body };
}

// ── fake Meta in the browser ──
const FAKE_SDK = `
window.FB = {
  init: function () {},
  login: function (cb) {
    var account = window.__esAccount || 'alpha';
    var ids = {
      alpha: { phone: 'pn_alpha', waba: 'waba_alpha' },
      beta: { phone: 'pn_beta', waba: 'waba_beta' },
    }[account];
    var outcome = window.__esOutcome || 'finish';
    var origin = outcome === 'evil' ? 'https://evilfacebook.com' : 'https://www.facebook.com';
    var event = outcome === 'cancel' ? 'CANCEL' : 'FINISH';
    var phone = outcome === 'evil' ? 'pn_beta' : ids.phone;
    var waba = outcome === 'evil' ? 'waba_beta' : ids.waba;
    var frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = origin + '/es-popup?event=' + event + '&phone=' + phone + '&waba=' + waba;
    document.body.appendChild(frame);
    setTimeout(function () {
      if (outcome === 'cancel') cb({ authResponse: null, status: 'unknown' });
      else cb({ authResponse: { code: account + ':' + Math.random().toString(36).slice(2) } });
    }, 500);
  },
};
setTimeout(function () { if (window.fbAsyncInit) window.fbAsyncInit(); }, 0);
`;
const POPUP_HTML = `<script>
var q = new URLSearchParams(location.search);
var ev = q.get('event');
parent.postMessage(JSON.stringify({ type: 'WA_EMBEDDED_SIGNUP', event: ev,
  data: ev === 'CANCEL' ? { current_step: 'PHONE_NUMBER_SETUP' } : { phone_number_id: q.get('phone'), waba_id: q.get('waba') } }), '*');
</script>`;

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await context.route('https://connect.facebook.net/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: FAKE_SDK }));
  await context.route(/https:\/\/(www\.facebook|evilfacebook)\.com\/.*/, (route) =>
    route.fulfill({ contentType: 'text/html', body: POPUP_HTML }));
  const p = await context.newPage();
  p.on('pageerror', (e) => console.log(`      [pageerror] ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log(`      [console.error] ${m.text()}`); });
  return { context, page: p };
}

/**
 * CHROME_PATH wins; otherwise Playwright's own browser, then any Chromium a
 * Playwright install left in PLAYWRIGHT_BROWSERS_PATH / ~/.cache/ms-playwright.
 */
async function launchChromium() {
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    return await chromium.launch();
  } catch (error) {
    const fs = require('fs');
    const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(require('os').homedir(), '.cache/ms-playwright')].filter(Boolean);
    for (const root of roots) {
      const builds = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse() : [];
      for (const build of builds) {
        const exe = path.join(root, build, 'chrome-linux', 'chrome');
        if (fs.existsSync(exe)) return chromium.launch({ executablePath: exe });
      }
    }
    throw new Error(`No Chromium found. Set CHROME_PATH, or run "npx playwright install chromium".\n${error.message.split('\n')[0]}`);
  }
}

async function logout() {
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL(`${APP}/`);
}

(async () => {
  const browser = await launchChromium();
  let ctx;
  ({ context: ctx, page } = await newPage(browser));
  const db = new Database(path.join(TMP, 'e2e.db'));

  try {
    console.log('\nPublic pages');
    await step('landing, pricing, privacy and terms render', async () => {
      for (const [url, text] of [['/', 'Start free'], ['/pricing', '200 messages'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]) {
        await page.goto(APP + url);
        await page.getByText(text).first().waitFor({ timeout: 5000 });
      }
      await page.goto(APP + '/');
      await shot('01-landing');
    });

    console.log('\nEmail signup → onboarding with real Meta connect');
    await step('email signup lands on onboarding', async () => {
      await page.goto(APP + '/signup');
      await page.getByText('Free for 200 forwarded messages a month').waitFor();
      await page.getByPlaceholder('Tushar Makwana').fill('Alice Shah');
      await page.getByPlaceholder('you@company.com').fill('alice@example.com');
      await page.getByPlaceholder('8+ characters').fill('correct-horse-1');
      await page.getByRole('button', { name: 'Create account →' }).click();
      await page.waitForURL(`${APP}/onboarding`);
    });

    await step('business name keeps focus while typing (remount bug fixed)', async () => {
      const input = page.getByLabel('Business name');
      await input.click();
      await page.keyboard.type('Acme Realty Ahmedabad', { delay: 15 });
      assert((await input.inputValue()) === 'Acme Realty Ahmedabad', `got "${await input.inputValue()}"`);
      await shot('02-onboarding-business');
      await page.getByRole('button', { name: 'Continue →' }).click();
    });

    await step('Continue is disabled until a number is connected', async () => {
      await page.getByText('Connect your WhatsApp Business number').waitFor();
      assert(await page.getByRole('button', { name: 'Continue →' }).isDisabled(), 'continue enabled before connect');
    });

    await step('cancelling the Meta popup returns quietly', async () => {
      await page.evaluate(() => { window.__esOutcome = 'cancel'; });
      await page.getByRole('button', { name: /Continue with Facebook/ }).click();
      await page.getByRole('button', { name: /Continue with Facebook/ }).waitFor({ timeout: 5000 });
      assert(!(await page.getByRole('alert').count()), 'error shown after cancel');
    });

    await step('Meta Embedded Signup connects, subscribes, registers and creates the template', async () => {
      await page.evaluate(() => { window.__esOutcome = 'finish'; window.__esAccount = 'alpha'; });
      await page.getByRole('button', { name: /Continue with Facebook/ }).click();
      await page.getByText('● Connected').waitFor({ timeout: 8000 });
      await page.getByText('+919876543210').waitFor();
      await page.getByText('Acme Realty Ahmedabad').waitFor();
      const state = (await json(`${META}/__state`)).body;
      assert(state.subscribed.includes('waba_alpha'), 'WABA not subscribed to webhooks');
      assert(/^\d{6}$/.test(state.registered.pn_alpha || ''), 'number not registered');
      assert(state.templates.waba_alpha.some((t) => t.name === 'forward_alert'), 'forward_alert template not created');
      await shot('03-onboarding-connected');
      await page.getByRole('button', { name: 'Continue →' }).click();
    });

    await step('email and webhook destinations are locked on the free plan', async () => {
      await page.getByText('Create your first forwarding rule').waitFor();
      assert(await page.getByRole('button', { name: /Email/ }).isDisabled(), 'email not locked');
      assert(await page.getByRole('button', { name: /Webhook/ }).isDisabled(), 'webhook not locked');
    });

    await step('first rule is actually saved', async () => {
      await page.getByLabel(/Forward to/).fill('919000011122');
      await shot('04-onboarding-rule');
      await page.getByRole('button', { name: 'Save rule →' }).click();
      await page.getByText("You're live, Acme Realty Ahmedabad!").waitFor();
      await shot('05-onboarding-live');
      const row = db.prepare("SELECT business_label, forward_to_number, forwarding_enabled, status FROM workspaces WHERE phone_number_id='pn_alpha'").get();
      assert(row.forward_to_number === '919000011122' && row.forwarding_enabled === 1, JSON.stringify(row));
      assert(row.business_label === 'Acme Realty Ahmedabad' && row.status === 'connected', JSON.stringify(row));
      await page.getByRole('button', { name: 'Go to dashboard →' }).click();
      await page.waitForURL(`${APP}/app`);
    });

    console.log('\nInbound messages → forwarding');
    await step('forward outside the 24h window falls back to the approved template', async () => {
      const { res } = await postWebhook([inbound('pn_alpha', '917000000001', 'Is the 2BHK on SG Highway still available?')]);
      assert(res.status === 200, `webhook ${res.status}`);
      await fetch(`${META}/__open-window`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneId: 'pn_alpha', to: '917000000001' }) });
      const list = await waitForSends(2);
      assert(list[0].type === 'text' && list[0].result === 'rejected_131047', 'first attempt should be free-form text rejected by Meta');
      assert(list[1].type === 'template' && list[1].body.template.name === 'forward_alert' && list[1].result === 'sent', JSON.stringify(list[1]));
      assert(list[1].body.template.components[0].parameters[1].text === 'Is the 2BHK on SG Highway still available?', 'message not in template params');
    });

    await step('dashboard shows the delivered message', async () => {
      await page.getByRole('button', { name: 'Refresh' }).click();
      await page.getByText('Is the 2BHK on SG Highway still available?').waitFor();
      await page.getByText('Delivered').first().waitFor();
      await shot('06-dashboard');
    });

    await step('within the 24h window the forward is plain text', async () => {
      await fetch(`${META}/__open-window`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneId: 'pn_alpha', to: '919000011122' }) });
      await postWebhook([inbound('pn_alpha', '917000000001', 'Also what is the carpet area?')]);
      const list = await waitForSends(3);
      assert(list[2].type === 'text' && list[2].result === 'sent', JSON.stringify(list[2]));
      assert(list[2].body.text.body === 'Forwarded from 917000000001:\n\nAlso what is the carpet area?', list[2].body.text.body);
    });

    await step('a redelivered webhook is forwarded only once', async () => {
      const change = inbound('pn_alpha', '917000000001', 'Duplicate check');
      await postWebhook([change]);
      await postWebhook([change]);
      await sleep(600);
      const list = await sent();
      assert(list.filter((s) => s.body.text?.body?.includes('Duplicate check')).length === 1, 'duplicate forwarded twice');
    });

    await step('unsigned and badly signed webhooks are rejected in production', async () => {
      const before = (await sent()).length;
      const unsigned = await postWebhook([inbound('pn_alpha', '917000000001', 'spoof')], 'x', { sign: false });
      const forged = await postWebhook([inbound('pn_alpha', '917000000001', 'spoof')], 'wrong-secret');
      assert(unsigned.res.status === 401 && forged.res.status === 401, `${unsigned.res.status} ${forged.res.status}`);
      await sleep(300);
      assert((await sent()).length === before, 'spoofed message was forwarded');
    });

    await step('message logs list every delivery', async () => {
      await page.getByRole('link', { name: /Message logs/ }).click();
      await page.getByText('Also what is the carpet area?').waitFor();
      await page.getByText('📱 +919000011122').first().waitFor();
      await shot('07-message-logs');
    });

    console.log('\nInbox');
    await step('reply inside the 24h session', async () => {
      await page.getByRole('link', { name: /Inbox/ }).click();
      await page.getByText('Rahul Verma').first().waitFor();
      await page.getByPlaceholder('Type a reply…').fill('Yes! Carpet area is 1,180 sq ft.');
      await page.getByRole('button', { name: 'Send' }).click();
      await page.getByText('Yes! Carpet area is 1,180 sq ft.').first().waitFor();
      const last = (await sent()).at(-1);
      assert(last.to === '917000000001' && last.body.text.body === 'Yes! Carpet area is 1,180 sq ft.' && last.result === 'sent', JSON.stringify(last));
      await shot('08-inbox-reply');
    });

    await step('closed session sends a real approved template with values', async () => {
      // Age the customer's messages past the 24h window.
      db.prepare("UPDATE conversation_messages SET created_at = '2026-01-01T00:00:00.000Z' WHERE contact_number = '917000000001'").run();
      await page.reload();
      await page.getByText('24-hour session window closed').waitFor();
      await page.getByRole('button', { name: 'Choose template' }).click();
      await page.getByText('Hi {{1}}, following up about {{2}}.').click();
      await page.getByPlaceholder('Value for {{1}}').fill('Rahul');
      await page.getByPlaceholder('Value for {{2}}').fill('the 2BHK on SG Highway');
      await shot('09-inbox-template');
      await page.getByRole('button', { name: 'Send template' }).click();
      await page.getByText('Hi Rahul, following up about the 2BHK on SG Highway.').first().waitFor();
      const last = (await sent()).at(-1);
      assert(last.type === 'template' && last.body.template.name === 'follow_up' && last.result === 'sent', JSON.stringify(last));
    });

    console.log('\nRules, settings, numbers, billing');
    await step('pausing forwarding stops forwards but the inbox still records', async () => {
      await page.getByRole('link', { name: /Forwarding rules/ }).click();
      await page.getByText('Forwarding enabled').waitFor();
      await page.getByRole('button', { name: 'Toggle forwarding' }).click();
      await page.getByText('Forwarding paused').waitFor();
      await shot('10-rules-paused');
      const before = (await sent()).length;
      await postWebhook([inbound('pn_alpha', '917000000002', 'Sent while paused')]);
      await sleep(600);
      assert((await sent()).length === before, 'forwarded while paused');
      const row = db.prepare("SELECT COUNT(*) AS n FROM conversation_messages WHERE message = 'Sent while paused'").get();
      assert(row.n === 1, 'inbox did not record message while paused');
      await page.getByRole('button', { name: 'Toggle forwarding' }).click();
      await page.getByText('Forwarding enabled').waitFor();
    });

    await step('keyword filter from Settings is applied, status survives the save', async () => {
      await page.getByRole('link', { name: /Settings/ }).click();
      await page.getByPlaceholder('urgent, invoice, vip').fill('price');
      assert(await page.getByPlaceholder('forward_alert').inputValue() === 'forward_alert', 'template name not prefilled');
      assert(await page.getByPlaceholder('https://your-app.com/incoming').isDisabled(), 'webhook relay not plan-gated');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText('Workspace settings saved successfully.').waitFor();
      await shot('11-settings');
      const before = (await sent()).length;
      await postWebhook([inbound('pn_alpha', '917000000003', 'hello there')]);
      await postWebhook([inbound('pn_alpha', '917000000003', 'what is the PRICE?')]);
      await sleep(800);
      const fresh = (await sent()).slice(before);
      assert(fresh.length === 1 && fresh[0].body.text.body.includes('what is the PRICE?') && fresh[0].result === 'sent',
        `expected only the keyword match to be forwarded: ${JSON.stringify(fresh.map((x) => x.body))}`);
      const status = db.prepare("SELECT status FROM workspaces WHERE phone_number_id='pn_alpha'").get().status;
      assert(status === 'connected', `status reset to ${status}`);
    });

    await step('numbers page shows health and the registration PIN', async () => {
      await page.getByRole('link', { name: /Numbers/ }).click();
      await page.getByText('● Connected').waitFor();
      await page.getByText('Connected with Meta').waitFor();
      await page.getByRole('button', { name: 'Show' }).click();
      const pin = (await json(`${META}/__state`)).body.registered.pn_alpha;
      await page.getByText(pin, { exact: true }).waitFor();
      await shot('12-numbers');
    });

    await step('billing shows the plan and a clear error when Razorpay is not configured', async () => {
      await page.getByRole('link', { name: /Plan & billing/ }).click();
      const used = db.prepare("SELECT message_count FROM usage_counters u JOIN workspaces w ON w.id = u.workspace_id WHERE w.phone_number_id = 'pn_alpha'").get().message_count;
      assert(used === 4, `usage counter ${used}, expected 4 forwarded messages`);
      await page.getByText(`${used} / 200 messages`).waitFor();
      await page.getByText('Billing is not yet configured on this server').waitFor();
      assert(await page.getByRole('button', { name: 'Subscribe to Starter' }).isDisabled(), 'subscribe enabled without Razorpay');
      await sleep(400); // let the sidebar highlight transition finish
      await shot('13-billing');
      const active = await page.locator('nav a').evaluateAll((links) =>
        links.filter((a) => getComputedStyle(a).backgroundColor === 'rgb(31, 171, 94)').map((a) => a.textContent));
      assert(active.length === 1 && active[0].includes('Plan & billing'), `highlighted nav items: ${JSON.stringify(active)}`);
      const api = await json(`${API}/billing/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json',
        authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('wa-session-token'))}` }, body: JSON.stringify({ plan: 'starter' }) });
      assert(api.status === 503 && /not configured/.test(api.body.error), JSON.stringify(api));
    });

    await step('logout and email login restore the workspace', async () => {
      await logout();
      await page.goto(APP + '/login');
      await page.getByPlaceholder('you@company.com').fill('alice@example.com');
      await page.getByPlaceholder('••••••••').fill('correct-horse-1');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await page.waitForURL(`${APP}/app`);
      await page.getByText('Acme Realty Ahmedabad').first().waitFor();
      await logout();
    });

    console.log('\nMeta login');
    await step('“Continue with WhatsApp Business” creates a new account', async () => {
      await page.goto(APP + '/login');
      await page.getByRole('button', { name: 'Continue with WhatsApp Business' }).click();
      await page.evaluate(() => { window.__esOutcome = 'finish'; window.__esAccount = 'beta'; });
      await shot('14-meta-login-modal');
      await page.getByRole('button', { name: 'Continue with Facebook' }).click();
      await page.waitForURL(`${APP}/onboarding`, { timeout: 8000 });
      const row = db.prepare("SELECT w.business_label, w.status, u.email FROM workspaces w JOIN users u ON u.id = w.user_id WHERE w.phone_number_id='pn_beta'").get();
      assert(row && row.business_label === 'Beta Bakery' && row.status === 'connected', JSON.stringify(row));
    });

    await step('returning Meta user goes straight to the dashboard', async () => {
      await page.goto(APP + '/app');
      await logout();
      await page.goto(APP + '/login');
      await page.getByRole('button', { name: 'Continue with WhatsApp Business' }).click();
      await page.evaluate(() => { window.__esAccount = 'beta'; });
      await page.getByRole('button', { name: 'Continue with Facebook' }).click();
      await page.waitForURL(`${APP}/app`, { timeout: 8000 });
      await page.getByText('Beta Bakery').first().waitFor();
      await logout();
    });

    await step('Meta login with Alice’s number signs into Alice’s email account', async () => {
      await page.goto(APP + '/login');
      await page.getByRole('button', { name: 'Continue with WhatsApp Business' }).click();
      await page.evaluate(() => { window.__esAccount = 'alpha'; });
      await page.getByRole('button', { name: 'Continue with Facebook' }).click();
      await page.waitForURL(`${APP}/app`, { timeout: 8000 });
      await page.getByText('Acme Realty Ahmedabad').first().waitFor();
      await page.getByText('Alice Shah').waitFor();
      await logout();
    });

    await step('postMessage from a look-alike origin is ignored', async () => {
      await page.goto(APP + '/login');
      await page.getByRole('button', { name: 'Continue with WhatsApp Business' }).click();
      await page.evaluate(() => { window.__esAccount = 'alpha'; window.__esOutcome = 'evil'; });
      await page.getByRole('button', { name: 'Continue with Facebook' }).click();
      await page.getByText('Meta did not return the selected phone number').waitFor({ timeout: 15000 });
      assert(page.url() === `${APP}/login`, 'logged in from a spoofed message');
      await page.getByRole('button', { name: 'Close' }).click();
    });

    console.log('\nSecurity and multi-tenancy');
    await step('old takeover request (raw token + known phone ID) is refused', async () => {
      const r = await json(`${API}/auth/meta-login`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access_token: 'attacker', phone_number_id: 'pn_alpha', waba_id: 'waba_alpha' }) });
      assert(r.status === 400 && !r.body.sessionToken, JSON.stringify(r));
      // A code Meta issued works once; replaying an intercepted code fails.
      const issued = { code: 'alpha:issued-by-meta', phone_number_id: 'pn_alpha', waba_id: 'waba_alpha' };
      const first = await json(`${API}/auth/meta-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(issued) });
      const replay = await json(`${API}/auth/meta-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(issued) });
      assert(first.status === 200 && replay.status === 400 && !replay.body.sessionToken, `single-use code: first ${first.status}, replay ${replay.status}`);
    });

    await step('another account cannot claim a connected number', async () => {
      await page.goto(APP + '/signup');
      await page.getByPlaceholder('Tushar Makwana').fill('Bob');
      await page.getByPlaceholder('you@company.com').fill('bob@example.com');
      await page.getByPlaceholder('8+ characters').fill('correct-horse-2');
      await page.getByRole('button', { name: 'Create account →' }).click();
      await page.waitForURL(`${APP}/onboarding`);
      await page.getByRole('button', { name: 'Continue →' }).click();
      await page.evaluate(() => { window.__esAccount = 'alpha'; window.__esOutcome = 'finish'; });
      await page.getByRole('button', { name: /Continue with Facebook/ }).click();
      await page.getByText('already connected to another account').waitFor({ timeout: 8000 });
      await shot('15-number-taken');
    });

    await step('a batched webhook is routed per number to the right tenant', async () => {
      await fetch(`${META}/__open-window`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneId: 'pn_beta', to: '15550003333' }) });
      db.prepare("UPDATE workspaces SET forward_to_number = '15550003333' WHERE phone_number_id = 'pn_beta'").run();
      const before = (await sent()).length;
      await postWebhook([inbound('pn_alpha', '917000000009', 'price for alpha'), inbound('pn_beta', '15550004444', 'cake for beta')]);
      await sleep(900);
      const fresh = (await sent()).slice(before);
      const alpha = fresh.filter((s) => s.phoneId === 'pn_alpha');
      const beta = fresh.filter((s) => s.phoneId === 'pn_beta');
      assert(alpha.some((s) => JSON.stringify(s.body).includes('price for alpha')), 'alpha message not sent from alpha');
      assert(beta.some((s) => s.body.text?.body?.includes('cake for beta') && s.to === '15550003333'), 'beta message not sent from beta');
      assert(!alpha.some((s) => JSON.stringify(s.body).includes('beta')) && !beta.some((s) => JSON.stringify(s.body).includes('alpha')), 'cross-tenant leak');
    });

    await step('messages for an unknown number are dropped', async () => {
      const before = (await sent()).length;
      await postWebhook([inbound('pn_unknown', '917000000010', 'who owns me?')]);
      await sleep(500);
      assert((await sent()).length === before, 'unknown number was forwarded');
    });

    console.log('\nManual token import (customer’s own Meta app)');
    await step('token import finds the number and asks for webhook setup', async () => {
      await page.getByRole('tab', { name: 'Use an access token' }).click();
      await page.getByLabel('Permanent access token').fill('tok-gamma');
      await page.getByRole('button', { name: 'Find my numbers' }).click();
      await page.getByText('+44 7700 900123').waitFor();
      await page.getByLabel(/App secret/).fill('gamma-secret');
      await page.getByRole('button', { name: 'Connect this number' }).click();
      await page.getByText('● Connected').waitFor();
      await page.getByRole('button', { name: 'Continue →' }).click();
      await page.getByLabel(/Forward to/).fill('447700900999');
      await page.getByRole('button', { name: 'Save rule →' }).click();
      await page.getByText('Rule saved — one step left').waitFor();
      await page.getByText('One more step:').waitFor();
      await shot('16-manual-webhook-setup');
    });

    await step('Meta verifying the customer’s webhook flips the status to connected', async () => {
      const token = db.prepare("SELECT webhook_verify_token FROM workspaces WHERE phone_number_id='pn_gamma'").get().webhook_verify_token;
      const res = await fetch(`${API}/webhook?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=42`);
      assert(res.status === 200 && (await res.text()) === '42', 'verification failed');
      // The finish step polls and turns green without a reload.
      await page.getByText("You're live, Gamma Garage!").waitFor({ timeout: 12000 });
      await shot('17-manual-live');
      await page.getByRole('button', { name: 'Go to dashboard →' }).click();
      await page.getByRole('link', { name: /Numbers/ }).click();
      await page.getByText('● Connected').waitFor();
    });

    await step('the customer’s app secret verifies their webhooks', async () => {
      await fetch(`${META}/__open-window`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneId: 'pn_gamma', to: '447700900999' }) });
      const wrong = await postWebhook([inbound('pn_gamma', '447700900111', 'garage booking')], 'test-app-secret');
      assert(wrong.res.status === 401, `platform secret accepted for own-app workspace: ${wrong.res.status}`);
      const before = (await sent()).length;
      const right = await postWebhook([inbound('pn_gamma', '447700900111', 'garage booking')], 'gamma-secret');
      assert(right.res.status === 200, `customer secret rejected: ${right.res.status}`);
      const list = await waitForSends(before + 1);
      assert(list.at(-1).phoneId === 'pn_gamma' && list.at(-1).result === 'sent', JSON.stringify(list.at(-1)));
    });

    await step('settings rejects an internal webhook relay URL in production', async () => {
      db.prepare("UPDATE users SET plan = 'pro' WHERE email = 'bob@example.com'").run();
      await page.reload();
      await page.getByRole('link', { name: /Settings/ }).click();
      await page.getByPlaceholder('https://your-app.com/incoming').fill('https://169.254.169.254/latest/meta-data');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.getByText('must point to a public internet address').waitFor();
    });

    await step('mobile: menu collapses, pages fit the screen', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const [link, text] of [['Dashboard', 'Live forwarding feed'], ['Inbox', 'Read and reply from here'], ['Settings', 'Forwarding destinations']]) {
        await page.getByRole('button', { name: 'Menu' }).click();
        await page.getByRole('link', { name: new RegExp(link) }).click();
        await page.getByText(text).first().waitFor();
        await sleep(250);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert(overflow <= 0, `${link} overflows horizontally by ${overflow}px`);
        await shot(`18-mobile-${link.toLowerCase()}`);
      }
    });
  } catch {
    // failure already reported
  } finally {
    await browser.close();
    db.close();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} steps passed${failed.length ? ` — FAILED at: ${currentStep}` : ''}`);
    require('fs').writeFileSync(path.join(TMP, 'results.json'), JSON.stringify(results, null, 2));
    process.exit(failed.length ? 1 : 0);
  }
})();
