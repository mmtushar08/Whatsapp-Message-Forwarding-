import BetterSqlite3 from 'better-sqlite3';
import request from 'supertest';

let testDb: BetterSqlite3.Database;

jest.mock('../db/database', () => {
  const actual = jest.requireActual('../db/database');
  return {
    ...actual,
    getDatabase: () => testDb,
    initDatabase: jest.fn(),
  };
});

import app from '../index';
import { applySchema } from '../db/database';

beforeEach(() => {
  testDb = new BetterSqlite3(':memory:');
  applySchema(testDb);
});

afterEach(() => {
  testDb.close();
});

async function createConnectedUser(email: string): Promise<string> {
  const signup = await request(app).post('/auth/signup').send({
    name: 'Demo User',
    email,
    password: 'password123',
  });
  const token = signup.body.sessionToken as string;

  await request(app)
    .post('/api/save-credentials')
    .set('authorization', `Bearer ${token}`)
    .send({ access_token: 'demo-token', phone_number_id: 'pnid_demo', waba_id: 'waba_demo' });

  return token;
}

describe('POST /app/demo/seed', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).post('/app/demo/seed').send();
    expect(res.status).toBe(401);
  });

  it('returns 404 when the user has no workspace yet', async () => {
    const signup = await request(app).post('/auth/signup').send({
      name: 'No Workspace',
      email: 'noworkspace@example.com',
      password: 'password123',
    });
    const token = signup.body.sessionToken as string;

    const res = await request(app)
      .post('/app/demo/seed')
      .set('authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.onboardingRequired).toBe(true);
  });

  it('seeds messages visible through the workspace logs and stats APIs', async () => {
    const token = await createConnectedUser('seeder@example.com');

    const seedRes = await request(app)
      .post('/app/demo/seed')
      .set('authorization', `Bearer ${token}`)
      .send();

    expect(seedRes.status).toBe(201);
    expect(seedRes.body.seeded).toBeGreaterThan(0);

    const messages = await request(app)
      .get('/app/messages')
      .set('authorization', `Bearer ${token}`);
    expect(messages.status).toBe(200);
    expect(messages.body.data.length).toBe(seedRes.body.seeded);

    const stats = await request(app)
      .get('/app/messages/stats')
      .set('authorization', `Bearer ${token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.total).toBe(seedRes.body.seeded);
    expect(stats.body.failed).toBeGreaterThan(0); // seed includes a failed sample
  });

  it('is disabled in production', async () => {
    const token = await createConnectedUser('prod@example.com');

    const previous = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      const res = await request(app)
        .post('/app/demo/seed')
        .set('authorization', `Bearer ${token}`)
        .send();
      expect(res.status).toBe(404);
    } finally {
      process.env['NODE_ENV'] = previous;
    }
  });
});
