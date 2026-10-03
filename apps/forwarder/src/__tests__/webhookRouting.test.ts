import BetterSqlite3 from 'better-sqlite3';
import crypto from 'crypto';
import request from 'supertest';
import axios from 'axios';

let testDb: BetterSqlite3.Database;

jest.mock('../db/database', () => {
  const actual = jest.requireActual('../db/database');
  return {
    ...actual,
    getDatabase: () => testDb,
    initDatabase: jest.fn(),
  };
});
jest.mock('axios');

import app from '../index';
import config from '../config';
import { applySchema } from '../db/database';
import { assertSafeOutboundUrl, isPrivateAddress } from '../utils/urlSafety';
import {
  FakeMetaAccount,
  fakeMetaAccount,
  GraphCalls,
  graphError,
  installMetaGraphMock,
} from './helpers/metaGraphMock';

const mockedAxios = axios as jest.Mocked<typeof axios>;
let alpha: FakeMetaAccount;
let beta: FakeMetaAccount;
let calls: GraphCalls;

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.post.mockReset();
  config.metaAppId = 'test-app-id';
  config.metaAppSecret = 'test-app-secret';
  config.appSecret = '';
  testDb = new BetterSqlite3(':memory:');
  applySchema(testDb);
  alpha = fakeMetaAccount({ token: 'tok-alpha', phoneNumberId: 'pn_alpha', wabaId: 'waba_alpha' });
  beta = fakeMetaAccount({
    code: 'code-beta',
    token: 'tok-beta',
    phoneNumberId: 'pn_beta',
    wabaId: 'waba_beta',
    displayPhoneNumber: '+1 555 000 2222',
  });
  calls = installMetaGraphMock(mockedAxios, [alpha, beta]);
});

afterEach(() => {
  testDb.close();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 60));

async function connectedUser(
  email: string,
  account: FakeMetaAccount,
  settings: Record<string, unknown> = {},
): Promise<{ token: string; workspaceId: string }> {
  const signup = await request(app)
    .post('/auth/signup')
    .send({ name: 'Owner', email, password: 'password123' });
  const token = signup.body.sessionToken as string;
  const connect = await request(app)
    .post('/api/save-credentials')
    .set('authorization', `Bearer ${token}`)
    .send({
      access_token: account.token,
      phone_number_id: account.phoneNumberId,
      waba_id: account.wabaId,
    })
    .expect(200);
  await request(app)
    .patch('/app/workspace')
    .set('authorization', `Bearer ${token}`)
    .send({
      businessLabel: 'Shop',
      sourcePhoneNumber: connect.body.workspace.sourcePhoneNumber,
      phoneNumberId: account.phoneNumberId,
      forwardToNumber: '919000011122',
      forwardingEnabled: true,
      ...settings,
    })
    .expect(200);
  return { token, workspaceId: connect.body.workspace.id as string };
}

function change(phoneNumberId: string, messageId: string, text: string): object {
  return {
    field: 'messages',
    value: {
      messaging_product: 'whatsapp',
      metadata: { display_phone_number: '1555', phone_number_id: phoneNumberId },
      contacts: [{ profile: { name: 'Customer' }, wa_id: '917000000001' }],
      messages: [
        { from: '917000000001', id: messageId, timestamp: '1', type: 'text', text: { body: text } },
      ],
    },
  };
}

function payload(...changes: object[]): object {
  return {
    object: 'whatsapp_business_account',
    entry: changes.map((c, i) => ({ id: `entry_${i}`, changes: [c] })),
  };
}

function logs(workspaceId: string): Array<Record<string, string>> {
  return testDb
    .prepare('SELECT * FROM message_logs WHERE workspace_id = ? ORDER BY id')
    .all(workspaceId) as Array<Record<string, string>>;
}

