// Real WhatsApp test against Meta's live Cloud API — no mocks.
//
//   WA_TOKEN=...            temporary access token (Meta app → WhatsApp → API Setup)
//   WA_PHONE_NUMBER_ID=...  "Phone number ID" of the sender (the test number is fine)
//   WA_WABA_ID=...          "WhatsApp Business Account ID"
//   TEST_TO=91XXXXXXXXXX    your WhatsApp number, country code first, no +
//   node tools/e2e/real-meta-test.js
//
// It checks the token, sends Meta's hello_world template to TEST_TO, then runs
// the real product path: start the backend, connect the number with the token,
// save a rule forwarding to TEST_TO, deliver a signed inbound webhook as if a
// customer had messaged the business number, and report what Meta did.
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const TMP = path.join(__dirname, '.tmp', 'real');
const PORT = 3100;
const API = `http://localhost:${PORT}`;
const GRAPH_BASE = (process.env.META_GRAPH_API_BASE_URL || 'https://graph.facebook.com').replace(/\/$/, '');
const GRAPH = `${GRAPH_BASE}/${process.env.META_GRAPH_API_VERSION || 'v25.0'}`;
const WEBHOOK_SECRET = crypto.randomBytes(16).toString('hex');

const { WA_TOKEN, WA_PHONE_NUMBER_ID, WA_WABA_ID } = process.env;
const TEST_TO = (process.env.TEST_TO || '').replace(/\D/g, '');

const HINTS = {
  131030: 'Your number is not on the test number\'s allowed list. In API Setup → "To", add it and enter the code WhatsApp sends you.',
  131047: 'WhatsApp only allows free-form messages within 24h of the recipient writing to the business. Send "hi" from your phone to the sender number, then run again.',
  132001: 'The forward_alert template is not approved yet (Meta reviews new templates). Wait a few minutes, or send "hi" to the sender number first.',
  190: 'The access token is invalid or expired. Temporary tokens last 24 hours — generate a new one in API Setup.',
  133010: 'The sender number is not registered for the Cloud API.',
};

function step(title) { console.log(`\n▸ ${title}`); }
function ok(message) { console.log(`  ✓ ${message}`); }
function fail(message, code) {
  console.log(`  ✗ ${message}`);
  const hint = HINTS[code] || Object.entries(HINTS).find(([c]) => String(message).includes(c))?.[1];
  if (hint) console.log(`    → ${hint}`);
  process.exitCode = 1;
}

