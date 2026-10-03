// Stateful stand-in for the Graph API endpoints the forwarder uses.
// Enforces the rules that matter: single-use codes, token scoping,
// 24h customer-service window (131047) and template approval.
const express = require('express');

const accounts = {
  alpha: {
    token: 'tok-alpha', appId: 'test-app-id', wabaId: 'waba_alpha', phoneId: 'pn_alpha',
    display: '+91 98765 43210', name: 'Acme Realty', platform: 'NOT_APPLICABLE',
  },
  beta: {
    token: 'tok-beta', appId: 'test-app-id', wabaId: 'waba_beta', phoneId: 'pn_beta',
    display: '+1 555 010 2222', name: 'Beta Bakery', platform: 'CLOUD_API',
  },
  // A customer running their own Meta app (manual token import)
  gamma: {
    token: 'tok-gamma', appId: 'customers-own-app', wabaId: 'waba_gamma', phoneId: 'pn_gamma',
    display: '+44 7700 900123', name: 'Gamma Garage', platform: 'CLOUD_API',
  },
};

let state;
function reset() {
  state = {
    usedCodes: new Set(),
    subscribed: new Set(),
    registered: {},
    templates: Object.fromEntries(Object.values(accounts).map((a) => [a.wabaId, [
      { name: 'hello_world', language: 'en', status: 'APPROVED', category: 'UTILITY',
        components: [{ type: 'BODY', text: 'Hello from us!' }] },
      { name: 'follow_up', language: 'en', status: 'APPROVED', category: 'UTILITY',
        components: [{ type: 'BODY', text: 'Hi {{1}}, following up about {{2}}.' }] },
    ]])),
    openWindows: new Set(), // `${phoneId}:${to}`
    sent: [],
  };
}
reset();

const err = (res, status, code, message) =>
  res.status(status).json({ error: { message, type: 'OAuthException', code, fbtrace_id: 'x' } });

function auth(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const account = Object.values(accounts).find((a) => a.token === token);
  if (!account) { err(res, 401, 190, 'Invalid OAuth access token.'); return null; }
  return account;
}

const app = express();
app.use(express.json());
app.use((req, _res, next) => { console.log(`[meta] ${req.method} ${req.path}`); next(); });

// ── control plane for the test ──
app.get('/__sent', (_req, res) => res.json(state.sent));
app.get('/__state', (_req, res) => res.json({
  subscribed: [...state.subscribed], registered: state.registered, templates: state.templates,
}));
app.post('/__reset', (_req, res) => { reset(); res.json({ ok: true }); });
app.post('/__open-window', (req, res) => {
  state.openWindows.add(`${req.body.phoneId}:${req.body.to}`); res.json({ ok: true });
});

const V = '/:version(v\\d+\\.\\d+)';

app.get(`${V}/oauth/access_token`, (req, res) => {
  const { client_id, client_secret, code } = req.query;
  if (client_id !== 'test-app-id' || client_secret !== 'test-app-secret') return err(res, 400, 101, 'Error validating client secret.');
  const key = String(code || '').split(':')[0];
  if (!accounts[key] || state.usedCodes.has(code)) return err(res, 400, 100, 'This authorization code has been used.');
  state.usedCodes.add(code);
  res.json({ access_token: accounts[key].token, token_type: 'bearer' });
});

app.get(`${V}/debug_token`, (req, res) => {
  if ((req.headers.authorization || '').includes('|')) {
    // App access token: only tokens issued to this app can be inspected.
    if (req.headers.authorization !== 'Bearer test-app-id|test-app-secret') return err(res, 400, 101, 'Invalid app token');
    const inspected = Object.values(accounts).find((x) => x.token === req.query.input_token);
    if (!inspected || inspected.appId !== 'test-app-id') return err(res, 400, 100, 'The App_id in the input_token did not match the Viewing App');
    return res.json({ data: { app_id: inspected.appId, is_valid: true, granular_scopes: [
      { scope: 'whatsapp_business_management', target_ids: [inspected.wabaId] }] } });
  }
  const a = auth(req, res); if (!a) return;
  res.json({ data: { app_id: a.appId, is_valid: true, granular_scopes: [
    { scope: 'whatsapp_business_management', target_ids: [a.wabaId] },
    { scope: 'whatsapp_business_messaging', target_ids: [a.wabaId] },
  ] } });
});

