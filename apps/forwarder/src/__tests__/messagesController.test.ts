import BetterSqlite3 from 'better-sqlite3';
import request from 'supertest';

// Use an in-memory SQLite database for isolation
let testDb: BetterSqlite3.Database;

jest.mock('../db/database', () => ({
  getDatabase: () => testDb,
  initDatabase: jest.fn(),
}));

// Import app after mocking the database
import app from '../index';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    status TEXT NOT NULL,
    error TEXT,
    forwarded_at TEXT NOT NULL
  )
`;

beforeEach(() => {
  testDb = new BetterSqlite3(':memory:');
  testDb.exec(SCHEMA);
});

afterEach(() => {
  testDb.close();
});

function insertMessage(
  from = '15551234567',
  to = '15559876543',
  msg = 'Hello',
  status: 'success' | 'failed' = 'success',
  error: string | null = null,
): void {
  testDb
    .prepare(
      `INSERT INTO message_logs (from_number, to_number, message, type, status, error, forwarded_at)
       VALUES (?, ?, ?, 'text', ?, ?, ?)`,
    )
    .run(from, to, msg, status, error, new Date().toISOString());
}

describe('GET /messages', () => {
  it('returns 200 with empty data array and pagination when no records exist', async () => {
    const res = await request(app).get('/messages');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(0);
    expect(res.body.pagination.hasMore).toBe(false);
  });

  it('returns message records with pagination metadata', async () => {
    insertMessage('111', '222', 'Test message 1');
    insertMessage('111', '222', 'Test message 2');

    const res = await request(app).get('/messages');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.limit).toBe(50);
    expect(res.body.pagination.offset).toBe(0);
  });

  it('respects limit and offset query params', async () => {
    for (let i = 0; i < 5; i++) {
      insertMessage('111', '222', `Message ${i}`);
    }

    const res = await request(app).get('/messages?limit=2&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.hasMore).toBe(true);
  });

  it('returns records newest first', async () => {
    insertMessage('111', '222', 'First');
    insertMessage('111', '222', 'Second');

    const res = await request(app).get('/messages');
    expect(res.status).toBe(200);
    expect(res.body.data[0].message).toBe('Second');
    expect(res.body.data[1].message).toBe('First');
  });
});

describe('GET /messages/stats', () => {
  it('returns zeros when no records exist', async () => {
    const res = await request(app).get('/messages/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 0, success: 0, failed: 0 });
  });

  it('returns correct stats with mixed success/failed records', async () => {
    insertMessage('111', '222', 'A', 'success');
    insertMessage('111', '222', 'B', 'success');
    insertMessage('111', '222', 'C', 'failed', 'timeout');

    const res = await request(app).get('/messages/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.success).toBe(2);
    expect(res.body.failed).toBe(1);
  });
});
