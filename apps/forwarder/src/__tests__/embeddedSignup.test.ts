import BetterSqlite3 from 'better-sqlite3';
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
import {
  FakeMetaAccount,
  fakeMetaAccount,
  GraphCalls,
  installMetaGraphMock,
} from './helpers/metaGraphMock';

const mockedAxios = axios as jest.Mocked<typeof axios>;
let account: FakeMetaAccount;
let calls: GraphCalls;

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.post.mockReset();
  config.metaAppId = 'test-app-id';
  config.metaAppSecret = 'test-app-secret';
  testDb = new BetterSqlite3(':memory:');
  applySchema(testDb);
  account = fakeMetaAccount();
  calls = installMetaGraphMock(mockedAxios, [account]);
});

afterEach(() => {
  testDb.close();
});

async function signupAndGetToken(email: string): Promise<string> {
  const res = await request(app).post('/auth/signup').send({
    name: 'Embedded User',
    email,
    password: 'password123',
  });
  expect(res.status).toBe(201);
  return res.body.sessionToken as string;
}

describe('POST /api/complete-embedded-signup', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).post('/api/complete-embedded-signup').send({
      code: account.code,
      phone_number_id: account.phoneNumberId,
      waba_id: account.wabaId,
    });
    expect(res.status).toBe(401);
  });

  it('exchanges the code, subscribes webhooks and stores a connected workspace', async () => {
    const token = await signupAndGetToken('es@example.com');

    const res = await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${token}`)
      .send({
        code: account.code,
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
      });

    expect(res.status).toBe(200);
    const workspace = res.body.workspace;
    expect(workspace.status).toBe('connected');
    expect(workspace.connectionMethod).toBe('embedded_signup');
    expect(workspace.sourcePhoneNumber).toBe('919876543210');
    expect(workspace.businessLabel).toBe('Acme Support');
    expect(workspace.forwardTemplateName).toBe('forward_alert');
    expect(workspace.setupWarnings).toEqual([]);
    expect(calls.posts).toContain(`${account.wabaId}/subscribed_apps`);
    expect(calls.posts).toContain(`${account.wabaId}/message_templates`);
    // Already on the Cloud API — no re-registration (it would reset the PIN).
    expect(calls.posts).not.toContain(`${account.phoneNumberId}/register`);
    expect(JSON.stringify(res.body)).not.toContain(account.token);
  });

  it('registers numbers that are not on the Cloud API yet and keeps the PIN', async () => {
    account.platformType = 'NOT_APPLICABLE';
    const token = await signupAndGetToken('register@example.com');

    const res = await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${token}`)
      .send({
        code: account.code,
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
      });

    expect(res.status).toBe(200);
    expect(calls.posts).toContain(`${account.phoneNumberId}/register`);
    expect(res.body.workspace.twoStepPin).toMatch(/^\d{6}$/);
  });

  it('rejects an invalid code', async () => {
    const token = await signupAndGetToken('badcode@example.com');

    const res = await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${token}`)
      .send({ code: 'forged', phone_number_id: account.phoneNumberId, waba_id: account.wabaId });

    expect(res.status).toBe(400);
    expect(testDb.prepare('SELECT COUNT(*) AS n FROM workspaces').get()).toEqual({ n: 0 });
  });

  it('rejects a phone number outside the granted WABA', async () => {
    const token = await signupAndGetToken('wrongphone@example.com');

    const res = await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${token}`)
      .send({ code: account.code, phone_number_id: 'someone_elses_pn', waba_id: account.wabaId });

    expect(res.status).toBe(403);
  });

  it('returns 503 when the server has no Meta app credentials', async () => {
    config.metaAppSecret = '';
    const token = await signupAndGetToken('noconfig@example.com');

    const res = await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${token}`)
      .send({
        code: account.code,
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
      });

    expect(res.status).toBe(503);
  });

  it('refuses a number already connected to another account', async () => {
    const first = await signupAndGetToken('first@example.com');
    await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${first}`)
      .send({ code: account.code, phone_number_id: account.phoneNumberId, waba_id: account.wabaId })
      .expect(200);

    const second = await signupAndGetToken('second@example.com');
    const res = await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${second}`)
      .send({
        code: account.code,
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
      });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/save-credentials (manual token import)', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).post('/api/save-credentials').send({
      access_token: 'tok',
      phone_number_id: 'pnid',
      waba_id: 'waba',
    });
    expect(res.status).toBe(401);
  });

  it('rejects requests with missing fields', async () => {
    const token = await signupAndGetToken('missing@example.com');

    const res = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'tok' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/);
  });

  it('rejects a token that cannot access the number', async () => {
    const token = await signupAndGetToken('forged@example.com');

    const res = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({
        access_token: 'not-a-real-token',
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
      });

    expect(res.status).toBe(400);
    expect(testDb.prepare('SELECT COUNT(*) AS n FROM workspaces').get()).toEqual({ n: 0 });
  });

  it('stores a verified connection and never echoes the raw token', async () => {
    const token = await signupAndGetToken('connect@example.com');

    const res = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({
        access_token: account.token,
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.workspace.phoneNumberId).toBe(account.phoneNumberId);
    expect(res.body.workspace.wabaId).toBe(account.wabaId);
    expect(res.body.workspace.connectionMethod).toBe('manual');
    // The token belongs to this platform's app, so webhooks already reach us.
    expect(res.body.workspace.status).toBe('connected');
    // Only a short preview of the token may leave the server
    expect(JSON.stringify(res.body)).not.toContain(account.token);
    expect(res.body.workspace.accessTokenPreview).toBe(account.token.slice(0, 8));

    // Token must be stored encrypted, not in plaintext
    const row = testDb
      .prepare('SELECT access_token_encrypted FROM workspaces WHERE phone_number_id = ?')
      .get(account.phoneNumberId) as { access_token_encrypted: string };
    expect(row.access_token_encrypted).not.toContain(account.token);
  });

  it('asks for webhook setup when the token belongs to another Meta app', async () => {
    account.appId = 'customers-own-app';
    const token = await signupAndGetToken('ownapp@example.com');

    const res = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({
        access_token: account.token,
        phone_number_id: account.phoneNumberId,
        waba_id: account.wabaId,
        app_secret: 'their-app-secret',
      });

    expect(res.status).toBe(200);
    expect(res.body.workspace.status).toBe('needs_webhook_setup');
    expect(res.body.workspace.appSecretConfigured).toBe(true);
  });

  it('updates the existing workspace on reconnect and keeps forwarding rules', async () => {
    const second = fakeMetaAccount({
      token: 'EAAB-second',
      phoneNumberId: 'pn_2',
      wabaId: 'waba_2',
      displayPhoneNumber: '+1 555 000 2222',
    });
    installMetaGraphMock(mockedAxios, [account, second]);
    const token = await signupAndGetToken('reconnect@example.com');

    await request(app)
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
        businessLabel: 'My Shop',
        sourcePhoneNumber: '919876543210',
        phoneNumberId: account.phoneNumberId,
        forwardToNumber: '919000011122',
        keywordFilters: 'urgent',
        forwardingEnabled: true,
      })
      .expect(200);

    const res = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: second.token, phone_number_id: 'pn_2', waba_id: 'waba_2' });

    expect(res.status).toBe(200);
    expect(res.body.workspace.phoneNumberId).toBe('pn_2');
    expect(res.body.workspace.sourcePhoneNumber).toBe('15550002222');
    expect(res.body.workspace.businessLabel).toBe('My Shop');
    expect(res.body.workspace.forwardToNumber).toBe('919000011122');
    expect(res.body.workspace.keywordFilters).toEqual(['urgent']);

    const count = testDb.prepare('SELECT COUNT(*) AS n FROM workspaces').get() as { n: number };
    expect(count.n).toBe(1);
  });

  it('is visible via /auth/me after connecting', async () => {
    const token = await signupAndGetToken('session@example.com');

    await request(app).post('/api/save-credentials').set('authorization', `Bearer ${token}`).send({
      access_token: account.token,
      phone_number_id: account.phoneNumberId,
      waba_id: account.wabaId,
    });

    const me = await request(app).get('/auth/me').set('authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.workspace.phoneNumberId).toBe(account.phoneNumberId);
    expect(me.body.workspace.status).toBe('connected');
  });
});

describe('POST /api/fetch-waba-info', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).post('/api/fetch-waba-info').send({ access_token: 'tok' });
    expect(res.status).toBe(401);
  });

  it('rejects an empty access token', async () => {
    const token = await signupAndGetToken('waba-empty@example.com');

    const res = await request(app)
      .post('/api/fetch-waba-info')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/access_token/);
  });

  it('returns flattened phone options from the Graph API', async () => {
    const token = await signupAndGetToken('waba-found@example.com');

    const res = await request(app)
      .post('/api/fetch-waba-info')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: account.token });

    expect(res.status).toBe(200);
    expect(res.body.phones).toEqual([
      {
        wabaId: account.wabaId,
        wabaName: 'Acme Support WABA',
        phoneNumberId: account.phoneNumberId,
        displayPhoneNumber: '+91 98765 43210',
        verifiedName: 'Acme Support',
      },
    ]);
  });

  it('returns 400 with Meta’s reason for an invalid token', async () => {
    const token = await signupAndGetToken('waba-bad@example.com');

    const res = await request(app)
      .post('/api/fetch-waba-info')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'expired-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid OAuth access token/);
  });
});

describe('POST /auth/meta-login', () => {
  const body = (): Record<string, string> => ({
    code: account.code,
    phone_number_id: account.phoneNumberId,
    waba_id: account.wabaId,
  });

  it('creates an account with a connected workspace on first login', async () => {
    const res = await request(app).post('/auth/meta-login').send(body());

    expect(res.status).toBe(201);
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.name).toBe('Acme Support');
    expect(res.body.workspace.status).toBe('connected');
    expect(res.body.sessionToken).toEqual(expect.any(String));
  });

  it('logs the owner of the verified number back in', async () => {
    const first = await request(app).post('/auth/meta-login').send(body());
    const again = await request(app).post('/auth/meta-login').send(body());

    expect(again.status).toBe(200);
    expect(again.body.isNewUser).toBe(false);
    expect(again.body.user.id).toBe(first.body.user.id);
  });

  it('logs into the email account that connected the number', async () => {
    const token = await signupAndGetToken('owner@example.com');
    await request(app)
      .post('/api/complete-embedded-signup')
      .set('authorization', `Bearer ${token}`)
      .send(body())
      .expect(200);

    const res = await request(app).post('/auth/meta-login').send(body());
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('owner@example.com');
  });

  it('cannot take over an account with a raw token and a known phone number ID', async () => {
    await request(app).post('/auth/meta-login').send(body()).expect(201);

    // The old API trusted a client-supplied access_token + phone_number_id.
    const res = await request(app).post('/auth/meta-login').send({
      access_token: 'attacker-token',
      phone_number_id: account.phoneNumberId,
      waba_id: account.wabaId,
    });

    expect(res.status).toBe(400);
    expect(res.body.sessionToken).toBeUndefined();
  });

  it('rejects a forged code', async () => {
    const res = await request(app)
      .post('/auth/meta-login')
      .send({ ...body(), code: 'forged-code' });

    expect(res.status).toBe(400);
    expect(res.body.sessionToken).toBeUndefined();
  });
});