describe('webhook routing', () => {
  it('routes each change in a batched webhook to its own workspace', async () => {
    const a = await connectedUser('a@example.com', alpha);
    const b = await connectedUser('b@example.com', beta);

    await request(app)
      .post('/webhook')
      .send(
        payload(
          change('pn_alpha', 'wamid.a', 'for alpha'),
          change('pn_beta', 'wamid.b', 'for beta'),
        ),
      )
      .expect(200);
    await settle();

    const byPhone = Object.fromEntries(
      calls.sentMessages.map((m) => [m.phoneNumberId, (m.body['text'] as { body: string }).body]),
    );
    expect(byPhone['pn_alpha']).toContain('for alpha');
    expect(byPhone['pn_beta']).toContain('for beta');
    expect(logs(a.workspaceId)).toHaveLength(1);
    expect(logs(b.workspaceId)).toHaveLength(1);
  });

  it('ignores messages for numbers no workspace owns', async () => {
    await connectedUser('a@example.com', alpha);

    await request(app)
      .post('/webhook')
      .send(payload(change('pn_unknown', 'wamid.x', 'hello')))
      .expect(200);
    await settle();

    expect(calls.sentMessages).toHaveLength(0);
    expect(testDb.prepare('SELECT COUNT(*) AS n FROM message_logs').get()).toEqual({ n: 0 });
  });

  it('forwards a redelivered message only once', async () => {
    const a = await connectedUser('a@example.com', alpha);
    const body = payload(change('pn_alpha', 'wamid.dup', 'hello'));

    await request(app).post('/webhook').send(body).expect(200);
    await request(app).post('/webhook').send(body).expect(200);
    await settle();

    expect(calls.sentMessages).toHaveLength(1);
    expect(logs(a.workspaceId)).toHaveLength(1);
  });

  it('falls back to the forward_alert template outside the 24h window', async () => {
    const a = await connectedUser('a@example.com', alpha, { forwardTemplateName: 'forward_alert' });
    installMetaGraphMock(mockedAxios, [alpha], (body) => {
      if (body['type'] === 'text') {
        throw graphError(400, 131047, 'Re-engagement message');
      }
    });

    await request(app)
      .post('/webhook')
      .send(payload(change('pn_alpha', 'wamid.late', 'Line one\nLine two')))
      .expect(200);
    await settle();

    const [log] = logs(a.workspaceId);
    expect(log.status).toBe('success');
    const sent = mockedAxios.post.mock.calls.map((call) => call[1] as Record<string, unknown>);
    const template = sent.find((b) => b?.['type'] === 'template') as {
      template: { name: string; components: Array<{ parameters: Array<{ text: string }> }> };
    };
    expect(template.template.name).toBe('forward_alert');
    expect(template.template.components[0].parameters.map((p) => p.text)).toEqual([
      '+917000000001',
      'Line one Line two',
    ]);
  });

  it('logs a clear failure instead of retrying when Meta rejects a send', async () => {
    const a = await connectedUser('a@example.com', alpha, { forwardTemplateName: '' });
    installMetaGraphMock(mockedAxios, [alpha], () => {
      throw graphError(400, 131047, 'Re-engagement message');
    });

    await request(app)
      .post('/webhook')
      .send(payload(change('pn_alpha', 'wamid.nofallback', 'hi')))
      .expect(200);
    await settle();

    const [log] = logs(a.workspaceId);
    expect(log.status).toBe('failed');
    expect(log.error).toMatch(/Re-engagement message/);
    // 4xx errors are permanent: exactly one attempt, no backoff retries.
    const messagePosts = mockedAxios.post.mock.calls.filter((c) =>
      String(c[0]).endsWith('/messages'),
    );
    expect(messagePosts).toHaveLength(1);
  });

  it('records email deliveries in the log, including failures', async () => {
    const signupEmail = 'mail@example.com';
    const a = await connectedUser(signupEmail, alpha);
    testDb.prepare("UPDATE users SET plan = 'starter' WHERE email = ?").run(signupEmail);
    const token = (
      await request(app).post('/auth/login').send({ email: signupEmail, password: 'password123' })
    ).body.sessionToken as string;
    await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${token}`)
      .send({
        businessLabel: 'Shop',
        sourcePhoneNumber: '919876543210',
        phoneNumberId: 'pn_alpha',
        forwardToNumber: '',
        emailForwardTo: 'owner@example.com',
        forwardingEnabled: true,
      })
      .expect(200);

    await request(app)
      .post('/webhook')
      .send(payload(change('pn_alpha', 'wamid.mail', 'hello')))
      .expect(200);
    await settle();

    const [log] = logs(a.workspaceId);
    expect(log.channel).toBe('email');
    expect(log.to_number).toBe('owner@example.com');
    // No SMTP in tests — the failure is visible rather than silently skipped.
    expect(log.status).toBe('failed');
    expect(log.error).toMatch(/SMTP/);
  });

  it('logs skipped messages once the free monthly cap is reached', async () => {
    const a = await connectedUser('a@example.com', alpha);
    const month = new Date().toISOString().slice(0, 7);
    testDb
      .prepare(
        'INSERT INTO usage_counters (workspace_id, year_month, message_count) VALUES (?, ?, ?)',
      )
      .run(a.workspaceId, month, 200);

    await request(app)
      .post('/webhook')
      .send(payload(change('pn_alpha', 'wamid.cap', 'hello')))
      .expect(200);
    await settle();

    expect(calls.sentMessages).toHaveLength(0);
    const [log] = logs(a.workspaceId);
    expect(log.status).toBe('failed');
    expect(log.error).toMatch(/Monthly limit of 200/);
  });
});

describe('connection status', () => {
  it('becomes connected when Meta verifies the workspace webhook', async () => {
    alpha.appId = 'customers-own-app';
    const a = await connectedUser('a@example.com', alpha);
    const me = await request(app).get('/app/workspace').set('authorization', `Bearer ${a.token}`);
    expect(me.body.workspace.status).toBe('needs_webhook_setup');

    await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': me.body.workspace.webhookVerifyToken,
        'hub.challenge': 'abc',
      })
      .expect(200, 'abc');

    const after = await request(app)
      .get('/app/workspace')
      .set('authorization', `Bearer ${a.token}`);
    expect(after.body.workspace.status).toBe('connected');
    expect(after.body.workspace.lastWebhookAt).not.toBe('');
  });

  it('keeps the connection status when settings are saved', async () => {
    const a = await connectedUser('a@example.com', alpha);
    const res = await request(app).get('/app/workspace').set('authorization', `Bearer ${a.token}`);
    expect(res.body.workspace.status).toBe('connected');
  });
});

describe('PATCH /app/workspace validation', () => {
  it('requires at least one destination while forwarding is on', async () => {
    const a = await connectedUser('a@example.com', alpha);
    const res = await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${a.token}`)
      .send({
        businessLabel: 'Shop',
        sourcePhoneNumber: '919876543210',
        phoneNumberId: 'pn_alpha',
        forwardToNumber: '',
        forwardingEnabled: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one destination/);
  });

  it('gates email forwarding behind a paid plan', async () => {
    const a = await connectedUser('a@example.com', alpha);
    const res = await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${a.token}`)
      .send({
        businessLabel: 'Shop',
        sourcePhoneNumber: '919876543210',
        phoneNumberId: 'pn_alpha',
        emailForwardTo: 'owner@example.com',
        forwardingEnabled: true,
      });
    expect(res.status).toBe(402);
    expect(res.body.requiredPlan).toBe('starter');
  });

  it('refuses to point a workspace at another account’s number', async () => {
    await connectedUser('a@example.com', alpha);
    const b = await connectedUser('b@example.com', beta);
    const res = await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${b.token}`)
      .send({
        businessLabel: 'Shop',
        sourcePhoneNumber: '15550002222',
        phoneNumberId: 'pn_alpha',
        forwardToNumber: '919000011122',
        forwardingEnabled: true,
      });
    expect(res.status).toBe(409);
  });
});

