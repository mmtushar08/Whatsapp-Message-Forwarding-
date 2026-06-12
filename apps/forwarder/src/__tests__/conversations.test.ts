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
import { computeSessionWindow } from '../db/conversationStore';

const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  mockedAxios.post.mockReset();
  testDb = new BetterSqlite3(':memory:');
  applySchema(testDb);
});

afterEach(() => {
  testDb.close();
});

async function createConnectedUser(email: string): Promise<string> {
  const signup = await request(app).post('/auth/signup').send({
    name: 'Inbox User',
    email,
    password: 'password123',
  });
  const token = signup.body.sessionToken as string;
  await request(app)
    .post('/api/save-credentials')
    .set('authorization', `Bearer ${token}`)
    .send({ access_token: 'inbox-token', phone_number_id: 'pnid_inbox', waba_id: 'waba_inbox' });
  return token;
}

async function seed(token: string): Promise<void> {
  const res = await request(app)
    .post('/app/demo/seed')
    .set('authorization', `Bearer ${token}`)
    .send();
  expect(res.status).toBe(201);
  expect(res.body.conversations).toBe(3);
}

describe('computeSessionWindow', () => {
  it('is closed when there is no inbound message', () => {
    expect(computeSessionWindow(null).open).toBe(false);
  });

  it('is open within 24 hours of the last inbound message', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = computeSessionWindow(oneHourAgo);
    expect(result.open).toBe(true);
    expect(result.expiresAt).toBeTruthy();
  });

  it('is closed after 24 hours', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(computeSessionWindow(twoDaysAgo).open).toBe(false);
  });
});

describe('GET /app/conversations', () => {
  it('requires a session', async () => {
    const res = await request(app).get('/app/conversations');
    expect(res.status).toBe(401);
  });

  it('lists seeded conversations with correct session states', async () => {
    const token = await createConnectedUser('inbox-list@example.com');
    await seed(token);

    const res = await request(app)
      .get('/app/conversations')
      .set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(3);

    const byContact = Object.fromEntries(
      res.body.conversations.map((c: { contactNumber: string }) => [c.contactNumber, c]),
    );
    expect(byContact['919987654401'].contactName).toBe('Rahul Verma');
    expect(byContact['919987654401'].sessionOpen).toBe(true);   // inbound ~5h ago
    expect(byContact['919771230882'].sessionOpen).toBe(true);   // inbound ~17h ago
    expect(byContact['919654321774'].sessionOpen).toBe(false);  // inbound 3 days ago
  });
});

describe('GET /app/conversations/:contact/messages', () => {
  it('returns the thread oldest-first with session info', async () => {
    const token = await createConnectedUser('inbox-thread@example.com');
    await seed(token);

    const res = await request(app)
      .get('/app/conversations/919987654401/messages')
      .set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.messages[0].direction).toBe('in');
    expect(res.body.messages[2].direction).toBe('out');
    expect(res.body.session.open).toBe(true);
  });
});