async function graph(method, pathPart, body) {
  const res = await fetch(`${GRAPH}/${pathPart}`, {
    method,
    headers: { authorization: `Bearer ${WA_TOKEN}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    const error = new Error(`${e.message || `HTTP ${res.status}`}${e.error_data?.details ? ` — ${e.error_data.details}` : ''}`);
    error.code = e.code;
    throw error;
  }
  return json;
}

async function api(method, pathPart, body, token) {
  const res = await fetch(`${API}${pathPart}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  const missing = ['WA_TOKEN', 'WA_PHONE_NUMBER_ID', 'WA_WABA_ID', 'TEST_TO'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing ${missing.join(', ')}. See the comment at the top of this file.`);
    process.exit(2);
  }
  if (TEST_TO.length === 10) {
    console.error(`TEST_TO has 10 digits — add the country code (India: 91${TEST_TO}).`);
    process.exit(2);
  }

  step('Meta: read the sender number with the token');
  let sender;
  try {
    sender = await graph('GET', `${WA_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,platform_type,quality_rating`);
    ok(`${sender.display_phone_number} · "${sender.verified_name}" · ${sender.platform_type}${sender.quality_rating ? ` · quality ${sender.quality_rating}` : ''}`);
  } catch (error) {
    fail(`Could not read phone number ${WA_PHONE_NUMBER_ID}: ${error.message}`, error.code);
    return;
  }

  step(`Meta: send the hello_world template to +${TEST_TO}`);
  try {
    const sent = await graph('POST', `${WA_PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp', to: TEST_TO, type: 'template',
      template: { name: 'hello_world', language: { code: 'en_US' } },
    });
    ok(`accepted by Meta (${sent.messages?.[0]?.id}) — check WhatsApp on +${TEST_TO}`);
  } catch (error) {
    fail(`hello_world was refused: ${error.message}`, error.code);
    return;
  }

  step('Product: start the backend against the real Graph API');
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const server = spawn(process.execPath, ['dist/index.js'], {
    cwd: path.join(REPO, 'apps/forwarder'),
    env: {
      ...process.env,
      NODE_ENV: 'production', PORT: String(PORT), TRUST_PROXY: '0', DB_PATH: path.join(TMP, 'real.db'),
      WEBHOOK_VERIFY_TOKEN: crypto.randomBytes(8).toString('hex'),
      APP_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      WHATSAPP_APP_SECRET: WEBHOOK_SECRET, CORS_ORIGIN: 'http://localhost:5173',
      // The script reports every outcome itself; server logs would only add noise.
      PUBLIC_APP_URL: API, LOG_LEVEL: 'silent', MAX_RETRY_ATTEMPTS: '1',
    },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  try {
    for (let i = 0; i < 40; i++) {
      if (await fetch(`${API}/health`).then((r) => r.ok, () => false)) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    ok(`running on ${API}`);
    await productTest();
  } finally {
    server.kill();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
}

async function productTest() {
  const signup = await api('POST', '/auth/signup', {
    name: 'Real Test', email: `real-test-${Date.now()}@example.com`, password: crypto.randomBytes(12).toString('hex'),
  });
  const session = signup.body.sessionToken;

  step('Product: connect the number with the access token (verified with Meta)');
  const connect = await api('POST', '/api/save-credentials', {
    access_token: WA_TOKEN, phone_number_id: WA_PHONE_NUMBER_ID, waba_id: WA_WABA_ID, business_label: 'Real test',
  }, session);
  if (connect.status !== 200) {
    fail(`connect failed (${connect.status}): ${connect.body.error}`);
    return;
  }
  const ws = connect.body.workspace;
  ok(`connected +${ws.sourcePhoneNumber} · status ${ws.status} · template ${ws.forwardTemplateName || '(none)'}`);
  ws.setupWarnings.forEach((w) => console.log(`    ⚠ ${w}`));

  step(`Product: save a rule forwarding everything to +${TEST_TO}`);
  const rule = await api('PATCH', '/app/workspace', {
    businessLabel: 'Real test', sourcePhoneNumber: ws.sourcePhoneNumber, phoneNumberId: WA_PHONE_NUMBER_ID,
    forwardToNumber: TEST_TO, keywordFilters: '', forwardingEnabled: true,
  }, session);
  if (rule.status !== 200) {
    fail(`saving the rule failed (${rule.status}): ${rule.body.error}`);
    return;
  }
  ok('rule saved');

  step('Product: a customer messages the business number (signed webhook)');
  const text = `Sendro real test ${new Date().toLocaleTimeString()}: is the 2BHK on SG Highway still available?`;
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: WA_WABA_ID, changes: [{ field: 'messages', value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: ws.sourcePhoneNumber, phone_number_id: WA_PHONE_NUMBER_ID },
      contacts: [{ profile: { name: 'Test Customer' }, wa_id: '919999900000' }],
      messages: [{ from: '919999900000', id: `wamid.realtest.${Date.now()}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'text', text: { body: text } }],
    } }] }],
  });
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  const hook = await fetch(`${API}/webhook`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': `sha256=${signature}` }, body: payload,
  });
  ok(`webhook accepted (HTTP ${hook.status})`);

  step(`Product: forward to +${TEST_TO}`);
  for (let i = 0; i < 60; i++) {
    const logs = await api('GET', '/app/messages', null, session);
    const row = logs.body.data?.[0];
    if (row) {
      if (row.status === 'success') ok(`Meta accepted the forward — check WhatsApp on +${TEST_TO} for "${text}"`);
      else fail(`forward failed: ${row.error}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  fail('no delivery was logged within 30 seconds');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