describe('webhook signature in production', () => {
  const originalEnv = process.env['NODE_ENV'];
  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
  });

  it('rejects unsigned webhooks when no secret is configured', async () => {
    process.env['NODE_ENV'] = 'production';
    const res = await request(app).post('/webhook').send(payload());
    expect(res.status).toBe(401);
  });

  it('accepts webhooks signed with the platform app secret', async () => {
    process.env['NODE_ENV'] = 'production';
    config.appSecret = 'test-app-secret';
    const body = JSON.stringify(payload());
    const signature = crypto.createHmac('sha256', 'test-app-secret').update(body).digest('hex');
    const res = await request(app)
      .post('/webhook')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', `sha256=${signature}`)
      .send(body);
    expect(res.status).toBe(200);
  });
});

describe('outbound URL safety', () => {
  const originalEnv = process.env['NODE_ENV'];
  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
  });

  it.each(['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '::1', '::ffff:10.0.0.1'])(
    'treats %s as private',
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );

  it.each(['8.8.8.8', '157.240.22.35'])('treats %s as public', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );

  it('blocks internal targets and plain http in production', async () => {
    process.env['NODE_ENV'] = 'production';
    await expect(assertSafeOutboundUrl('https://169.254.169.254/latest')).rejects.toThrow(/public/);
    await expect(assertSafeOutboundUrl('https://127.0.0.1:3000/x')).rejects.toThrow(/public/);
    await expect(assertSafeOutboundUrl('http://8.8.8.8/hook')).rejects.toThrow(/https/);
    await expect(assertSafeOutboundUrl('https://8.8.8.8/hook')).resolves.toBe(
      'https://8.8.8.8/hook',
    );
  });
});