describe('POST /app/conversations/:contact/reply', () => {
  it('rejects empty messages', async () => {
    const token = await createConnectedUser('inbox-empty@example.com');
    await seed(token);

    const res = await request(app)
      .post('/app/conversations/919987654401/reply')
      .set('authorization', `Bearer ${token}`)
      .send({ message: '   ' });

    expect(res.status).toBe(400);
  });

  it('stores the reply when the session is open (Cloud API success)', async () => {
    const token = await createConnectedUser('inbox-reply@example.com');
    await seed(token);

    mockedAxios.post.mockResolvedValue({
      data: { messaging_product: 'whatsapp', messages: [{ id: 'wamid.test' }] },
    });

    const res = await request(app)
      .post('/app/conversations/919987654401/reply')
      .set('authorization', `Bearer ${token}`)
      .send({ message: 'Site visit confirmed for Sunday 11am.' });

    expect(res.status).toBe(201);
    expect(res.body.message.direction).toBe('out');
    expect(res.body.message.status).toBe('sent');

    const thread = await request(app)
      .get('/app/conversations/919987654401/messages')
      .set('authorization', `Bearer ${token}`);
    expect(thread.body.messages).toHaveLength(4);
  });

  it('stores the reply as simulated when the Cloud API fails outside production', async () => {
    const token = await createConnectedUser('inbox-sim@example.com');
    await seed(token);

    mockedAxios.post.mockRejectedValue(new Error('invalid token'));

    const res = await request(app)
      .post('/app/conversations/919987654401/reply')
      .set('authorization', `Bearer ${token}`)
      .send({ message: 'This send will fail upstream.' });

    expect(res.status).toBe(201);
    expect(res.body.message.status).toBe('simulated');
  });

  it('returns 409 when the 24-hour session window is closed', async () => {
    const token = await createConnectedUser('inbox-closed@example.com');
    await seed(token);

    const res = await request(app)
      .post('/app/conversations/919654321774/reply')
      .set('authorization', `Bearer ${token}`)
      .send({ message: 'Hello again!' });

    expect(res.status).toBe(409);
    expect(res.body.sessionClosed).toBe(true);
  });
});

describe('POST /app/conversations/:contact/template', () => {
  it('sends an approved template even when the session is closed', async () => {
    const token = await createConnectedUser('inbox-tpl@example.com');
    await seed(token);

    mockedAxios.post.mockResolvedValue({
      data: { messaging_product: 'whatsapp', messages: [{ id: 'wamid.tpl' }] },
    });

    const res = await request(app)
      .post('/app/conversations/919654321774/template')
      .set('authorization', `Bearer ${token}`)
      .send({ templateName: 'follow_up_v2' });

    expect(res.status).toBe(201);
    expect(res.body.message.template_name).toBe('follow_up_v2');
  });

  it('rejects unapproved templates', async () => {
    const token = await createConnectedUser('inbox-tpl-bad@example.com');
    await seed(token);

    const res = await request(app)
      .post('/app/conversations/919654321774/template')
      .set('authorization', `Bearer ${token}`)
      .send({ templateName: 'payment_reminder' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not approved/);
  });

  it('rejects unknown templates', async () => {
    const token = await createConnectedUser('inbox-tpl-unknown@example.com');
    await seed(token);

    const res = await request(app)
      .post('/app/conversations/919654321774/template')
      .set('authorization', `Bearer ${token}`)
      .send({ templateName: 'does_not_exist' });

    expect(res.status).toBe(400);
  });
});

describe('GET /app/templates', () => {
  it('returns the template catalog', async () => {
    const token = await createConnectedUser('inbox-catalog@example.com');

    const res = await request(app)
      .get('/app/templates')
      .set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.templates).toHaveLength(3);
    expect(res.body.templates[0].name).toBe('follow_up_v2');
  });
});

describe('webhook → inbox integration', () => {
  it('records inbound webhook messages in the conversation thread', async () => {
    const token = await createConnectedUser('inbox-webhook@example.com');

    mockedAxios.post.mockResolvedValue({
      data: { messaging_product: 'whatsapp', messages: [{ id: 'wamid.fwd' }] },
    });

    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba_inbox',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15551234567', phone_number_id: 'pnid_inbox' },
                contacts: [{ profile: { name: 'Webhook Customer' }, wa_id: '917000000001' }],
                messages: [
                  {
                    from: '917000000001',
                    id: 'wamid.in',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Is the showroom open today?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const hook = await request(app).post('/webhook').send(payload);
    expect(hook.status).toBe(200);

    // receiveWebhook responds 200 then processes async — wait for it to settle.
    await new Promise((resolve) => setTimeout(resolve, 150));

    const res = await request(app)
      .get('/app/conversations')
      .set('authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    expect(res.body.conversations[0].contactNumber).toBe('917000000001');
    expect(res.body.conversations[0].contactName).toBe('Webhook Customer');
    expect(res.body.conversations[0].sessionOpen).toBe(true);
  });
});