app.get(`${V}/:id/phone_numbers`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id !== a.wabaId) return err(res, 403, 200, 'Permission denied.');
  res.json({ data: [{ id: a.phoneId, display_phone_number: a.display, verified_name: a.name }] });
});

app.get(`${V}/:id/message_templates`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id !== a.wabaId) return err(res, 403, 200, 'Permission denied.');
  res.json({ data: state.templates[a.wabaId] });
});

app.post(`${V}/:id/message_templates`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id !== a.wabaId) return err(res, 403, 200, 'Permission denied.');
  const list = state.templates[a.wabaId];
  if (list.some((t) => t.name === req.body.name)) {
    return res.status(400).json({ error: { message: 'Message template already exists', code: 100, error_subcode: 2388023 } });
  }
  // Real Meta reviews templates; the mock approves instantly.
  list.push({ name: req.body.name, language: req.body.language, status: 'APPROVED', category: req.body.category, components: req.body.components });
  res.json({ id: `tpl_${list.length}`, status: 'APPROVED', category: req.body.category });
});

app.post(`${V}/:id/subscribed_apps`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id !== a.wabaId) return err(res, 403, 200, 'Permission denied.');
  state.subscribed.add(a.wabaId); res.json({ success: true });
});

app.post(`${V}/:id/register`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id !== a.phoneId) return err(res, 403, 200, 'Permission denied.');
  if (!/^\d{6}$/.test(req.body.pin || '')) return err(res, 400, 100, 'Invalid pin');
  state.registered[a.phoneId] = req.body.pin; res.json({ success: true });
});

app.post(`${V}/:id/messages`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id !== a.phoneId) return err(res, 403, 200, 'Permission denied.');
  const body = req.body;
  const record = { phoneId: a.phoneId, to: body.to, type: body.type, body, at: new Date().toISOString() };
  if (body.type === 'text' && !state.openWindows.has(`${a.phoneId}:${body.to}`)) {
    state.sent.push({ ...record, result: 'rejected_131047' });
    return res.status(400).json({ error: {
      message: '(#131047) Re-engagement message', code: 131047,
      error_data: { details: 'Message failed to send because more than 24 hours have passed since the customer last replied to this number.' },
    } });
  }
  if (body.type === 'template') {
    const t = state.templates[a.wabaId].find((x) => x.name === body.template?.name && x.language === body.template?.language?.code);
    if (!t || t.status !== 'APPROVED') {
      state.sent.push({ ...record, result: 'rejected_132001' });
      return err(res, 404, 132001, 'Template name does not exist in the translation');
    }
  }
  state.sent.push({ ...record, result: 'sent' });
  res.json({ messaging_product: 'whatsapp', contacts: [{ input: body.to, wa_id: body.to }], messages: [{ id: `wamid.${state.sent.length}` }] });
});

app.get(`${V}/:id`, (req, res) => {
  const a = auth(req, res); if (!a) return;
  if (req.params.id === a.wabaId) return res.json({ id: a.wabaId, name: `${a.name} WABA` });
  if (req.params.id === a.phoneId) {
    return res.json({
      id: a.phoneId, display_phone_number: a.display, verified_name: a.name,
      platform_type: state.registered[a.phoneId] ? 'CLOUD_API' : a.platform,
    });
  }
  err(res, 403, 200, 'Permission denied.');
});

app.use((req, res) => err(res, 404, 803, `Unknown path ${req.path}`));

app.listen(4010, () => console.log('mock Meta Graph API on :4010'));
