import BetterSqlite3 from 'better-sqlite3';

// Use an in-memory SQLite database for isolation
let testDb: BetterSqlite3.Database;

jest.mock('../db/database', () => ({
  getDatabase: () => testDb,
  initDatabase: jest.fn(),
}));

// Import after mocking
import { getMessageLogCount, getMessageLogs, getMessageStats, logMessage } from '../db/messageStore';

const SCHEMA = `
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

describe('logMessage', () => {
  it('inserts a success record into the database', () => {
    logMessage({
      from_number: '15551234567',
      to_number: '15559876543',
      message: 'Hello World',
      type: 'text',
      status: 'success',
    });

    const rows = testDb.prepare('SELECT * FROM message_logs').all() as { status: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('success');
  });

  it('inserts a failed record with error details', () => {
    logMessage({
      from_number: '15551234567',
      to_number: '15559876543',
      message: 'Hello World',
      status: 'failed',
      error: 'API timeout',
    });

    const rows = testDb
      .prepare('SELECT * FROM message_logs')
      .all() as { status: string; error: string | null }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('failed');
    expect(rows[0].error).toBe('API timeout');
  });

  it('defaults type to "text" when not provided', () => {
    logMessage({
      from_number: '15551234567',
      to_number: '15559876543',
      message: 'Hello',
      status: 'success',
    });

    const row = testDb.prepare('SELECT type FROM message_logs').get() as { type: string };
    expect(row.type).toBe('text');
  });
});

describe('getMessageLogs', () => {
  beforeEach(() => {
    // Insert 5 records
    for (let i = 1; i <= 5; i++) {
      logMessage({
        from_number: '15551234567',
        to_number: '15559876543',
        message: `Message ${i}`,
        status: 'success',
      });
    }
  });

  it('returns records newest first', () => {
    const logs = getMessageLogs(5, 0);
    expect(logs).toHaveLength(5);
    // Newest (id=5) should be first
    expect(logs[0].id).toBe(5);
    expect(logs[0].message).toBe('Message 5');
  });

  it('respects limit and offset for pagination', () => {
    const page1 = getMessageLogs(2, 0);
    const page2 = getMessageLogs(2, 2);

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    // Pages should not overlap
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('returns empty array when offset exceeds total records', () => {
    const logs = getMessageLogs(10, 100);
    expect(logs).toHaveLength(0);
  });
});

describe('getMessageLogCount', () => {
  it('returns 0 for an empty table', () => {
    expect(getMessageLogCount()).toBe(0);
  });

  it('returns the correct count after insertions', () => {
    logMessage({ from_number: '111', to_number: '222', message: 'A', status: 'success' });
    logMessage({ from_number: '111', to_number: '222', message: 'B', status: 'failed' });
    expect(getMessageLogCount()).toBe(2);
  });
});

describe('getMessageStats', () => {
  it('returns zeros for an empty table', () => {
    const stats = getMessageStats();
    expect(stats).toEqual({ total: 0, success: 0, failed: 0 });
  });

  it('returns correct totals for mixed success/failed records', () => {
    logMessage({ from_number: '111', to_number: '222', message: 'A', status: 'success' });
    logMessage({ from_number: '111', to_number: '222', message: 'B', status: 'success' });
    logMessage({ from_number: '111', to_number: '222', message: 'C', status: 'failed' });

    const stats = getMessageStats();
    expect(stats.total).toBe(3);
    expect(stats.success).toBe(2);
    expect(stats.failed).toBe(1);
  });
});
