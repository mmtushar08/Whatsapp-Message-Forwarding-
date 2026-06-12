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
import { applySchema } from '../db/database';

const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  mockedAxios.get.mockReset();
  testDb = new BetterSqlite3(':memory:');
  applySchema(testDb);
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

describe('POST /api/save-credentials', () => {
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

  it('creates a connected workspace and never echoes the raw token', async () => {
    const token = await signupAndGetToken('connect@example.com');

    const res = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({
        access_token: 'EAAB-secret-meta-token-value',
        phone_number_id: 'pnid_777',
        waba_id: 'waba_888',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.workspace.phoneNumberId).toBe('pnid_777');
    expect(res.body.workspace.wabaId).toBe('waba_888');
    expect(res.body.workspace.status).toBe('connected');
    // Only a short preview of the token may leave the server
    expect(JSON.stringify(res.body)).not.toContain('EAAB-secret-meta-token-value');
    expect(res.body.workspace.accessTokenPreview).toBe('EAAB-sec');

    // Token must be stored encrypted, not in plaintext
    const row = testDb
      .prepare('SELECT access_token_encrypted FROM workspaces WHERE phone_number_id = ?')
      .get('pnid_777') as { access_token_encrypted: string };
    expect(row.access_token_encrypted).not.toContain('EAAB-secret-meta-token-value');
  });

  it('updates the existing workspace on reconnect instead of duplicating', async () => {
    const token = await signupAndGetToken('reconnect@example.com');

    const first = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'token-one', phone_number_id: 'pnid_1', waba_id: 'waba_1' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'token-two', phone_number_id: 'pnid_2', waba_id: 'waba_2' });
    expect(second.status).toBe(200);
    expect(second.body.workspace.phoneNumberId).toBe('pnid_2');

    const count = testDb.prepare('SELECT COUNT(*) AS n FROM workspaces').get() as { n: number };
    expect(count.n).toBe(1);
  });

  it('is visible via /auth/me after connecting', async () => {
    const token = await signupAndGetToken('session@example.com');

    await request(app)
      .post('/api/save-credentials')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'tok-me', phone_number_id: 'pnid_me', waba_id: 'waba_me' });

    const me = await request(app).get('/auth/me').set('authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.workspace.phoneNumberId).toBe('pnid_me');
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

    mockedAxios.get
      .mockResolvedValueOnce({
        data: { data: [{ id: 'waba_1', name: 'Acme WABA' }] },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            { id: 'pn_1', display_phone_number: '+91 98765 43210', verified_name: 'Acme Support' },
          ],
        },
      });

    const res = await request(app)
      .post('/api/fetch-waba-info')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'valid-graph-token' });

    expect(res.status).toBe(200);
    expect(res.body.phones).toEqual([
      {
        wabaId: 'waba_1',
        wabaName: 'Acme WABA',
        phoneNumberId: 'pn_1',
        displayPhoneNumber: '+91 98765 43210',
        verifiedName: 'Acme Support',
      },
    ]);
  });

  it('returns 404 when the token has no WABAs', async () => {
    const token = await signupAndGetToken('waba-none@example.com');

    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } });

    const res = await request(app)
      .post('/api/fetch-waba-info')
      .set('authorization', `Bearer ${token}`)
      .send({ access_token: 'token-without-wabas' });

    expect(res.status).toBe(404);
  });
});
