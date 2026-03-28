import BetterSqlite3 from 'better-sqlite3';
import request from 'supertest';
import axios from 'axios';

let testDb: BetterSqlite3.Database;

jest.mock('../db/database', () => ({
  getDatabase: () => testDb,
  initDatabase: jest.fn(),
}));
jest.mock('axios');

import app from '../index';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    status TEXT NOT NULL,
    error TEXT,
    forwarded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    business_label TEXT NOT NULL,
    source_phone_number TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    app_secret_encrypted TEXT,
    access_token_preview TEXT NOT NULL,
    forward_to_number TEXT NOT NULL,
    keyword_filters TEXT NOT NULL,
    forwarding_enabled INTEGER NOT NULL DEFAULT 1,
    webhook_verify_token TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

beforeEach(() => {
  process.env['APP_ENCRYPTION_KEY'] = 'test-encryption-key';
  process.env['WHATSAPP_ACCESS_TOKEN'] = 'global-test-token';
  process.env['WHATSAPP_PHONE_NUMBER_ID'] = 'global-phone-id';
  mockedAxios.post.mockReset();
  testDb = new BetterSqlite3(':memory:');
  testDb.exec(SCHEMA);
});

afterEach(() => {
  testDb.close();
});

describe('auth and workspace flow', () => {
  it('signs up a user and returns a session token', async () => {
    const res = await request(app).post('/auth/signup').send({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.sessionToken).toBeDefined();
  });

  it('creates and fetches a workspace with a valid session', async () => {
    const signup = await request(app).post('/auth/signup').send({
      name: 'Test User',
      email: 'owner@example.com',
      password: 'password123',
    });

    const token = signup.body.sessionToken as string;

    const saveRes = await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${token}`)
      .send({
        businessLabel: 'Acme Inbox',
        sourcePhoneNumber: '15551234567',
        phoneNumberId: 'pnid_123',
        accessToken: 'meta-token-123456',
        forwardToNumber: '15559876543',
        keywordFilters: 'urgent,vip',
        forwardingEnabled: true,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.workspace.businessLabel).toBe('Acme Inbox');
    expect(saveRes.body.workspace.keywordFilters).toEqual(['urgent', 'vip']);

    const meRes = await request(app)
      .get('/auth/me')
      .set('authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.workspace.forwardToNumber).toBe('15559876543');

    const workspaceRes = await request(app)
      .get('/app/workspace')
      .set('authorization', `Bearer ${token}`);

    expect(workspaceRes.status).toBe(200);
    expect(workspaceRes.body.workspace.phoneNumberId).toBe('pnid_123');
  });

  it('returns workspace-scoped message stats and logs', async () => {
    const signup = await request(app).post('/auth/signup').send({
      name: 'Stats User',
      email: 'stats@example.com',
      password: 'password123',
    });

    const token = signup.body.sessionToken as string;

    const saveRes = await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${token}`)
      .send({
        businessLabel: 'Stats Inbox',
        sourcePhoneNumber: '15551234567',
        phoneNumberId: 'pnid_stats',
        accessToken: 'meta-token-stats',
        forwardToNumber: '15559876543',
        keywordFilters: 'urgent',
        forwardingEnabled: true,
      });

    const workspaceId = saveRes.body.workspace.id as string;

    testDb
      .prepare(
        `INSERT INTO message_logs (workspace_id, from_number, to_number, message, type, status, error, forwarded_at)
         VALUES (?, ?, ?, ?, 'text', ?, ?, ?)`,
      )
      .run(
        workspaceId,
        '15551234567',
        '15559876543',
        'Forwarded sample',
        'success',
        null,
        new Date().toISOString(),
      );

    const statsRes = await request(app)
      .get('/app/messages/stats')
      .set('authorization', `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.total).toBe(1);
    expect(statsRes.body.success).toBe(1);

    const messagesRes = await request(app)
      .get('/app/messages')
      .set('authorization', `Bearer ${token}`);

    expect(messagesRes.status).toBe(200);
    expect(messagesRes.body.data).toHaveLength(1);
    expect(messagesRes.body.data[0].workspace_id).toBe(workspaceId);
  });

  it('routes webhook forwarding through the matched workspace credentials', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        messaging_product: 'whatsapp',
        contacts: [{ input: '15559876543', wa_id: '15559876543' }],
        messages: [{ id: 'wamid.workspace' }],
      },
    });

    const signup = await request(app).post('/auth/signup').send({
      name: 'Webhook User',
      email: 'webhook@example.com',
      password: 'password123',
    });

    const token = signup.body.sessionToken as string;

    const saveRes = await request(app)
      .patch('/app/workspace')
      .set('authorization', `Bearer ${token}`)
      .send({
        businessLabel: 'Webhook Inbox',
        sourcePhoneNumber: '15551234567',
        phoneNumberId: 'workspace_phone_id',
        accessToken: 'workspace_access_token',
        forwardToNumber: '15559876543',
        keywordFilters: '',
        forwardingEnabled: true,
      });

    const workspaceId = saveRes.body.workspace.id as string;

    const res = await request(app).post('/webhook').send({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry_1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: 'workspace_phone_id',
                },
                contacts: [{ profile: { name: 'Alice' }, wa_id: '15550001111' }],
                messages: [
                  {
                    from: '15550001111',
                    id: 'wamid.incoming',
                    timestamp: '1710400000',
                    type: 'text',
                    text: { body: 'Need urgent help' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(res.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][0]).toContain('/workspace_phone_id/messages');
    expect(mockedAxios.post.mock.calls[0][2]?.headers?.Authorization).toBe(
      'Bearer workspace_access_token',
    );

    const logRow = testDb
      .prepare('SELECT workspace_id, to_number, status FROM message_logs WHERE workspace_id = ?')
      .get(workspaceId) as { workspace_id: string; to_number: string; status: string };

    expect(logRow.workspace_id).toBe(workspaceId);
    expect(logRow.to_number).toBe('15559876543');
    expect(logRow.status).toBe('success');
  });
});
